import { PaymentSucceededEvent } from 'src/payment/services/payment-succeeded.event';
import { EventsHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { OrderNotificationOrchestrator } from '../orchestrators/order-notification.orchestrator';

/**
 * OnPaymentSucceededNotificationHandler handles notification sending when payment succeeds
 * 
 * This handler listens to PaymentSucceededEvent and coordinates sending notifications
 * for successful order payments using the OrderNotificationOrchestrator.
 * 
 * Refactored to use the new orchestrator-based architecture:
 * - Simplified logic (orchestrator handles all complexity)
 * - Better error handling
 * - Cleaner separation of concerns
 * - No manual payload building
 */
@EventsHandler(PaymentSucceededEvent)
export class OnPaymentSucceededNotificationHandler {
  private readonly logger = new Logger(
    OnPaymentSucceededNotificationHandler.name,
  );

  constructor(
    private readonly orderOrchestrator: OrderNotificationOrchestrator,
  ) { }

  async handle(event: PaymentSucceededEvent) {
    try {
      // Only send notifications for order payments
      if (!event.orderId) {
        this.logger.debug(
          `Skipping order notifications: No order ID found for payment ${event.payment.id}`,
        );
        return;
      }

      this.logger.log(
        `Sending order confirmation notifications for order ${event.orderId}`,
      );

      // Use orchestrator to send all notifications (customer, vendor, admin)
      const result = await this.orderOrchestrator.sendOrderCreationNotifications(
        event.orderId,
      );

      // Log results
      this.logger.log(
        `Order confirmation notifications completed for order ${event.orderId}: ` +
        `customer=${result.customerEmailSent}, ` +
        `vendor=${result.vendorEmailSent}, ` +
        `vendorPush=${result.vendorPushSent}, ` +
        `admin=${result.adminEmailSent}`,
      );

      // Log any errors (but don't fail the payment flow)
      if (result.errors.length > 0) {
        this.logger.warn(
          `Notification errors for order ${event.orderId}: ${result.errors.join('; ')}`,
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
