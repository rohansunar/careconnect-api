import { Injectable } from '@nestjs/common';
import { PriceCalculator } from '../../interfaces/price-calculation.interface';
import {
  differenceInCalendarDays,
  lastDayOfMonth,
  addDays,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { DayOfWeek } from '../../interfaces/delivery-frequency.interface';
import { getNextMonthDates } from './date-utils';

/**
 * Price calculator implementation for custom days frequency subscriptions.
 * Handles all price calculation logic for custom day deliveries.
 */
@Injectable()
export class CustomPriceCalculator implements PriceCalculator {
  constructor(private readonly customDays: DayOfWeek[]) {
    if (!customDays || customDays.length === 0) {
      throw new Error('Custom days are required for custom frequency');
    }
  }

  /**
   * Calculates the total price for custom days frequency subscriptions.
   * Deliveries occur only on specified days of the week.
   * @param quantity - Number of items per delivery
   * @param price - Price per item
   * @param startDate - Date when the subscription starts
   * @returns Total calculated price for the subscription
   */
  calculatePrice(quantity: number, price: number, startDate: Date): number {
    const endOfMonthDate = lastDayOfMonth(startDate);
    const count = this.countWeekDaysInRange(
      startDate,
      endOfMonthDate,
      this.customDays,
    );

    if (count === 0) {
      return this.calculateNextMonth(price) * quantity;
    }

    const customPrice = price * count;
    return customPrice * quantity;
  }

  /**
   * Calculates the price for the next month when current month has no valid days.
   * @param price - Price per item
   * @returns Total price for next month
   */
  private calculateNextMonth(price: number): number {
    const { nextMonthStart, nextMonthEnd } = getNextMonthDates();
    const count = this.countWeekDaysInRange(
      nextMonthStart,
      nextMonthEnd,
      this.customDays,
    );
    return price * count;
  }

  /**
   * Counts how many times specific weekdays occur within a date range.
   * @param start - Start date of the range
   * @param end - End date of the range
   * @param weekDays - Array of days to count
   * @returns Number of occurrences of the specified weekdays in the range
   */
  private countWeekDaysInRange(
    start: Date,
    end: Date,
    weekDays: number[],
  ): number {
    let count = 0;
    let current = start;
    while (current <= end) {
      if (weekDays.includes(current.getDay())) count++;
      current = addDays(current, 1);
    }
    return count;
  }
}
