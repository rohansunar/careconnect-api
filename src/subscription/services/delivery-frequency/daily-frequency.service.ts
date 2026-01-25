import { Injectable } from '@nestjs/common';
import { DeliveryFrequencyStrategy } from '../../interfaces/delivery-frequency-strategy.interface';

/**
 * Strategy implementation for daily delivery frequency.
 * Handles all logic related to daily subscription deliveries.
 */
@Injectable()
export class DailyFrequencyService implements DeliveryFrequencyStrategy {
  constructor() {}

  /**
   * Gets the next delivery date for daily frequency (next day).
   * @param startDate - The starting date for the subscription
   * @returns The next delivery date
   */
  getNextDeliveryDate(startDate: Date): Date {
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + 1);
    return nextDate;
  }

  /**
   * Validates the daily frequency configuration.
   * Daily frequency doesn't require custom days.
   */
  validate(): void {
    // Daily frequency is always valid
  }
}
