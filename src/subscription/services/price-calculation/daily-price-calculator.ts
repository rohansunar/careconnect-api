import { Injectable } from '@nestjs/common';
import { PriceCalculator } from '../../interfaces/price-calculation.interface';
import { differenceInCalendarDays, lastDayOfMonth } from 'date-fns';
import { getNextMonthDates } from './date-utils';

/**
 * Price calculator implementation for daily frequency subscriptions.
 * Handles all price calculation logic for daily deliveries.
 */
@Injectable()
export class DailyPriceCalculator implements PriceCalculator {
  /**
   * Calculates the total price for daily frequency subscriptions.
   * If no days remain in the current month, shifts calculation to the next month.
   * @param quantity - Number of items per delivery
   * @param price - Price per item
   * @param startDate - Date when the subscription starts
   * @returns Total calculated price for the subscription
   */
  calculatePrice(quantity: number, price: number, startDate: Date): number {
    const endOfMonthDate = lastDayOfMonth(startDate);
    const remainingDays = differenceInCalendarDays(endOfMonthDate, startDate);

    if (remainingDays < 1) {
      return this.calculateNextMonth(price) * quantity;
    }

    const dailyPrice = price * remainingDays;
    return dailyPrice * quantity;
  }

  /**
   * Calculates the price for the next month when current month has insufficient days.
   * @param price - Price per item
   * @returns Total price for next month
   */
  private calculateNextMonth(price: number): number {
    const { nextMonthStart, nextMonthEnd } = getNextMonthDates();
    const days = differenceInCalendarDays(nextMonthEnd, nextMonthStart);
    return price * days;
  }
}
