import { addMonths, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Utility function to get the start and end dates of the next month.
 * @returns Object containing nextMonthStart and nextMonthEnd as Date objects
 */
export function getNextMonthDates(): {
  nextMonthStart: Date;
  nextMonthEnd: Date;
} {
  const nextMonth = addMonths(new Date(), 1);
  return {
    nextMonthStart: startOfMonth(nextMonth),
    nextMonthEnd: endOfMonth(nextMonth),
  };
}
