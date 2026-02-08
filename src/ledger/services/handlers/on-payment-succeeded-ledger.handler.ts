import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '@nestjs/cqrs';
import { LedgerType, PaymentMode } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/common/database/prisma.service';
import { PaymentSucceededEvent } from 'src/payment/services/payment-succeeded.event';

/**
 * Default platform fees when category-specific fees are not found
 */
const DEFAULT_PLATFORM_FEES = {
  product_listing_fee: new Decimal(0.0), // percentage
  platform_fee: new Decimal(0.0), // fixed amount
  transaction_fee: new Decimal(0.0), // fixed amount (online payments only)
  sms_fee: new Decimal(0.0), // fixed amount
  whatsapp_fee: new Decimal(0.0), // fixed amount
};

@EventsHandler(PaymentSucceededEvent)
@Injectable()
export class OnPaymentSucceededLedgerHandler {
  private readonly logger = new Logger(OnPaymentSucceededLedgerHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: PaymentSucceededEvent): Promise<void> {
    // Fetch order with items and related data for ledger creation
    if (!event.orderId) {
      return;
    }
    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        vendor: true,
      },
    });

    if (!order || order?.orderItems.length === 0) {
      return;
    }

    const paymentMode = order.payment_mode;
    const isOnlinePayment = paymentMode === PaymentMode.ONLINE;

    // Create ledger entries for each order item
    for (const orderItem of order.orderItems) {
      const itemAmount = new Decimal(orderItem.price).mul(orderItem.quantity);
      const vendorId = order.vendorId;
      const categoryId = orderItem.product.categoryId;

      // Create SALE entry for vendor earnings
      await this.prisma.ledger.create({
        data: {
          vendorId,
          orderItemId: orderItem.id,
          type: LedgerType.SALE,
          amount: itemAmount,
          paymentMode,
        },
      });

      // Get platform fees for this product category
      const platformFeeRecord = await this.prisma.platformFee.findFirst({
        where: { categoryId },
      });

      const platformFees = platformFeeRecord || DEFAULT_PLATFORM_FEES;

      // Calculate product listing fee (percentage of item amount)
      const productListingFeePercentage = new Decimal(
        platformFees.product_listing_fee.toString(),
      );
      const productListingFee = itemAmount
        .mul(productListingFeePercentage)
        .div(100);

      // Create PLATFORM_FEE entry for product listing fee
      await this.prisma.ledger.create({
        data: {
          vendorId,
          orderItemId: orderItem.id,
          type: LedgerType.PLATFORM_FEE,
          amount: productListingFee,
          paymentMode,
        },
      });

      // Create PLATFORM_FEE entry for fixed platform fee
      await this.prisma.ledger.create({
        data: {
          vendorId,
          orderItemId: orderItem.id,
          type: LedgerType.PLATFORM_FEE,
          amount: new Decimal(platformFees.platform_fee.toString()),
          paymentMode,
        },
      });

      // Add transaction fee only for online payments
      if (isOnlinePayment) {
        await this.prisma.ledger.create({
          data: {
            vendorId,
            orderItemId: orderItem.id,
            type: LedgerType.PLATFORM_FEE,
            amount: new Decimal(platformFees.transaction_fee.toString()),
            paymentMode,
          },
        });
      }

      // Create combined SMS/WhatsApp fee entry
      const smsFee = new Decimal(platformFees.sms_fee.toString());
      const whatsappFee = new Decimal(platformFees.whatsapp_fee.toString());
      const combinedCommsFee = smsFee.add(whatsappFee);

      if (combinedCommsFee.gt(0)) {
        await this.prisma.ledger.create({
          data: {
            vendorId,
            orderItemId: orderItem.id,
            type: LedgerType.PLATFORM_FEE,
            amount: combinedCommsFee,
            paymentMode,
          },
        });
      }
    }

    this.logger.log(
      `Created ${order.orderItems.length} SALE entries and corresponding PLATFORM_FEE entries for order: ${event.orderId}`,
    );
  }
}
