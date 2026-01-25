import { Injectable, BadRequestException } from '@nestjs/common';
import { DayOfWeek } from '../../interfaces/delivery-frequency.interface';
import { DeliveryFrequencyStrategy } from '../../interfaces/delivery-frequency-strategy.interface';

/**
 * Strategy implementation for custom day delivery frequency.
 * Handles all logic related to custom day subscription deliveries.
 */
@Injectable()
export class CustomFrequencyService implements DeliveryFrequencyStrategy {
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
    const currentDate = new Date(startDate);
    const dayIndex = currentDate.getDay();

    const dayNames: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];

    const currentDayName = dayNames[dayIndex];
    const currentDayIndexInCustom = this.customDays.indexOf(currentDayName);

    if (currentDayIndexInCustom !== -1) {
      currentDate.setDate(currentDate.getDate() + 1);
    } else {
      let daysToAdd = 1;
      let nextDayIndex = (dayIndex + 1) % 7;
      let found = false;

      while (!found && daysToAdd < 7) {
        const nextDayName = dayNames[nextDayIndex];
        if (this.customDays.includes(nextDayName)) {
          found = true;
        } else {
          daysToAdd++;
          nextDayIndex = (nextDayIndex + 1) % 7;
        }
      }

      currentDate.setDate(currentDate.getDate() + daysToAdd);
    }

    return currentDate;
  }

  /**
   * Gets the custom delivery days.
   * @returns Array of custom days when deliveries will occur
   */
  getDeliveryDays(): DayOfWeek[] {
    return this.customDays;
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
