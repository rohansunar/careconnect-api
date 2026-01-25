import {
  addDays,
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
} from 'date-fns';

/**
 * Utility class for date-related operations.
 * Provides common date manipulation functions used across the subscription module.
 */
export class DateUtils {
  /**
   * Gets the first day of the next month.
   * @param date - Reference date
   * @returns First day of the next month
   */
  static getNextMonthStart(date: Date): Date {
    return startOfMonth(addDays(date, 32));
  }

  /**
   * Gets the last day of the next month.
   * @param date - Reference date
   * @returns Last day of the next month
   */
  static getNextMonthEnd(date: Date): Date {
    const nextMonthStart = this.getNextMonthStart(date);
    return endOfMonth(nextMonthStart);
  }

  /**
   * Counts how many times specific weekdays occur within a date range.
   * @param start - Start date of the range
   * @param end - End date of the range
   * @param weekDays - Array of days to count (0=Sunday, 1=Monday, etc.)
   * @returns Number of occurrences of the specified weekdays in the range
   */
  static countWeekDaysInRange(
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

  /**
   * Calculates the number of days between two dates.
   * @param start - Start date
   * @param end - End date
   * @returns Number of days between the dates
   */
  static daysBetween(start: Date, end: Date): number {
    return differenceInCalendarDays(end, start) + 1;
  }
}
