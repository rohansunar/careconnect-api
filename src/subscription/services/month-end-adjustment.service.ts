import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';

@Injectable()
export class MonthEndAdjustmentService {
  private readonly logger = new Logger(MonthEndAdjustmentService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  @Cron('0 0 1 * *') // 1st of every month at midnight
  async processMonthEndAdjustments() {
    this.logger.log('Starting month-end adjustments');

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Process upfront subscriptions
    await this.processUpfrontAdjustments(lastMonth);

    // Process post-delivery billing
    await this.processPostDeliveryBilling(lastMonth);

    this.logger.log('Completed month-end adjustments');
  }

  private async processUpfrontAdjustments(month: Date) {
    const upfrontSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        payment_mode: 'UPFRONT',
      },
      include: {
        customerAddress: {
          include: {
            customer: true,
          },
        },
        product: true,
      },
    });

    for (const subscription of upfrontSubscriptions) {
      await this.calculateAndApplyAdjustment(subscription, month);
    }
  }

  private async calculateAndApplyAdjustment(subscription: any, month: Date) {
    if (!subscription.customerAddress) {
      this.logger.warn(
        `Subscription ${subscription.id} has no customer address`,
      );
      return;
    }

    const expectedDeliveries = this.calculateExpectedDeliveries(
      subscription,
      month,
    );

    const actualDeliveries = await this.prisma.order.count({
      where: {
        subscriptionId: subscription.id,
        delivery_status: 'DELIVERED',
        created_at: {
          gte: new Date(month.getFullYear(), month.getMonth(), 1),
          lt: new Date(month.getFullYear(), month.getMonth() + 1, 1),
        },
      },
    });

    const adjustmentAmount =
      (expectedDeliveries - actualDeliveries) *
      (subscription as any).price_snapshot;

    if (adjustmentAmount !== 0) {
      // Create monthly bill for adjustment
      await this.prisma.monthlyBill.create({
        data: {
          customer_id: subscription.customerAddress.customerId,
          month: month.toISOString().slice(0, 7), // YYYY-MM
          total_amount: adjustmentAmount,
          status: adjustmentAmount > 0 ? 'PENDING' : 'PENDING', // Refund or charge
          billing_period_start: new Date(
            month.getFullYear(),
            month.getMonth(),
            1,
          ),
          billing_period_end: new Date(
            month.getFullYear(),
            month.getMonth() + 1,
            0,
          ),
        },
      });

      // Notify admin
      await this.notificationService.notifyAdmin(
        'Subscription Adjustment',
        `Adjustment of ${adjustmentAmount} for subscription ${subscription.id} in ${month.toISOString().slice(0, 7)}`,
      );

      this.logger.log(
        `Applied adjustment of ${adjustmentAmount} for subscription ${subscription.id}`,
      );
    }
  }

  private async processPostDeliveryBilling(month: Date) {
    const postDeliverySubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        payment_mode: 'POST_DELIVERY',
      },
      include: {
        customerAddress: {
          include: {
            customer: true,
          },
        },
      },
    });

    // Group by customer
    const customerBills = new Map<
      string,
      { subscriptions: any[]; customer: any }
    >();

    for (const subscription of postDeliverySubscriptions) {
      if (!subscription.customerAddress) continue;
      const customerId = subscription.customerAddress.customerId;
      if (!customerBills.has(customerId)) {
        customerBills.set(customerId, {
          subscriptions: [],
          customer: subscription.customerAddress.customer,
        });
      }
      customerBills.get(customerId)!.subscriptions.push(subscription);
    }

    for (const [customerId, { subscriptions, customer }] of customerBills) {
      await this.generateMonthlyBillForCustomer(
        customerId,
        subscriptions,
        month,
      );
    }
  }

  private async generateMonthlyBillForCustomer(
    customerId: string,
    subscriptions: any[],
    month: Date,
  ) {
    let totalAmount = 0;

    for (const subscription of subscriptions) {
      const deliveries = await this.prisma.order.count({
        where: {
          subscriptionId: subscription.id,
          delivery_status: 'DELIVERED',
          created_at: {
            gte: new Date(month.getFullYear(), month.getMonth(), 1),
            lt: new Date(month.getFullYear(), month.getMonth() + 1, 1),
          },
        },
      });

      totalAmount += deliveries * (subscription as any).price_snapshot;
    }

    if (totalAmount > 0) {
      await this.prisma.monthlyBill.create({
        data: {
          customer_id: customerId,
          month: month.toISOString().slice(0, 7),
          total_amount: totalAmount,
          status: 'PENDING',
          billing_period_start: new Date(
            month.getFullYear(),
            month.getMonth(),
            1,
          ),
          billing_period_end: new Date(
            month.getFullYear(),
            month.getMonth() + 1,
            0,
          ),
        },
      });

      this.logger.log(
        `Generated monthly bill of ${totalAmount} for customer ${customerId}`,
      );
    }
  }

  private calculateExpectedDeliveries(subscription: any, month: Date): number {
    // Simplified: assume daily delivery
    const daysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    return daysInMonth; // For simplicity, assume daily
  }
}
