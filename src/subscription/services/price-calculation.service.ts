import { Injectable } from '@nestjs/common';
import { SubscriptionFrequency } from '../interfaces/delivery-frequency.interface';

/**
 * Service responsible for calculating the total price of a subscription.
 * This includes base price calculation, frequency adjustments, and proration for mid-month starts.
 */
@Injectable()
export class PriceCalculationService {
  /**
   * Calculates the total price for a subscription.
   * @param quantity - Number of units of the product
   * @param pricePerUnit - Price of one unit of the product
   * @param frequency - Frequency of delivery
   * @param startDate - Start date of the subscription
   * @returns Calculated total price
   */
  calculateTotalPrice(
    quantity: number,
    pricePerUnit: number,
    frequency: SubscriptionFrequency,
    startDate: Date,
  ): number {
    const basePrice = quantity * pricePerUnit;
    const frequencyMultiplier = this.getFrequencyMultiplier(frequency);
    const prorationFactor = this.calculateProrationFactor(startDate);

    console.log("prorationFactor",frequencyMultiplier,basePrice, prorationFactor, basePrice * frequencyMultiplier * prorationFactor)

    return basePrice * frequencyMultiplier * prorationFactor;
  }

  /**
   * Gets the multiplier for the subscription frequency.
   * @param frequency - Frequency of delivery
   * @returns Multiplier value
   */
  private getFrequencyMultiplier(frequency: SubscriptionFrequency): number {
    switch (frequency) {
      case SubscriptionFrequency.DAILY:
        return 30; // Assuming 30 days in a month
      case SubscriptionFrequency.ALTERNATIVE_DAYS:
        return 15; // Assuming 15 deliveries in a month
      case SubscriptionFrequency.CUSTOM_DAYS:
        return 10; // Example value for custom days
      default:
        throw new Error('Invalid frequency type');
    }
  }

  /**
   * Calculates the proration factor for mid-month start dates.
   * @param startDate - Start date of the subscription
   * @returns Proration factor (ratio of remaining days in the month to total days)
   */
  private calculateProrationFactor(startDate: Date): number {
    const startDayOfMonth = startDate.getDate();
    const daysInMonth = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      0,
    ).getDate();

    const remainingDays = daysInMonth - startDayOfMonth;
    return remainingDays / daysInMonth;
  }
}
