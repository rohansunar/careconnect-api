/**
 * Represents the days of the week as numerical values.
 * Used for defining custom delivery schedules.
 * Note: Sunday is 0 to align with JavaScript's Date.getDay() method.
 */
export enum DayOfWeek {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 0,
}

/**
 * Defines the available frequency options for subscription deliveries.
 * - DAILY: Deliver every day
 * - ALTERNATIVE_DAYS: Deliver every alternate day
 * - CUSTOM_DAYS: Deliver on specific days of the week
 */
export enum SubscriptionFrequency {
  DAILY = 'DAILY',
  ALTERNATIVE_DAYS = 'ALTERNATIVE_DAYS',
  CUSTOM_DAYS = 'CUSTOM_DAYS',
}

/**
 * Interface defining the contract for delivery frequency services.
 * This service handles validation and calculation of delivery schedules
 * based on subscription frequency and custom day preferences.
 */
export interface DeliveryFrequencyService {
  /**
   * Validates that the provided frequency and custom days combination is valid.
   * For CUSTOM_DAYS frequency, ensures customDays are provided and valid.
   * @param frequency - The subscription frequency type
   * @param customDays - Optional array of days for custom frequency
   * @throws BadRequestException if validation fails
   */
  validateFrequency(
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): void;

  /**
   * Calculates the next delivery date based on the start date and frequency.
   * For custom days, finds the next valid day in the custom schedule.
   * @param startDate - The starting date for the subscription
   * @param frequency - The subscription frequency type
   * @param customDays - Optional array of days for custom frequency
   * @returns The next delivery date
   * @throws BadRequestException if customDays are required but not provided
   */
  getNextDeliveryDate(
    startDate: Date,
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): Date;
}
