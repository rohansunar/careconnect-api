import { PaymentSucceededEvent } from 'src/payment/services/payment-succeeded.event';
import { NotificationService } from '../notification.service';
import { EventsHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import {
  OrderConfirmationNotificationPayloadDto,
  OrderConfirmationNotificationType,
} from '../../dto/order-confirmation-notification-payload.dto';
import { Decimal } from '@prisma/client/runtime/library';
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

@EventsHandler(PaymentSucceededEvent)
export class OnPaymentSucceededNotificationHandler {
  private readonly logger = new Logger(
    OnPaymentSucceededNotificationHandler.name,
  );
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async handle(event: PaymentSucceededEvent) {
    try {
      // Fetch order details with vendor, customer, and address information
      if (!event.orderId) {
        this.logger.warn(
          `Cannot send notifications: No order ID found for payment ${event.payment.id}`,
        );
        return;
      }

      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        include: {
          vendor: true,
          customer: true,
          address: true,
          orderItems: true,
        },
      });

      if (!order) {
        this.logger.warn(`Order not found: ${event.orderId}`);
        return;
      }

      // Calculate totals for notifications
      const totalAmount =
        event.webhook.payload?.payment?.entity?.amount / 100 ||
        event.payment.amount ||
        0;
      const itemCount = order.orderItems.length;

      // Build delivery address string
      const deliveryAddress = order.address
        ? `${order.address.address || ''} ${order.address.pincode || ''}`.trim()
        : undefined;

      // Create notification payload
      const notificationPayload = new OrderConfirmationNotificationPayloadDto();
      notificationPayload.orderId = event.orderId;
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

      // Get admin email from config
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@waterdelivery.com';
      const vendorEmail = order.vendor?.email || '';

      if (!vendorEmail) {
        this.logger.warn(`Vendor email not found for vendor ${order.vendorId}`);
      }

      // Send notifications
      this.logger.log(
        `Sending order confirmation notifications for order ${event.orderId} to vendor ${order.vendorId}`,
      );

      const notificationResult =
        await this.notificationService.sendOrderConfirmationNotifications(
          order.vendorId,
          vendorEmail,
          adminEmail,
          notificationPayload,
        );

      this.logger.log(
        `Order confirmation notifications completed for order ${event.orderId}: ` +
          `vendorEmail=${notificationResult.vendorEmailSent}, ` +
          `vendorPush=${notificationResult.vendorPushSent}, ` +
          `adminEmail=${notificationResult.adminEmailSent}`,
      );

      // Log any notification errors (but don't fail the payment)
      if (notificationResult.errors.length > 0) {
        this.logger.warn(
          `Notification errors for order ${event.orderId}: ${notificationResult.errors.join('; ')}`,
        );
      }
    } catch (error) {
      // Log error but don't fail payment processing
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send order confirmation notifications for order ${event.orderId}: ${errorMessage}`,
      );
      // Notifications should not fail the payment flow
    }
  }
}

// Add idempotency to webhook handling
// Show exact Jest test files
// Design retry-safe notification flow
// Add idempotency guards (very important for webhooks)
// Wrap handlers with retry + dead letter queue
// Refactor your exact Prisma schema relations
// Write real Jest tests for each handler
