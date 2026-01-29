import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  SubscriptionRepository,
  Subscription,
  SubscriptionData,
} from '../interfaces/subscription-repository.interface';
import {
  SubscriptionStatus,
  DayOfWeek as PrismaDayOfWeek,
} from '@prisma/client';
import { DayOfWeek } from '../interfaces/delivery-frequency.interface';

/**
 * Prisma-based implementation of the SubscriptionRepository interface.
 * Handles all database operations for subscriptions.
 */
@Injectable()
export class SubscriptionRepositoryService implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a subscription by ID.
   * @param id - Subscription ID
   * @returns Subscription or null if not found
   */
  async findById(id: string): Promise<Subscription | null> {
    const result = await this.prisma.subscription.findUnique({
      where: { id },
      include: { customerAddress: true },
    });
    return result ? this.mapToSubscription(result) : null;
  }

  /**
   * Finds all subscriptions for a customer and product.
   * @param customerId - Customer ID
   * @param productId - Product ID
   * @returns Array of subscriptions
   */
  async findByCustomerAndProduct(
    customerId: string,
    productId: string,
  ): Promise<Subscription[]> {
    try {
      const results = await this.prisma.subscription.findMany({
        where: { customerAddress: { customerId }, productId },
        include: { customerAddress: true },
        orderBy: { created_at: 'desc' },
      });
      return results.map(this.mapToSubscription);
    } catch (error) {
      return [];
    }
  }

  /**
   * Creates a new subscription.
   * @param subscription - Subscription data
   * @returns Created subscription
   */
  async create(subscription: SubscriptionData): Promise<Subscription> {
    const result = await this.prisma.subscription.create({
      data: {
        customerAddressId: subscription.customerAddressId,
        customerId: subscription.customerId,
        productId: subscription.productId,
        quantity: subscription.quantity,
        total_price: subscription.price,
        price_snapshot: subscription.priceSnapshot,
        frequency: subscription.frequency,
        custom_days: subscription.customDays
          ? this.mapDayOfWeekToPrisma(subscription.customDays)
          : [],
        start_date: subscription.startDate,
        next_delivery_date: subscription.nextDeliveryDate,
        status: subscription.status as SubscriptionStatus,
      },
    });
    return this.mapToSubscription(result);
  }

  /**
   * Updates an existing subscription.
   * @param id - Subscription ID
   * @param data - Partial subscription data to update
   * @returns Updated subscription
   */
  async update(
    id: string,
    data: Partial<SubscriptionData>,
  ): Promise<Subscription> {
    const result = await this.prisma.subscription.update({
      where: { id },
      data: {
        customerAddressId: data.customerId,
        productId: data.productId,
        quantity: data.quantity,
        total_price: data.price,
        frequency: data.frequency,
        custom_days: data.customDays
          ? this.mapDayOfWeekToPrisma(data.customDays)
          : [],
        start_date: data.startDate,
        status: data.status as SubscriptionStatus,
      },
      include: { customerAddress: true },
    });
    return this.mapToSubscription(result);
  }

  /**
   * Deletes a subscription.
   * @param id - Subscription ID
   * @returns Deleted subscription
   */
  async delete(id: string): Promise<Subscription> {
    const result = await this.prisma.subscription.delete({
      where: { id },
      include: { customerAddress: true },
    });
    return this.mapToSubscription(result);
  }

  /**
   * Maps our DayOfWeek enum to Prisma's DayOfWeek enum.
   * @param days - Array of our DayOfWeek values
   * @returns Array of Prisma DayOfWeek values
   */
  private mapDayOfWeekToPrisma(days: DayOfWeek[]): PrismaDayOfWeek[] {
    return days.map((day) => {
      switch (day) {
        case DayOfWeek.MONDAY:
          return PrismaDayOfWeek.MONDAY;
        case DayOfWeek.TUESDAY:
          return PrismaDayOfWeek.TUESDAY;
        case DayOfWeek.WEDNESDAY:
          return PrismaDayOfWeek.WEDNESDAY;
        case DayOfWeek.THURSDAY:
          return PrismaDayOfWeek.THURSDAY;
        case DayOfWeek.FRIDAY:
          return PrismaDayOfWeek.FRIDAY;
        case DayOfWeek.SATURDAY:
          return PrismaDayOfWeek.SATURDAY;
        case DayOfWeek.SUNDAY:
          return PrismaDayOfWeek.SUNDAY;
        default:
          throw new Error(`Invalid day value: ${day}`);
      }
    });
  }

  /**
   * Maps Prisma subscription model to our Subscription interface.
   * @param prismaSubscription - Prisma subscription model
   * @returns Subscription interface
   */
  private mapToSubscription(prismaSubscription: any): Subscription {
    return {
      id: prismaSubscription.id,
      customerId:
        prismaSubscription.customerAddress?.customerId ||
        prismaSubscription.customerAddressId,
      productId: prismaSubscription.productId,
      quantity: prismaSubscription.quantity,
      price: prismaSubscription.total_price,
      frequency: prismaSubscription.frequency,
      customDays: prismaSubscription.custom_days,
      startDate: prismaSubscription.start_date,
      nextDeliveryDate: prismaSubscription.next_delivery_date,
      endDate: prismaSubscription.end_date,
      status: prismaSubscription.status,
      createdAt: prismaSubscription.created_at,
      updatedAt: prismaSubscription.updated_at,
    };
  }
}
