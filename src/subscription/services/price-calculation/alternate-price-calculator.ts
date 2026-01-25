import { Injectable } from '@nestjs/common';
import { PriceCalculator } from '../../interfaces/price-calculation.interface';
import {
  differenceInCalendarDays,
  lastDayOfMonth,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { getNextMonthDates } from './date-utils';

/**
 * Price calculator implementation for alternate days frequency subscriptions.
 * Handles all price calculation logic for alternate day deliveries.
 */
@Injectable()
export class AlternatePriceCalculator implements PriceCalculator {
  /**
   * Calculates the total price for alternate days frequency subscriptions.
   * Deliveries occur every second day.
   * @param quantity - Number of items per delivery
   * @param price - Price per item
   * @param startDate - Date when the subscription starts
   * @returns Total calculated price for the subscription
   */
  calculatePrice(quantity: number, price: number, startDate: Date): number {
    const endOfMonthDate = lastDayOfMonth(startDate);
    const remainingDays =
      differenceInCalendarDays(endOfMonthDate, startDate) + 1;

    if (remainingDays < 2) {
      return this.calculateNextMonth(price) * quantity;
    }

    const deliveries = Math.ceil(remainingDays / 2);
    const alternatePrice = price * deliveries;
    return alternatePrice * quantity;
  }

  /**
   * Calculates the price for the next month when current month has insufficient days.
   * @param price - Price per item
   * @returns Total price for next month
   */
  private calculateNextMonth(price: number): number {
    const { nextMonthStart, nextMonthEnd } = getNextMonthDates();
    const days = differenceInCalendarDays(nextMonthEnd, nextMonthStart) + 1;
    const deliveries = Math.ceil(days / 2);
    return price * deliveries;
  }
}
