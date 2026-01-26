import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { SubscriptionFrequency } from '../../subscription/interfaces/delivery-frequency.interface';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';
import { DeliveryFrequencyService } from '../../subscription/services/delivery-frequency.service';
import { OrderNumberService } from './order-number.service';

/**
 * Type definition for subscription details used in order generation.
 * This type encapsulates all necessary data from a subscription entity
 * required for creating orders, including customer, product, and vendor information.
 * It ensures type safety and clarity when handling subscription data throughout the service.
 * Why: To avoid repetitive Prisma select queries and provide a structured interface for subscription data.
 * How: Populated via Prisma queries with specific select fields to minimize data transfer.
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
  customerAddress: {
    customerId: string;
    customer: { id: string };
  };
  product: {
    vendorId: string;
    vendor: { is_active: boolean; is_available_today: boolean };
  };
};

/**
 * Service responsible for automated order generation from active subscriptions.
 * This service handles the scheduling, queuing, and creation of orders based on subscription frequencies,
 * ensuring reliable and scalable order processing for recurring deliveries.
 * Why: To automate the order creation process for subscriptions, reducing manual intervention and ensuring timely deliveries.
 * How: Uses cron jobs for daily checks, BullMQ for job queuing to handle load, and Prisma for database operations.
 * Scalability: Queuing allows processing in background, preventing blocking of main threads; retries and backoff handle failures.
 * Bugs/Edge Cases: Handles vendor inactivity, duplicate orders, missing addresses; logs and notifies admins for issues.
 */
@Injectable()
export class OrderGenerationService {
  private readonly logger = new Logger(OrderGenerationService.name);

  /**
   * Constructor for OrderGenerationService.
   * Injects necessary dependencies for database access, job queuing, notifications, delivery frequency calculations, and order number generation.
   * Why: Dependency injection ensures loose coupling and testability.
   * How: Uses NestJS DI container to provide instances.
   */
  constructor(
    private prisma: PrismaService,
    @InjectQueue('order-generation') private orderQueue: Queue,
    private notificationService: NotificationService,
    private deliveryFrequencyService: DeliveryFrequencyService,
    private orderNumberService: OrderNumberService,
  ) {}

  /**
   * Cron job that runs every 10 seconds to enqueue daily order generation jobs for active subscriptions.
   * This method identifies subscriptions due for delivery today and adds them to a BullMQ queue for asynchronous processing.
   * Why: Cron scheduling ensures regular checks; queuing prevents overwhelming the system with synchronous processing.
   * How: Queries subscriptions with next_delivery_date <= today, adds jobs to queue with retry configuration.
   * Algorithm:
   * 1. Get current date (start of day).
   * 2. Fetch active subscriptions due.
   * 3. If none, notify admin and return.
   * 4. Enqueue each subscription as a job.
   * 5. Log completion.
   * Scalability: Runs frequently but processes in batches via queue; removeOnComplete/Fail limits queue size.
   * Bugs: If no subscriptions, notifies admin; handles empty results gracefully.
   */
  @Cron(CronExpression.EVERY_10_SECONDS, {
    name: 'order-generator-cron',
    disabled: process.env.SCHEDULER_DISABLE === 'true',
  })
  async enqueueDailyOrders() {
    this.logger.log('Starting daily order generation enqueue');

    // Set today to start of day for date comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch active subscriptions due for delivery today or earlier
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        next_delivery_date: { lte: today },
      },
      select: { id: true },
    });

    // If no subscriptions found, log and notify admin, then return
    if (subscriptions.length === 0) {
      this.logger.log('No subscriptions found for order generation.');
      await this.notificationService.notifyAdmin(
        'No Subscriptions Found',
        'No active subscriptions found for daily order generation.',
      );
      return;
    }

    // Enqueue each subscription for order generation
    for (const sub of subscriptions) {
      await this.orderQueue.add(
        'generate-order',
        { subscriptionId: sub.id },
        {
          attempts: 3, // Retry up to 3 times on failure
          backoff: { type: 'exponential', delay: 5000 }, // Exponential backoff starting at 5 seconds
          removeOnComplete: 50, // Keep last 50 completed jobs
          removeOnFail: 10, // Keep last 10 failed jobs
        },
      );
    }

    this.logger.log(`Enqueued ${subscriptions.length} order generation jobs`);
  }

  /**
   * Creates an order from a given subscription ID.
   * This method fetches subscription details, validates vendor availability, checks for duplicates, and creates a new order with associated order items.
   * Why: To generate orders automatically for subscriptions, ensuring all validations are performed.
   * How: Fetches subscription data, checks conditions, creates order via Prisma, updates subscription's next delivery date.
   * Algorithm:
   * 1. Fetch subscription details.
   * 2. If not found, throw error.
   * 3. Check vendor active status.
   * 4. If vendor unavailable today, reschedule.
   * 5. Check for existing order today.
   * 6. Determine payment mode.
   * 7. Validate address.
   * 8. Generate order number.
   * 9. Create order with items.
   * 10. Update next delivery.
   * 11. Log and return order.
   * Scalability: Database queries are selective; handles one subscription at a time via queue.
   * Bugs: Throws on missing subscription; skips on inactive vendor or existing order; warns on missing address.
   */
  async createOrderFromSubscription(subscriptionId: string) {
    // Fetch detailed subscription information required for order creation
    const subscription = (await this.prisma.subscription.findUnique({
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
        customerAddress: {
          select: {
            customerId: true,
            customer: {
              select: { id: true },
            },
          },
        },
        product: {
          select: {
            vendorId: true,
            vendor: {
              select: { is_active: true, is_available_today: true },
            },
          },
        },
      },
    })) as SubscriptionDetails | null;

    // If subscription not found, throw error to indicate invalid ID
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    // Check if vendor is active; skip order if not
    if (!subscription.product?.vendor?.is_active) {
      this.logger.warn(
        `Vendor is inactive or product/vendor not found, skipping order for subscription ${subscription.id}`,
      );
      await this.notificationService.notifyAdmin(
        'Vendor Inactive',
        `Order skipped for subscription ${subscription.id} due to inactive vendor.`,
      );
      return;
    }

    // If vendor not available today, reschedule subscription to next available day
    if (!subscription.product.vendor.is_available_today) {
      await this.rescheduleSubscription(subscription);
      return;
    }

    // Prevent duplicate orders by checking if an order already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingOrder = await this.prisma.order.findFirst({
      where: {
        subscriptionId: subscription.id,
        created_at: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // If order exists, log warning and skip
    if (existingOrder) {
      this.logger.warn(
        `Order already exists for subscription ${subscription.id} today`,
      );
      return;
    }

    // Map subscription payment mode to order payment mode
    const paymentMode =
      subscription.payment_mode === 'UPFRONT' ? 'ONLINE' : 'MONTHLY';

    // Ensure customer address exists
    if (!subscription.customerAddress) {
      this.logger.warn(
        `Subscription ${subscription.id} has no customer address`,
      );
      return;
    }

    // Generate unique order number
    const orderNo = await this.orderNumberService.generateOrderNumber();

    // Create the order with associated order item
    const order = await this.prisma.order.create({
      data: {
        orderNo,
        customerId: subscription.customerAddress.customerId,
        addressId: subscription.customerAddressId!,
        vendorId: subscription.product.vendorId!,
        total_amount: subscription.total_price,
        delivery_status: 'PENDING',
        payment_mode: paymentMode as any,
        subscriptionId: subscription.id,
        orderItems: {
          create: {
            productId: subscription.productId!,
            quantity: subscription.quantity,
            price: subscription.price_snapshot,
          },
        },
      },
    });

    // Update the subscription's next delivery date after successful order creation
    await this.updateSubscriptionNextDelivery(subscription);

    this.logger.log(
      `Created order ${order.id} for subscription ${subscription.id}`,
    );
    return order;
  }

  /**
   * Private method to update the next delivery date for a subscription.
   * Calculates the next delivery date based on frequency and custom days, updates the database, and optionally notifies admin if rescheduled.
   * Why: To keep subscription delivery dates accurate after order creation or rescheduling.
   * How: Uses DeliveryFrequencyService to compute next date, updates via Prisma.
   * Algorithm:
   * 1. Calculate next delivery date.
   * 2. Update subscription in DB.
   * 3. If notifyRescheduled, send admin notification.
   * Scalability: Lightweight DB update; called per subscription.
   * Bugs: Relies on DeliveryFrequencyService for accurate calculations.
   */
  private async updateNextDelivery(
    subscription: SubscriptionDetails,
    notifyRescheduled: boolean = false,
  ) {
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
      await this.notificationService.notifyAdmin(
        'Order Rescheduled',
        `Subscription ${subscription.id} rescheduled due to vendor unavailability.`,
      );
    }
  }

  /**
   * Private method to reschedule a subscription when vendor is unavailable today.
   * Calls updateNextDelivery with notification flag set to true.
   * Why: To handle vendor unavailability by postponing delivery and alerting admin.
   * How: Delegates to updateNextDelivery.
   * Algorithm: Simply calls updateNextDelivery with notifyRescheduled=true.
   * Scalability: Same as updateNextDelivery.
   */
  private async rescheduleSubscription(subscription: SubscriptionDetails) {
    await this.updateNextDelivery(subscription, true);
  }

  /**
   * Private method to update subscription's next delivery date after successful order creation.
   * Calls updateNextDelivery without notification.
   * Why: To advance the delivery schedule post-order.
   * How: Delegates to updateNextDelivery.
   * Algorithm: Calls updateNextDelivery with notifyRescheduled=false.
   * Scalability: Same as updateNextDelivery.
   */
  private async updateSubscriptionNextDelivery(
    subscription: SubscriptionDetails,
  ) {
    await this.updateNextDelivery(subscription, false);
  }
}
