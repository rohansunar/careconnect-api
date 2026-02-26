import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionFrequency } from '../../subscription/interfaces/delivery-frequency.interface';
import { PrismaService } from '../../common/database/prisma.service';
import { OrderNotificationOrchestrator } from '../../notification/services/orchestrators/order-notification.orchestrator';
import { SubscriptionNotificationOrchestrator } from '../../notification/services/orchestrators/subscription-notification.orchestrator';
import { DeliveryFrequencyService } from '../../subscription/services/delivery-frequency.service';
import { OrderNumberService } from './order-number.service';
import { DateTime } from 'luxon';
import { ORDER_GENERATION } from 'src/queue/queue.constants';
import { SubscriptionStatus } from '@prisma/client';

/**
 * Error codes for order generation service.
 * Provides consistent error identification for debugging and monitoring.
 */
export enum OrderGenerationErrorCode {
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  VENDOR_INACTIVE = 'VENDOR_INACTIVE',
  PRODUCT_INACTIVE = 'PRODUCT_INACTIVE',
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
  MISSING_CUSTOMER_ADDRESS = 'MISSING_CUSTOMER_ADDRESS',
  ORDER_CREATION_FAILED = 'ORDER_CREATION_FAILED',
  SUBSCRIPTION_UPDATE_FAILED = 'SUBSCRIPTION_UPDATE_FAILED',
  EMAIL_NOTIFICATION_FAILED = 'EMAIL_NOTIFICATION_FAILED',
  PUSH_NOTIFICATION_FAILED = 'PUSH_NOTIFICATION_FAILED',
  VENDOR_PUSH_FAILED = 'VENDOR_PUSH_FAILED',
  CUSTOMER_PUSH_FAILED = 'CUSTOMER_PUSH_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INSUFFICIENT_WALLET_BALANCE = 'INSUFFICIENT_WALLET_BALANCE',
  SUBSCRIPTION_SUSPENSION_FAILED = 'SUBSCRIPTION_SUSPENSION_FAILED',
}

/**
 * Custom error class for order generation errors with error codes.
 * Allows for consistent error handling and better debugging.
 */
export class OrderGenerationError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: OrderGenerationErrorCode,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'OrderGenerationError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Type definition for subscription details used in order generation.
 * Encapsulates data from subscription entity required for creating orders.
 * Includes paymentId to link the payment record from subscription to the order.
 */
type SubscriptionDetails = {
  id: string;
  next_delivery_date: Date;
  frequency: SubscriptionFrequency;
  custom_days: number[];
  payment_mode: string;
  total_price: number;
  quantity: number;
  productId: string;
  customerAddressId: string;
  price_snapshot: number;
  payment: { status: string };
  paymentId: string | null;
  customerAddress: {
    customerId: string;
    address: string | null;
    pincode: string | null;
    label: string | null;
    location: { name: string | null; state: string | null } | null;
    customer: {
      id: string;
      name: string | null;
      phone: string | null;
      email: string | null;
    };
  };
  product: {
    id: string;
    name: string;
    vendorId: string;
    is_active: boolean;
    vendor: {
      id: string;
      name: string;
      is_active: boolean;
      is_available_today: boolean;
    };
  };
};

/**
 * Result type for order creation operations.
 * Provides clear indication of outcome for better error handling.
 */
type OrderCreationResult =
  | { success: true; orderId: string; skipped: false }
  | { success: false; reason: string; skipped: true };

/**
 * Configuration interface for order generation settings.
 * Centralizes configuration to improve testability.
 */
interface OrderGenerationConfig {
  adminEmail: string;
  schedulerDisabled: boolean;
  timezone: string;
}

/**
 * Service responsible for automated order generation from active subscriptions.
 * Handles scheduling, queuing, and creation of orders based on subscription frequencies.
 *
 * This service follows SOLID principles:
 * - Single Responsibility: Focused solely on order generation logic
 * - Open/Closed: Extensible through configuration and result types
 * - Liskov Substitution: Not applicable (no inheritance)
 * - Interface Segregation: Uses focused interfaces for dependencies
 * - Dependency Inversion: Depends on abstractions (interfaces) where possible
 */
@Injectable()
export class OrderGenerationService {
  private readonly logger = new Logger(OrderGenerationService.name);
  /**
   * Gets the configuration for order generation from environment variables.
   * Centralized configuration access for better testability.
   */
  private get config(): OrderGenerationConfig {
    return {
      adminEmail: process.env.ADMIN_EMAIL || 'admin@waterdelivery.com',
      schedulerDisabled: process.env.SCHEDULER_DISABLE === 'true',
      timezone: process.env.TIMEZONE || 'Asia/Kolkata',
    };
  }

  /**
   * Constructor for OrderGenerationService.
   */
  constructor(
    private prisma: PrismaService,
    @InjectQueue(ORDER_GENERATION) private orderQueue: Queue,
    private orderNotificationOrchestrator: OrderNotificationOrchestrator,
    private subscriptionNotificationOrchestrator: SubscriptionNotificationOrchestrator,
    private deliveryFrequencyService: DeliveryFrequencyService,
    private orderNumberService: OrderNumberService,
  ) {}

  /**
   * Cron job that runs every EVERY_DAY_AT_9AM to enqueue daily order generation jobs.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    disabled: process.env.SCHEDULER_DISABLE === 'true',
  })
  async enqueueDailyOrders(): Promise<void> {
    this.logger.log('Starting daily order generation enqueue');

    try {
      // Set today to start of day for date comparison
      const today = this.getStartOfDay(
        DateTime.now().setZone(this.config.timezone),
      );

      // Fetch active subscriptions due for delivery today or earlier
      const subscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          next_delivery_date: { lte: today.toJSDate() },
        },
        select: { id: true },
      });

      // If no subscriptions found, log and notify admin, then return
      if (subscriptions.length === 0) {
        this.logger.log('No subscriptions found for order generation.');
        // await this.sendNoSubscriptionsNotification();
        return;
      }

      // Enqueue each subscription for order generation
      await this.enqueueSubscriptions(subscriptions.map((s) => s.id));

      this.logger.log(`Enqueued ${subscriptions.length} order generation jobs`);
    } catch (error) {
      // Log error but don't throw - cron jobs should be resilient
      this.logger.error(
        `Failed to enqueue daily orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Gets the start of day (midnight) for a given date.
   * @param date - The date to get start of day for
   * @returns Date set to midnight
   */
  private getStartOfDay(date: DateTime): DateTime {
    return date.setZone(this.config.timezone).startOf('day');
  }

  /**
   * Gets the end of day (start of next day) for a given date.
   * @param date - The date to get end of day for
   * @returns Date set to start of next day
   */
  private getEndOfDay(date: DateTime): DateTime {
    return date.setZone(this.config.timezone).endOf('day');
  }

  /**
   * Enqueues subscription IDs for order generation.
   * @param subscriptionIds - Array of subscription IDs to enqueue
   */
  private async enqueueSubscriptions(subscriptionIds: string[]): Promise<void> {
    const enqueuePromises = subscriptionIds.map((subscriptionId) =>
      this.orderQueue.add(
        'generate-order',
        { subscriptionId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 50,
          removeOnFail: 10,
        },
      ),
    );

    await Promise.all(enqueuePromises);
  }

  /**
   * Creates an order from a given subscription ID.
   * Validates customer/address/vendor/product availability, checks for duplicates, creates order.
   *
   * @param subscriptionId - The ID of the subscription to create an order from
   * @returns OrderCreationResult indicating success or skip with reason
   * @throws BadRequestException for invalid subscription ID
   * @throws NotFoundException if subscription not found
   * @throws InternalServerErrorException for database or processing errors
   */
  async createOrderFromSubscription(
    subscriptionId: string,
  ): Promise<OrderCreationResult> {
    try {
      // Fetch detailed subscription information required for order creation
      const subscription = await this.fetchSubscription(subscriptionId);

      // If subscription not found, throw NotFoundException
      if (!subscription) {
        throw new NotFoundException({
          message: `Subscription with ID ${subscriptionId} not found`,
          code: OrderGenerationErrorCode.SUBSCRIPTION_NOT_FOUND,
        });
      }

      // Check if vendor is active; skip order if not
      const vendorInactive = !subscription.product?.vendor?.is_active;
      if (vendorInactive) {
        this.logger.warn(
          `Vendor is inactive or product/vendor not found, skipping order for subscription ${subscription.id}`,
        );
        await this.orderNotificationOrchestrator.sendAdminVendorInactiveNotification(
          subscription.id,
        );
        return { success: false, reason: 'Vendor inactive', skipped: true };
      }

      // Check if product is active; skip order if not
      const productInactive = !subscription.product?.is_active;
      if (productInactive) {
        this.logger.warn(
          `Product is inactive, skipping order for subscription ${subscription.id}`,
        );
        await this.orderNotificationOrchestrator.sendAdminProductInactiveNotification(
          subscription.id,
        );
        return { success: false, reason: 'Product inactive', skipped: true };
      }

      // Handle vendor unavailability - create order but notify admin
      const vendorUnavailable = !subscription.product.vendor.is_available_today;
      if (vendorUnavailable) {
        await this.orderNotificationOrchestrator.sendAdminVendorUnavailableNotification(
          { id: subscription.id },
          {
            name: subscription.product.name,
            vendor: subscription.product.vendor,
          },
          {
            id: subscription.customerAddress.customer.id,
            name: subscription.customerAddress.customer.name,
            phone: subscription.customerAddress.customer.phone,
          },
          subscription.total_price,
          subscription.price_snapshot,
          subscription.quantity,
        );
        await this.updateNextDelivery(subscription, true);
        return {
          success: false,
          reason: 'Vendor inactive for Today',
          skipped: true,
        };
      }

      // Check for duplicate orders
      const existingOrder = await this.findExistingOrder(subscription.id);
      if (existingOrder) {
        this.logger.warn(
          `Order already exists for subscription ${subscription.id} today`,
        );
        return { success: false, reason: 'Duplicate order', skipped: true };
      }

      // Validate wallet balance before order creation
      const walletValidation = await this.validateWalletBalance(
        subscription.customerAddress.customerId,
        subscription.price_snapshot,
      );

      if (!walletValidation.hasSufficientBalance) {
        this.logger.warn(
          `Insufficient wallet balance for customer ${subscription.customerAddress.customerId}. ` +
            `Required: ${subscription.price_snapshot}, Available: ${walletValidation.currentBalance}`,
        );

        // Suspend the subscription due to insufficient wallet balance
        await this.suspendSubscription(subscription.id);

        // Send notifications about subscription suspension
        await this.sendInsufficientBalanceNotifications(
          subscription,
          walletValidation.currentBalance,
          subscription.price_snapshot,
        );

        return {
          success: false,
          reason: 'Insufficient wallet balance - subscription suspended',
          skipped: true,
        };
      }

      // Create the order
      const order = await this.createOrder(subscription);

      // Update the subscription's next delivery date after successful order creation
      await this.updateNextDelivery(subscription);

      // Reuse the shared order notification pipeline so email/push logic stays DRY
      await this.orderNotificationOrchestrator.sendOrderCreationNotifications(
        order.id,
      );

      this.logger.log(
        `Created order ${order.id} for subscription ${subscription.id}`,
      );

      return { success: true, orderId: order.id, skipped: false };
    } catch (error) {
      // Handle known exceptions - rethrow as-is
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Log and transform unknown errors
      this.logger.error(
        `Error creating order from subscription ${subscriptionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Send error notification to admin
      await this.orderNotificationOrchestrator.sendAdminOrderGenerationErrorNotification(
        subscriptionId,
        error instanceof Error ? error.message : 'Unknown error',
      );

      // Throw as internal server error with user-friendly message
      throw new InternalServerErrorException({
        message:
          'Failed to create order from subscription. Please try again later.',
        code: OrderGenerationErrorCode.ORDER_CREATION_FAILED,
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }

  /**
   * Fetches subscription details from database.
   * @param subscriptionId - The subscription ID to fetch
   * @returns Subscription details or null if not found
   * @throws InternalServerErrorException if database query fails
   */
  private async fetchSubscription(
    subscriptionId: string,
  ): Promise<SubscriptionDetails | null> {
    try {
      return (await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        select: {
          id: true,
          next_delivery_date: true,
          frequency: true,
          custom_days: true,
          payment_mode: true,
          total_price: true,
          quantity: true,
          productId: true,
          customerAddressId: true,
          price_snapshot: true,
          paymentId: true,
          payment: { select: { status: true } },
          customerAddress: {
            select: {
              customerId: true,
              address: true,
              pincode: true,
              label: true,
              location: {
                select: { name: true, state: true },
              },
              customer: {
                select: { id: true, name: true, phone: true, email: true },
              },
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              vendorId: true,
              is_active: true,
              vendor: {
                select: {
                  id: true,
                  name: true,
                  is_active: true,
                  is_available_today: true,
                },
              },
            },
          },
        },
      })) as SubscriptionDetails | null;
    } catch (error) {
      this.logger.error(
        `Database error fetching subscription ${subscriptionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException({
        message: 'Failed to fetch subscription details',
        code: OrderGenerationErrorCode.DATABASE_ERROR,
      });
    }
  }

  /**
   * Finds existing order for subscription on current day.
   * @param subscriptionId - The subscription ID to check
   * @returns Existing order if found, null otherwise
   */
  private async findExistingOrder(subscriptionId: string): Promise<{
    id: string;
  } | null> {
    const today = this.getStartOfDay(
      DateTime.now().setZone(this.config.timezone),
    );
    const tomorrow = this.getEndOfDay(today);

    try {
      return await this.prisma.order.findFirst({
        where: {
          subscriptionId,
          created_at: {
            gte: today.toJSDate(),
            lt: tomorrow.toJSDate(),
          },
        },
        select: { id: true },
      });
    } catch (error) {
      this.logger.error(
        `Database error checking duplicate order for subscription ${subscriptionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Return null to allow order creation - duplicate check failure shouldn't block
      return null;
    }
  }

  /**
   * Creates an order from subscription details.
   * @param subscription - The subscription details
   * @returns Created order
   * @throws InternalServerErrorException if order creation fails
   */
  private async createOrder(subscription: SubscriptionDetails): Promise<{
    id: string;
    orderNo: string;
  }> {
    // Map subscription payment mode to order payment mode
    const paymentMode =
      subscription.payment_mode === 'UPFRONT' ? 'ONLINE' : 'MONTHLY';

    try {
      return await this.prisma.order.create({
        data: {
          orderNo: await this.orderNumberService.generateOrderNumber(),
          customerId: subscription.customerAddress.customerId,
          addressId: subscription.customerAddressId,
          vendorId: subscription.product.vendorId,
          total_amount: subscription.total_price,
          delivery_status: 'PENDING',
          payment_mode: paymentMode as never,
          subscriptionId: subscription.id,
          paymentId: subscription.paymentId || undefined,
          payment_status: subscription.payment.status || 'PENDING',
          orderItems: {
            create: {
              productId: subscription.productId,
              quantity: subscription.quantity,
              price: subscription.price_snapshot,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create order for subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException({
        message: 'Failed to create order',
        code: OrderGenerationErrorCode.ORDER_CREATION_FAILED,
      });
    }
  }

  /**
   * Updates the next delivery date for a subscription based on frequency.
   * @param subscription - The subscription to update
   * @param notifyRescheduled - Whether to notify admin about rescheduling
   */
  private async updateNextDelivery(
    subscription: SubscriptionDetails,
    notifyRescheduled: boolean = false,
  ): Promise<void> {
    try {
      // Calculate next delivery date using frequency service
      const nextDelivery = this.deliveryFrequencyService.getNextDeliveryDate(
        subscription.next_delivery_date,
        subscription.frequency,
        subscription.custom_days,
      );

      // Update subscription with new next delivery date
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { next_delivery_date: nextDelivery },
      });

      // If rescheduled due to unavailability, notify admin
      if (notifyRescheduled) {
        await this.orderNotificationOrchestrator.sendAdminRescheduledNotification(
          subscription.id,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update next delivery for subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException({
        message: 'Failed to update subscription next delivery date',
        code: OrderGenerationErrorCode.SUBSCRIPTION_UPDATE_FAILED,
      });
    }
  }

  /**
   * Validates customer wallet balance against required amount.
   * @param customerId - The customer ID to check wallet for
   * @param requiredAmount - The required amount for the order
   * @returns Object with balance status and current balance
   */
  private async validateWalletBalance(
    customerId: string,
    requiredAmount: number,
  ): Promise<{ hasSufficientBalance: boolean; currentBalance: number }> {
    try {
      const wallet = await this.prisma.customerWallet.findUnique({
        where: { customerId },
        select: { balance: true },
      });

      // If no wallet found, treat as zero balance
      const currentBalance = wallet ? Number(wallet.balance) : 0;

      return {
        hasSufficientBalance: currentBalance >= requiredAmount,
        currentBalance,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching wallet for customer ${customerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Return insufficient balance on error to be safe
      return { hasSufficientBalance: false, currentBalance: 0 };
    }
  }

  /**
   * Suspends a subscription due to insufficient wallet balance.
   * @param subscriptionId - The subscription ID to suspend
   */
  private async suspendSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: SubscriptionStatus.SUSPENDED },
      });

      this.logger.log(
        `Subscription ${subscriptionId} suspended due to insufficient wallet balance`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to suspend subscription ${subscriptionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException({
        message: 'Failed to suspend subscription',
        code: OrderGenerationErrorCode.SUBSCRIPTION_SUSPENSION_FAILED,
      });
    }
  }

  /**
   * Sends notifications about insufficient wallet balance to admin and customer.
   * @param subscription - The subscription details
   * @param currentBalance - Current wallet balance
   * @param requiredAmount - Required amount for the order
   */
  private async sendInsufficientBalanceNotifications(
    subscription: SubscriptionDetails,
    currentBalance: number,
    requiredAmount: number,
  ): Promise<void> {
    // Send notification to admin using the subscription notification orchestrator
    try {
      await this.subscriptionNotificationOrchestrator.sendAdminSuspensionNotification(
        subscription.id,
        subscription.customerAddress.customerId,
        subscription.customerAddress.customer.name,
        subscription.customerAddress.customer.email,
        subscription.customerAddress.customer.phone,
        subscription.product.name,
        requiredAmount,
        currentBalance,
      );

      this.logger.log(
        `Admin notification sent for insufficient balance on subscription ${subscription.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send admin notification for subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Send email to customer using the subscription notification system
    try {
      await this.subscriptionNotificationOrchestrator.sendSubscriptionSuspensionNotification(
        subscription.id,
        currentBalance,
        requiredAmount,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send customer notification for subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
