import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/common/database/prisma.service';
import { WalletService } from 'src/wallet/services/wallet.service';
import { OrderDeliveredEvent } from '../../events/order-delivered.event';
import { OrderStatus, ReferenceType } from '@prisma/client';

/**
 * Event handler for order delivery that triggers wallet deduction.
 * Deducts the order amount from the customer's wallet when an order is delivered.
 */
@EventsHandler(OrderDeliveredEvent)
@Injectable()
export class OnOrderDeliveredWalletHandler implements IEventHandler<OrderDeliveredEvent> {
  private readonly logger = new Logger(OnOrderDeliveredWalletHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Handles order delivery event and deducts payment from customer's wallet.
   *
   * Key features:
   * - Idempotency: Uses unique idempotency key to prevent duplicate deductions
   * - Order type detection: Distinguishes between one-time purchases and subscription orders
   * - Balance validation: Ensures sufficient wallet balance before deduction
   *
   * @param event - The order delivered event containing order ID
   */
  async handle(event: OrderDeliveredEvent): Promise<void> {
    try {
      this.logger.log(
        `Processing wallet deduction for order: ${event.orderId}`,
      );

      // Fetch the order to get customerId, totalAmount, and subscriptionId
      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        select: {
          customerId: true,
          total_amount: true,
          delivery_status: true,
          orderNo: true,
          subscriptionId: true, // Used to detect order type (subscription vs one-time)
        },
      });

      // Verify order exists
      if (!order) {
        this.logger.warn(`Order not found: ${event.orderId}`);
        return;
      }

      // Verify the order delivery status is DELIVERED
      if (order.delivery_status !== OrderStatus.DELIVERED) {
        this.logger.warn(
          `Order ${event.orderId} is not delivered yet. Current status: ${order.delivery_status}`,
        );
        return;
      }

      // Get the order amount
      const amount = parseFloat(order.total_amount.toString());

      // Skip if amount is zero or negative
      if (amount <= 0) {
        this.logger.warn(
          `Order ${event.orderId} has zero or negative amount: ${amount}`,
        );
        return;
      }

      // Determine order type: subscription order (recurring) or one-time purchase
      const isSubscriptionOrder = !!order.subscriptionId;
      const orderTypeDescription = isSubscriptionOrder
        ? 'subscription'
        : 'one-time';

      // Build idempotency key to prevent duplicate wallet deductions
      // Format: order_{orderId}_delivery
      const idempotencyKey = `order_${event.orderId}_delivery`;

      // Build description based on order type
      const description = isSubscriptionOrder
        ? `Subscription order payment for order ${order.orderNo}`
        : `Order delivery payment for order ${order.orderNo}`;

      // Determine reference type based on order type
      const referenceType = isSubscriptionOrder
        ? ReferenceType.SUBSCRIPTION
        : ReferenceType.ORDER;

      this.logger.log(
        `Order type detected: ${orderTypeDescription} purchase (subscriptionId: ${order.subscriptionId || 'none'}). Processing wallet deduction for order ${event.orderId}`,
      );

      // Deduct from customer's wallet with idempotency key
      const result = await this.walletService.deductFromWallet(
        order.customerId,
        amount,
        event.orderId,
        description,
        idempotencyKey,
        referenceType,
      );

      this.logger.log(
        `Successfully deducted ${amount} from customer ${order.customerId} wallet for 
        ${orderTypeDescription} order ${event.orderId}. Transaction ID: ${result.transactionId},
        New balance: ${result.newBalance}`,
      );
    } catch (error) {
      // Handle specific wallet errors gracefully
      if (error.name === 'InsufficientBalanceError') {
        this.logger.error(
          `Insufficient wallet balance for customer order ${event.orderId}: ${error.message}`,
        );
        // Don't re-throw - handle gracefully as per requirements
        return;
      }

      if (error.name === 'WalletNotFoundError') {
        this.logger.error(
          `Wallet not found for order ${event.orderId}: ${error.message}`,
        );
        // Don't re-throw - handle gracefully as per requirements
        return;
      }

      if (error.name === 'DuplicateTransactionError') {
        this.logger.warn(
          `Duplicate transaction detected for order ${event.orderId}: ${error.message}`,
        );
        // Don't re-throw - already processed
        return;
      }

      // Log other unexpected errors but don't throw unhandled exceptions
      this.logger.error(
        `Error processing wallet deduction for order ${event.orderId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
