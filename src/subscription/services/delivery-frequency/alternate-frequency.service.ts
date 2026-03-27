import { DateTime } from 'luxon';
import { DeliveryFrequencyStrategy } from '../../interfaces/delivery-frequency-strategy.interface';
import { getAppTimezone } from '../../../common/utils/timezone.utils';

/**
 * Strategy implementation for alternate day delivery frequency.
 * Handles all logic related to alternate day subscription deliveries.
 */
export class AlternateFrequencyService implements DeliveryFrequencyStrategy {
  private readonly appTimezone = getAppTimezone();

  /**
   * Gets the next delivery date for alternate frequency (2 days later).
   * @param startDate - The starting date for the subscription
   * @returns The next delivery date
   */
  getNextDeliveryDate(startDate: Date): Date {
    return DateTime.fromJSDate(startDate, {
      zone: this.appTimezone,
    })
      .plus({ days: 2 })
      .toJSDate();
  }

  /**
   * Validates the alternate frequency configuration.
   * Alternate frequency doesn't require custom days.
   */
  validate(): void {
    // Alternate frequency is always valid
  }
}
