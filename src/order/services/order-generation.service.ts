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
import { PrismaService } from '../../common/database/prisma.service';
import { OrderNotificationOrchestrator } from '../../notification/services/orchestrators/order-notification.orchestrator';
import { SubscriptionNotificationOrchestrator } from '../../notification/services/orchestrators/subscription-notification.orchestrator';
import { OrderNumberService } from './order-number.service';
import { DateTime } from 'luxon';
import { ORDER_GENERATION } from 'src/queue/queue.constants';
import { SubscriptionStatus } from '@prisma/client';

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

type SubscriptionFrequency = string;

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

type OrderCreationResult =
  | { success: true; orderId: string; skipped: false }
  | { success: false; reason: string; skipped: true };

interface OrderGenerationConfig {
  adminEmail: string;
  schedulerDisabled: boolean;
  timezone: string;
}

@Injectable()
export class OrderGenerationService {
  private readonly logger = new Logger(OrderGenerationService.name);

  private get config(): OrderGenerationConfig {
    return {
      adminEmail: process.env.ADMIN_EMAIL || 'support@droptro.com',
      schedulerDisabled: process.env.SCHEDULER_DISABLE === 'true',
      timezone: process.env.TIMEZONE || 'Asia/Kolkata',
    };
  }

  constructor(
    private prisma: PrismaService,
    @InjectQueue(ORDER_GENERATION) private orderQueue: Queue,
    private orderNotificationOrchestrator: OrderNotificationOrchestrator,
    private subscriptionNotificationOrchestrator: SubscriptionNotificationOrchestrator,
    private orderNumberService: OrderNumberService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    disabled: process.env.SCHEDULER_DISABLE === 'true',
  })
  async enqueueDailyOrders(): Promise<void> {
    this.logger.log('Starting daily order generation enqueue');

    try {
      const today = this.getStartOfDay(
        DateTime.now().setZone(this.config.timezone),
      );

      const subscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          next_delivery_date: { lte: today.toJSDate() },
        },
        select: { id: true },
      });

      if (subscriptions.length === 0) {
        this.logger.log('No subscriptions found for order generation.');
        return;
      }

      await this.enqueueSubscriptions(subscriptions.map((s) => s.id));

      this.logger.log(`Enqueued ${subscriptions.length} order generation jobs`);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue daily orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private getStartOfDay(date: DateTime): DateTime {
    return date.setZone(this.config.timezone).startOf('day');
  }

  private getEndOfDay(date: DateTime): DateTime {
    return date.setZone(this.config.timezone).endOf('day');
  }

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

  async createOrderFromSubscription(
    subscriptionId: string,
  ): Promise<OrderCreationResult> {
    try {
      const subscription = await this.fetchSubscription(subscriptionId);

      if (!subscription) {
        throw new NotFoundException({
          message: `Subscription with ID ${subscriptionId} not found`,
          code: OrderGenerationErrorCode.SUBSCRIPTION_NOT_FOUND,
        });
      }

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

      const existingOrder = await this.findExistingOrder(subscription.id);
      if (existingOrder) {
        this.logger.warn(
          `Order already exists for subscription ${subscription.id} today`,
        );
        return { success: false, reason: 'Duplicate order', skipped: true };
      }

      const walletValidation = await this.validateWalletBalance(
        subscription.customerAddress.customerId,
        subscription.price_snapshot,
      );

      if (!walletValidation.hasSufficientBalance) {
        this.logger.warn(
          `Insufficient wallet balance for customer ${subscription.customerAddress.customerId}. ` +
            `Required: ${subscription.price_snapshot}, Available: ${walletValidation.currentBalance}`,
        );

        await this.suspendSubscription(subscription.id);

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

      const order = await this.createOrder(subscription);

      await this.updateNextDelivery(subscription);

      await this.orderNotificationOrchestrator.sendOrderCreationNotifications(
        order.id,
      );

      this.logger.log(
        `Created order ${order.id} for subscription ${subscription.id}`,
      );

      return { success: true, orderId: order.id, skipped: false };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        `Error creating order from subscription ${subscriptionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.orderNotificationOrchestrator.sendAdminOrderGenerationErrorNotification(
        subscriptionId,
        error instanceof Error ? error.message : 'Unknown error',
      );

      throw new InternalServerErrorException({
        message:
          'Failed to create order from subscription. Please try again later.',
        code: OrderGenerationErrorCode.ORDER_CREATION_FAILED,
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }

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
      return null;
    }
  }

  private async createOrder(subscription: SubscriptionDetails): Promise<{
    id: string;
    orderNo: string;
  }> {
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

  private calculateNextDeliveryDate(
    currentDeliveryDate: Date,
    frequency: SubscriptionFrequency,
    customDays: number[],
  ): Date {
    const baseDate = DateTime.fromJSDate(currentDeliveryDate).setZone(this.config.timezone);
    const frequencyLower = frequency.toLowerCase();

    if (frequencyLower === 'custom' && customDays && customDays.length > 0) {
      const sortedDays = [...customDays].sort((a, b) => a - b);
      const currentDay = baseDate.day;
      const nextDay = sortedDays.find((day) => day > currentDay);
      
      if (nextDay) {
        return baseDate.set({ day: nextDay }).toJSDate();
      } else {
        return baseDate.plus({ months: 1 }).set({ day: sortedDays[0] }).toJSDate();
      }
    }

    const frequencyMap: { [key: string]: number } = {
      daily: 1,
      weekly: 7,
      biweekly: 14,
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    };

    const daysToAdd = frequencyMap[frequencyLower] || 30;
    return baseDate.plus({ days: daysToAdd }).toJSDate();
  }

  private async updateNextDelivery(
    subscription: SubscriptionDetails,
    notifyRescheduled: boolean = false,
  ): Promise<void> {
    try {
      const nextDelivery = this.calculateNextDeliveryDate(
        subscription.next_delivery_date,
        subscription.frequency,
        subscription.custom_days,
      );

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { next_delivery_date: nextDelivery },
      });

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

  private async validateWalletBalance(
    customerId: string,
    requiredAmount: number,
  ): Promise<{ hasSufficientBalance: boolean; currentBalance: number }> {
    try {
      const wallet = await this.prisma.customerWallet.findUnique({
        where: { customerId },
        select: { balance: true },
      });

      const currentBalance = wallet ? Number(wallet.balance) : 0;

      return {
        hasSufficientBalance: currentBalance >= requiredAmount,
        currentBalance,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching wallet for customer ${customerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { hasSufficientBalance: false, currentBalance: 0 };
    }
  }

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

  private async sendInsufficientBalanceNotifications(
    subscription: SubscriptionDetails,
    currentBalance: number,
    requiredAmount: number,
  ): Promise<void> {
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
