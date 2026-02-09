import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '@nestjs/cqrs';
import { PaymentMode, PlatformFeeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/common/database/prisma.service';
import { PaymentSucceededEvent } from 'src/payment/services/payment-succeeded.event';
import { LedgerFactory } from './ledger.factory';

@EventsHandler(PaymentSucceededEvent)
@Injectable()
export class OnPaymentSucceededLedgerHandler {
  private readonly logger = new Logger(OnPaymentSucceededLedgerHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: PaymentSucceededEvent): Promise<void> {
    if (!event.orderId) return;

    await this.prisma.$transaction(async (tx) => {
      const ledgerFactory = new LedgerFactory(tx);
      const order = await tx.order.findUnique({
        where: { id: event.orderId },
        include: {
          orderItems: {
            include: { product: true },
          },
        },
      });

      if (!order || order.orderItems.length === 0) return;

      const isOnline = order.payment_mode === PaymentMode.ONLINE;

      for (const item of order.orderItems) {
        try {
          const itemAmount = new Decimal(item.price).mul(item.quantity);

          let fees = (await tx.platformFee.findFirst({
            where: { categoryId: item.product.categoryId },
          })) ?? {
            product_listing_fee: new Decimal(0),
            transaction_fee: new Decimal(0),
            sms_fee: new Decimal(0),
            whatsapp_fee: new Decimal(0),
            gst: new Decimal(0),
          };

          // SALE (positive)
          await ledgerFactory.createSaleEntry({
            vendorId: order.vendorId,
            orderItemId: item.id,
            amount: itemAmount,
            paymentMode: order.payment_mode,
          });

          // LISTING FEE (%)
          const listingFee = itemAmount.mul(fees.product_listing_fee).div(100);

          await ledgerFactory.createPlatformFeeEntry({
            vendorId: order.vendorId,
            orderItemId: item.id,
            feeType: PlatformFeeType.LISTING_FEE,
            amount: listingFee,
            paymentMode: order.payment_mode,
          });

          // 3️⃣ PAYMENT GATEWAY FEE (% of sale)
          let paymentGatewayFee = new Decimal(0);
          // PAYMENT GATEWAY (online only)
          if (isOnline) {
            paymentGatewayFee = itemAmount.mul(fees.transaction_fee).div(100);
            await ledgerFactory.createPlatformFeeEntry({
              vendorId: order.vendorId,
              orderItemId: item.id,
              feeType: PlatformFeeType.PAYMENT_GATEWAY_FEE,
              amount: paymentGatewayFee,
              paymentMode: order.payment_mode,
            });
          }

          // WHATSAPP
          await ledgerFactory.createPlatformFeeEntry({
            vendorId: order.vendorId,
            orderItemId: item.id,
            feeType: PlatformFeeType.WHATSAPP_FEE,
            amount: fees.whatsapp_fee,
            paymentMode: order.payment_mode,
          });

          // SMS
          await ledgerFactory.createPlatformFeeEntry({
            vendorId: order.vendorId,
            orderItemId: item.id,
            feeType: PlatformFeeType.SMS_FEE,
            amount: fees.sms_fee,
            paymentMode: order.payment_mode,
          });

          // 4️⃣ GST (% of payment gateway fee)
          if (isOnline && paymentGatewayFee.gt(0)) {
            const gstAmount = paymentGatewayFee.mul(fees.gst).div(100);

            await ledgerFactory.createPlatformFeeEntry({
              vendorId: order.vendorId,
              orderItemId: item.id,
              feeType: PlatformFeeType.GST,
              amount: gstAmount,
              paymentMode: order.payment_mode,
            });
          }
        } catch (error) {
          this.logger.error(
            `Ledger failed for orderItem ${item.id}`,
            error.stack,
          );
          // item-level failure does NOT break whole order
        }
      }
    });

    this.logger.log(`Ledger entries finalized for order ${event.orderId}`);
  }
}
