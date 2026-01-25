import { Injectable } from '@nestjs/common';
import { DayOfWeek } from '../../interfaces/delivery-frequency.interface';
import { DeliveryFrequencyStrategy } from '../../interfaces/delivery-frequency-strategy.interface';

/**
 * Strategy implementation for alternate day delivery frequency.
 * Handles all logic related to alternate day subscription deliveries.
 */
@Injectable()
export class AlternateFrequencyService implements DeliveryFrequencyStrategy {
  constructor() {}

  /**
   * Gets the next delivery date for alternate frequency (2 days later).
   * @param startDate - The starting date for the subscription
   * @returns The next delivery date
   */
  getNextDeliveryDate(startDate: Date): Date {
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + 2);
    return nextDate;
  }

  /**
   * Validates the alternate frequency configuration.
   * Alternate frequency doesn't require custom days.
   */
  validate(): void {
    // Alternate frequency is always valid
  }
}
