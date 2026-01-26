import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';

@Injectable()
export class OrderGenerationService {
  private readonly logger = new Logger(OrderGenerationService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('order-generation') private orderQueue: Queue,
    private notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async enqueueDailyOrders() {
    this.logger.log('Starting daily order generation enqueue');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        next_delivery_date: { lte: today },
      },
      select: { id: true },
    });

    for (const sub of subscriptions) {
      await this.orderQueue.add(
        'generate-order',
        { subscriptionId: sub.id },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 50,
          removeOnFail: 10,
        },
      );
    }

    this.logger.log(`Enqueued ${subscriptions.length} order generation jobs`);
  }

  async createOrderFromSubscription(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        customerAddress: {
          include: {
            customer: true,
          },
        },
        product: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    // Check vendor availability
    if (!subscription.product?.vendor?.is_active) {
      this.logger.warn(`Vendor is inactive or product/vendor not found, skipping order for subscription ${subscription.id}`);
      await this.notificationService.notifyAdmin(
        'Vendor Inactive',
        `Order skipped for subscription ${subscription.id} due to inactive vendor.`,
      );
      return;
    }

    if (!subscription.product.vendor.is_available_today) {
      // Reschedule to next available day
      await this.rescheduleSubscription(subscription);
      return;
    }

    // Check for existing order to prevent duplicates
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

    if (existingOrder) {
      this.logger.warn(`Order already exists for subscription ${subscription.id} today`);
      return;
    }

    const paymentMode = subscription.payment_mode === 'UPFRONT' ? 'ONLINE' : 'MONTHLY';

    if (!subscription.customerAddress) {
      this.logger.warn(`Subscription ${subscription.id} has no customer address`);
      return;
    }

    // Generate order number
    const counter = await this.prisma.counter.upsert({
      where: { type: 'order' },
      update: { lastNumber: { increment: 1 } },
      create: { type: 'order', lastNumber: 1 },
    });
    const orderNo = 'O' + counter.lastNumber.toString().padStart(6, '0');

    console.debug({
        orderNo,
        customerId: subscription.customerAddress.customerId,
        addressId: subscription.customerAddressId,
        total_amount: subscription.total_price,
        delivery_status: 'PENDING',
        payment_mode: paymentMode as any,
        subscriptionId: subscription.id,
        orderItems: {
          create: {
            productId: subscription.productId!,
            quantity: subscription.quantity,
            price: (subscription as any).price_snapshot,
          },
        },
      })

    const order = await this.prisma.order.create({
      data: {
        orderNo,
        customerId: subscription.customerAddress.customerId,
        addressId: subscription.customerAddressId,
        total_amount: subscription.total_price,
        delivery_status: 'PENDING',
        payment_mode: paymentMode as any,
        subscriptionId: subscription.id,
        orderItems: {
          create: {
            productId: subscription.productId!,
            quantity: subscription.quantity,
            price: (subscription as any).price_snapshot,
          },
        },
      },
    });

    // Update next delivery date
    await this.updateSubscriptionNextDelivery(subscription);

    this.logger.log(`Created order ${order.id} for subscription ${subscription.id}`);
    return order;
  }

  private async rescheduleSubscription(subscription: any) {
    // Calculate next delivery based on frequency
    const nextDelivery = new Date(subscription.next_delivery_date);
    // Simplified: assume daily for now
    nextDelivery.setDate(nextDelivery.getDate() + 1);

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { next_delivery_date: nextDelivery },
    });

    await this.notificationService.notifyAdmin(
      'Order Rescheduled',
      `Subscription ${subscription.id} rescheduled due to vendor unavailability.`,
    );
  }

  private async updateSubscriptionNextDelivery(subscription: any) {
    const nextDelivery = new Date(subscription.next_delivery_date);
    // Simplified: assume daily
    nextDelivery.setDate(nextDelivery.getDate() + 1);

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { next_delivery_date: nextDelivery },
    });
  }
}