import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { DayOfWeek } from '../../interfaces/delivery-frequency.interface';
import { DeliveryFrequencyStrategy } from '../../interfaces/delivery-frequency-strategy.interface';
import { getAppTimezone } from '../../../common/utils/timezone.utils';

/**
 * Strategy implementation for custom day delivery frequency.
 * Handles all logic related to custom day subscription deliveries.
 */
export class CustomFrequencyService implements DeliveryFrequencyStrategy {
  private readonly appTimezone = getAppTimezone();

  constructor(private readonly customDays: DayOfWeek[]) {
    if (!customDays || customDays.length === 0) {
      throw new BadRequestException(
        'Custom days are required for custom frequency',
      );
    }
  }

  /**
   * Gets the next delivery date for custom frequency.
   * Finds the next valid day in the custom schedule.
   * @param startDate - The starting date for the subscription
   * @returns The next delivery date
   */
  getNextDeliveryDate(startDate: Date): Date {
    const dayNamesByWeekday: Record<number, DayOfWeek> = {
      1: DayOfWeek.MONDAY,
      2: DayOfWeek.TUESDAY,
      3: DayOfWeek.WEDNESDAY,
      4: DayOfWeek.THURSDAY,
      5: DayOfWeek.FRIDAY,
      6: DayOfWeek.SATURDAY,
      7: DayOfWeek.SUNDAY,
    };
    const startDateTime = DateTime.fromJSDate(startDate, {
      zone: this.appTimezone,
    });

    for (let daysToAdd = 1; daysToAdd <= 7; daysToAdd++) {
      const nextDate = startDateTime.plus({ days: daysToAdd });

      const nextDayName = dayNamesByWeekday[nextDate.weekday];
      if (this.customDays.includes(nextDayName)) {
        return nextDate.toJSDate();
      }
    }

    throw new BadRequestException('Unable to calculate next delivery date');
  }

  /**
   * Validates the custom frequency configuration.
   * Ensures custom days are provided and valid.
   */
  validate(): void {
    if (this.customDays.length === 0) {
      throw new BadRequestException(
        'At least one day must be selected for custom delivery',
      );
    }

    const uniqueDays = new Set(this.customDays);
    if (uniqueDays.size !== this.customDays.length) {
      throw new BadRequestException('Duplicate days are not allowed');
    }

    const allDays: number[] = Object.values(DayOfWeek).filter(
      (day): day is number => typeof day === 'number',
    );
    for (const day of this.customDays) {
      if (!allDays.includes(day)) {
        throw new BadRequestException(`Invalid day: ${day}`);
      }
    }
  }
}
