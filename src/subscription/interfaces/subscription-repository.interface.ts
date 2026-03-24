/**
 * Interface defining the contract for subscription repository.
 * This abstraction layer handles database operations for subscriptions.
 */
export interface SubscriptionRepository {
  /**
   * Finds a subscription by ID.
   * @param id - Subscription ID
   * @returns Subscription or null if not found
   */
  findById(id: string): Promise<Subscription | null>;

  /**
   * Finds all subscriptions for a customer and product.
   * @param customerId - Customer ID
   * @param productId - Product ID
   * @returns Array of subscriptions
   */
  findByCustomerAndProduct(
    customerId: string,
    productId: string,
  ): Promise<Subscription[]>;

  /**
   * Creates a new subscription.
   * @param subscription - Subscription data
   * @returns Created subscription
   */
  create(subscription: SubscriptionData): Promise<Subscription>;

  /**
   * Updates an existing subscription.
   * @param id - Subscription ID
   * @param data - Partial subscription data to update
   * @returns Updated subscription
   */
  update(id: string, data: Partial<SubscriptionData>): Promise<Subscription>;

  /**
   * Deletes a subscription.
   * @param id - Subscription ID
   * @returns Deleted subscription
   */
  delete(id: string): Promise<Subscription>;
}

export interface Subscription {
  id: string;
  customerId: string;
  productId: string;
  quantity: number;
  subscription_price: number;
  frequency: SubscriptionFrequency;
  customDays?: DayOfWeek[];
  startDate: Date;
  nextDeliveryDate?: Date;
  endDate?: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionData {
  customerId: string;
  customerAddressId: string;
  productId: string;
  quantity: number;
  priceSnapshot: number;
  total_price: number;
  frequency: SubscriptionFrequency;
  customDays?: DayOfWeek[];
  startDate: Date;
  nextDeliveryDate?: Date;
  endDate?: Date;
  status: string;
}

import {
  SubscriptionFrequency,
  DayOfWeek,
} from './delivery-frequency.interface';
