import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { PaymentProviderService } from './payment-provider.service';
import { NotificationService } from '../../notification/services/notification.service';
import {
  PaymentStatus,
  Order,
  SubscriptionStatus,
  PaymentMode,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  InitiatePaymentData,
  PaymentProviderResponse,
} from '../../payment/interfaces/payment.interface';
import {
  OrderConfirmationNotificationPayloadDto,
  OrderConfirmationNotificationType,
} from '../../notification/dto/order-confirmation-notification-payload.dto';

/**
 * Format utility for currency display
 */
const formatCurrency = (
  amount: number | Decimal,
  currency: string = 'INR',
): string => {
  const numAmount = amount instanceof Decimal ? amount.toNumber() : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numAmount);
};

/**
 * Ledger type enum for different transaction types
 */
const LedgerType = {
  SALE: 'SALE' as const,
  PLATFORM_FEE: 'PLATFORM_FEE' as const,
};

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

/**
 * Service for handling payment operations.
 * Manages payment initiation, retrieval, status updates, and refunds.
 * This service is focused on payment gateway communication only.
 * Order creation is handled by the Order module.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private paymentProvider: PaymentProviderService,
    private notificationService: NotificationService,
  ) {}

  async initiatePayment(
    data: InitiatePaymentData,
  ): Promise<PaymentProviderResponse> {
    this.logger.log(
      `Initiating payment for order: ${data.orderId} with amount: ${data.amount} ${data.currency}`,
    );

    try {
      const providerResponse = await this.paymentProvider.initiatePayment({
        amount: data.amount,
        currency: data.currency,
        orderId: data.orderId,
        notes: data.notes || {},
      });

      this.logger.log(
        `Payment initiated successfully with provider: ${providerResponse.providerPaymentId}`,
      );

      return providerResponse;
    } catch (error) {
      this.logger.error(
        `Failed to initiate payment for order ${data.orderId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to initiate payment: ${error.message}`,
      );
    }
  }

  /**
   * Retrieves payment details by ID.
   * @param id - The payment ID
   * @returns The payment details with order relation
   */
  async findOne(id: string) {
    this.logger.log(`Retrieving payment: ${id}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        orders: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Handles webhook updates for payment status from the provider.
   * @param webhookData - The webhook payload from payment provider
   * @param signature - Optional webhook signature for verification
   * @returns Updated payment or status result
   */
  async handleWebhook(webhookData: Record<string, any>, signature?: string) {
    this.logger.log(`Processing webhook for payment`);
    try {
      // Verify webhook with provider
      const verifiedData = await this.paymentProvider.verifyWebhook(
        webhookData,
        signature,
      );

      // Find and update payment status
      const payment = await this.prisma.payment.findFirst({
        where: { provider_payment_id: verifiedData.providerPaymentId },
        include: { orders: true },
      });

      if (!payment) {
        this.logger.warn(
          `Payment not found for provider payment ID: ${verifiedData.providerPaymentId}`,
        );
        throw new NotFoundException('Payment not found for webhook');
      }

      // Route by payment status
      const status = verifiedData.status.toUpperCase();

      switch (status) {
        case 'CAPTURED':
        case 'PAID':
        case 'COMPLETED':
          return this.handleSuccessfulPayment(payment, webhookData);
        case 'FAILED':
          return this.handleFailedPayment(payment, webhookData);
        case 'REFUNDED':
          return this.handleRefundedPayment(payment, webhookData);
        default:
          this.logger.warn(`Unknown payment status: ${status}`);
          return payment;
      }
    } catch (error) {
      this.logger.error(
        `Webhook processing failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Invalid webhook data');
    }
  }

  /**
   * Handles successful payment webhook.
   * Updates payment status, order payment status, subscription status,
   * and creates ledger entries for sales and platform fees.
   * @param payment - The existing payment record
   * @param webhookData - The webhook payload
   * @returns Result object
   */
  private async handleSuccessfulPayment(
    payment: any,
    webhookData: any,
  ): Promise<{ success: boolean; action: string }> {
    this.logger.log(`Processing successful payment: ${payment.id}`);

    try {
      const notes = webhookData.payload?.payment?.entity?.notes;
      const orderId = notes?.orderId;

      // Use Prisma transaction for data integrity
      await this.prisma.$transaction(async (tx) => {
        // Update existing Payment record
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            completed_at: new Date(),
            provider_payload: webhookData,
          },
        });

        // Update Order payment status if linked
        if (orderId) {
          await tx.order.update({
            where: { id: orderId },
            data: { payment_status: 'PAID' },
          });
        }

        // Update Subscription status to ACTIVE
        if (notes?.subscribeID) {
          await tx.subscription.update({
            where: { id: notes.subscribeID },
            data: { status: SubscriptionStatus.ACTIVE },
          });
        }

        // Fetch order with items and related data for ledger creation
        if (orderId) {
          const order = await tx.order.findUnique({
            where: { id: orderId },
            include: {
              orderItems: {
                include: {
                  product: true,
                },
              },
              vendor: true,
            },
          });

          if (order && order.orderItems.length > 0) {
            const paymentMode = order.payment_mode;
            const isOnlinePayment = paymentMode === PaymentMode.ONLINE;

            // Create ledger entries for each order item
            for (const orderItem of order.orderItems) {
              const itemAmount = new Decimal(orderItem.price).mul(
                orderItem.quantity,
              );
              const vendorId = order.vendorId;
              const categoryId = orderItem.product.categoryId;

              // Create SALE entry for vendor earnings
              await tx.ledger.create({
                data: {
                  vendorId,
                  orderItemId: orderItem.id,
                  type: LedgerType.SALE,
                  amount: itemAmount,
                  paymentMode,
                },
              });

              // Get platform fees for this product category
              const platformFeeRecord = await tx.platformFee.findFirst({
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
              await tx.ledger.create({
                data: {
                  vendorId,
                  orderItemId: orderItem.id,
                  type: LedgerType.PLATFORM_FEE,
                  amount: productListingFee,
                  paymentMode,
                },
              });

              // Create PLATFORM_FEE entry for fixed platform fee
              await tx.ledger.create({
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
                await tx.ledger.create({
                  data: {
                    vendorId,
                    orderItemId: orderItem.id,
                    type: LedgerType.PLATFORM_FEE,
                    amount: new Decimal(
                      platformFees.transaction_fee.toString(),
                    ),
                    paymentMode,
                  },
                });
              }

              // Create combined SMS/WhatsApp fee entry
              const smsFee = new Decimal(platformFees.sms_fee.toString());
              const whatsappFee = new Decimal(
                platformFees.whatsapp_fee.toString(),
              );
              const combinedCommsFee = smsFee.add(whatsappFee);

              if (combinedCommsFee.gt(0)) {
                await tx.ledger.create({
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
              `Created ${order.orderItems.length} SALE entries and corresponding PLATFORM_FEE entries for order: ${orderId}`,
            );
          }
        }
      });

      this.logger.log(`Payment success processed: ${payment.id}`);

      // Send notifications after successful payment processing
      // Notifications should not fail the payment flow, so we catch and log errors
      await this.sendOrderConfirmationNotifications(
        payment,
        webhookData,
        orderId,
      );

      return { success: true, action: 'payment_success' };
    } catch (error) {
      this.logger.error(
        `Failed to process successful payment: ${error.message}`,
        error.stack,
      );
      // Log error but don't fail the entire payment processing for ledger issues
      // The core payment and order status updates are more critical
      return { success: true, action: 'payment_success_ledger_error' };
    }
  }

  /**
   * Sends order confirmation notifications to vendor and admin.
   * This method is called after successful payment processing and should not
   * affect the payment flow if notifications fail.
   *
   * @param payment - The payment record
   * @param webhookData - The webhook payload
   * @param orderId - The order ID
   */
  private async sendOrderConfirmationNotifications(
    payment: any,
    webhookData: any,
    orderId: string | undefined,
  ): Promise<void> {
    try {
      // Fetch order details with vendor, customer, and address information
      if (!orderId) {
        this.logger.warn(
          `Cannot send notifications: No order ID found for payment ${payment.id}`,
        );
        return;
      }

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          vendor: true,
          customer: true,
          address: true,
          orderItems: true,
        },
      });

      if (!order) {
        this.logger.warn(`Order not found: ${orderId}`);
        return;
      }

      // Calculate totals for notifications
      const totalAmount =
        webhookData.payload?.payment?.entity?.amount / 100 ||
        payment.amount ||
        0;
      const itemCount = order.orderItems.length;

      // Build delivery address string
      const deliveryAddress = order.address
        ? `${order.address.address || ''} ${order.address.pincode || ''}`.trim()
        : undefined;

      // Create notification payload
      const notificationPayload = new OrderConfirmationNotificationPayloadDto();
      notificationPayload.orderId = orderId;
      notificationPayload.orderNumber = order.orderNo;
      notificationPayload.customerName = order.customer?.name || undefined;
      notificationPayload.customerEmail = order.customer?.email || undefined;
      notificationPayload.itemCount = itemCount;
      notificationPayload.totalAmount = totalAmount;
      notificationPayload.currency = 'INR';
      notificationPayload.formattedAmount = formatCurrency(totalAmount);
      notificationPayload.paymentMode =
        (order.payment_mode as string) || 'ONLINE';
      notificationPayload.estimatedDeliveryTime = undefined;
      notificationPayload.deliveryAddress = deliveryAddress;
      notificationPayload.orderDate =
        order.created_at?.toISOString() || new Date().toISOString();
      notificationPayload.notificationType =
        OrderConfirmationNotificationType.VENDOR_ORDER_CONFIRMATION;
      console.log("process.env.ADMIN_EMAIL", process.env.ADMIN_EMAIL)
      // Get admin email from config
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@waterdelivery.com';
      const vendorEmail = order.vendor?.email || '';

      if (!vendorEmail) {
        this.logger.warn(`Vendor email not found for vendor ${order.vendorId}`);
      }

      // Send notifications
      this.logger.log(
        `Sending order confirmation notifications for order ${orderId} to vendor ${order.vendorId}`,
      );

      const notificationResult =
        await this.notificationService.sendOrderConfirmationNotifications(
          order.vendorId,
          vendorEmail,
          adminEmail,
          notificationPayload,
        );

      this.logger.log(
        `Order confirmation notifications completed for order ${orderId}: ` +
          `vendorEmail=${notificationResult.vendorEmailSent}, ` +
          `vendorPush=${notificationResult.vendorPushSent}, ` +
          `adminEmail=${notificationResult.adminEmailSent}`,
      );

      // Log any notification errors (but don't fail the payment)
      if (notificationResult.errors.length > 0) {
        this.logger.warn(
          `Notification errors for order ${orderId}: ${notificationResult.errors.join('; ')}`,
        );
      }
    } catch (error) {
      // Log error but don't fail payment processing
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send order confirmation notifications for order ${orderId}: ${errorMessage}`,
      );
      // Notifications should not fail the payment flow
    }
  }

  /**
   * Handles failed payment webhook.
   * Updates payment status and order payment status.
   * @param payment - The existing payment record
   * @param webhookData - The webhook payload
   * @returns Result object
   */
  private async handleFailedPayment(
    payment: any,
    webhookData: any,
  ): Promise<{ success: boolean; action: string }> {
    this.logger.log(`Processing failed payment: ${payment.id}`);

    try {
      const notes = webhookData.payload?.payment?.entity?.notes;
      // Update existing Payment record
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          provider_payload: webhookData,
        },
      });

      // Update Order payment status
      if (notes.orderId) {
        await this.prisma.order.update({
          where: { id: notes.orderId },
          data: { payment_status: 'FAILED' },
        });
      }

      this.logger.log(`Payment failure processed: ${payment.id}`);
      return { success: true, action: 'payment_failed' };
    } catch (error) {
      this.logger.error(
        `Failed to process failed payment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handles refunded payment webhook.
   * Updates payment status, order payment status, and subscription status.
   * @param payment - The existing payment record
   * @param webhookData - The webhook payload
   * @returns Result object
   */
  private async handleRefundedPayment(
    payment: any,
    webhookData: any,
  ): Promise<{ success: boolean; action: string }> {
    this.logger.log(`Processing refunded payment: ${payment.id}`);

    try {
      // Update existing Payment record
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
          provider_payload: webhookData,
        },
      });

      // Update Order payment status
      const refundedOrderId = payment.orders?.[0]?.id;
      if (refundedOrderId) {
        await this.prisma.order.update({
          where: { id: refundedOrderId },
          data: { payment_status: 'REFUNDED' },
        });
      }

      // Update Subscription to INACTIVE
      await this.updateSubscriptionStatus(
        webhookData.payload?.payment?.entity?.notes?.subscribeID,
        SubscriptionStatus.INACTIVE,
      );

      this.logger.log(`Payment refund processed: ${payment.id}`);
      return { success: true, action: 'payment_refunded' };
    } catch (error) {
      this.logger.error(
        `Failed to process refunded payment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Updates subscription status if subscription ID is available.
   * @param subscriptionId - The subscription ID from order or metadata
   * @param status - The new status
   */
  private async updateSubscriptionStatus(
    subscriptionId: string | null | undefined,
    status: SubscriptionStatus,
  ): Promise<void> {
    if (subscriptionId) {
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status },
      });
      this.logger.log(`Subscription ${subscriptionId} updated to ${status}`);
    }
  }

  /**
   * Initiates a refund for a payment.
   * @param paymentId - The payment ID to refund
   * @param amount - The refund amount
   * @param reason - The reason for refund
   * @returns The refund result
   */
  async initiateRefund(paymentId: string, amount: number, reason: string) {
    this.logger.log(`Initiating refund for payment: ${paymentId}`);

    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { orders: true },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.PAID) {
        throw new BadRequestException('Can only refund completed payments');
      }

      if (!payment.provider_payment_id) {
        throw new BadRequestException('Payment provider ID not found');
      }

      // Initiate refund with provider
      const refundResult = await this.paymentProvider.initiateRefund({
        paymentId: payment.provider_payment_id,
        amount,
        reason,
      });

      // Update payment status to REFUNDED
      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          provider_payload: {
            ...((payment.provider_payload as any) || {}),
            refund: refundResult as any,
          },
        },
        include: {
          orders: true,
        },
      });

      // Update order payment status
      const refundOrderId = payment.orders?.[0]?.id;
      if (refundOrderId) {
        await this.prisma.order.update({
          where: { id: refundOrderId },
          data: { payment_status: 'REFUNDED' },
        });
      }

      this.logger.log(`Refund initiated successfully: ${paymentId}`);
      return updatedPayment;
    } catch (error) {
      this.logger.error(
        `Failed to initiate refund: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to initiate refund');
    }
  }
}
