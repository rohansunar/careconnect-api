import { DateTime } from 'luxon';
import { DeliveryFrequencyStrategy } from '../../interfaces/delivery-frequency-strategy.interface';
import { getAppTimezone } from '../../../common/utils/timezone.utils';

/**
 * Strategy implementation for daily delivery frequency.
 * Handles all logic related to daily subscription deliveries.
 */
export class DailyFrequencyService implements DeliveryFrequencyStrategy {
  private readonly appTimezone = getAppTimezone();

  /**
   * Gets the next delivery date for daily frequency (next day).
   * @param startDate - The starting date for the subscription
   * @returns The next delivery date
   */
  getNextDeliveryDate(startDate: Date): Date {
    return DateTime.fromJSDate(startDate, {
      zone: this.appTimezone,
    })
      .plus({ days: 1 })
      .toJSDate();
  }

  /**
   * Validates the daily frequency configuration.
   * Daily frequency doesn't require custom days.
   */
  validate(): void {
    // Daily frequency is always valid
  }
}
