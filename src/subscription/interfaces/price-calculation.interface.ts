/**
 * Interface defining the contract for price calculation strategies.
 * Each strategy handles price calculation for a specific subscription frequency.
 */
export interface PriceCalculator {
  /**
   * Calculates the total price for a subscription based on quantity, price, and start date.
   * @param quantity - Number of items per delivery
   * @param price - Price per item
   * @param startDate - Date when the subscription starts
   * @returns Total calculated price for the subscription
   */
  calculatePrice(quantity: number, price: number, startDate: Date): number;
}

/**
 * Interface defining the contract for the price calculator factory.
 * The factory creates appropriate calculator instances based on frequency type.
 */
export interface PriceCalculatorFactory {
  /**
   * Creates a price calculator instance for the specified frequency.
   * @param frequency - The subscription frequency type
   * @param customDays - Optional array of days for custom frequency
   * @returns PriceCalculator instance
   */
  createCalculator(
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): PriceCalculator;
}

import {
  SubscriptionFrequency,
  DayOfWeek,
} from './delivery-frequency.interface';
