import { Injectable, BadRequestException } from '@nestjs/common';
import {
  DayOfWeek,
  SubscriptionFrequency,
} from '../interfaces/delivery-frequency.interface';
import { DeliveryFrequencyService as IDeliveryFrequencyService } from '../interfaces/delivery-frequency.interface';

@Injectable()
export class DeliveryFrequencyService implements IDeliveryFrequencyService {
  validateFrequency(
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): void {
    if (frequency === SubscriptionFrequency.CUSTOM_DAYS) {
      if (!customDays || customDays.length === 0) {
        throw new BadRequestException(
          'Custom days are required for CUSTOM_DAYS frequency',
        );
      }
      this.validateCustomDays(customDays);
    }
  }

  validateCustomDays(customDays: DayOfWeek[]): void {
    if (customDays.length === 0) {
      throw new BadRequestException(
        'At least one day must be selected for custom delivery',
      );
    }

    const uniqueDays = new Set(customDays);
    if (uniqueDays.size !== customDays.length) {
      throw new BadRequestException('Duplicate days are not allowed');
    }

    const allDays: DayOfWeek[] = Object.values(DayOfWeek);
    for (const day of customDays) {
      if (!allDays.includes(day)) {
        throw new BadRequestException(`Invalid day: ${day}`);
      }
    }
  }

  getNextDeliveryDate(
    startDate: Date,
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): Date {
    const currentDate = new Date(startDate);

    switch (frequency) {
      case SubscriptionFrequency.DAILY:
        currentDate.setDate(currentDate.getDate() + 1);
        break;

      case SubscriptionFrequency.ALTERNATIVE_DAYS:
        currentDate.setDate(currentDate.getDate() + 2);
        break;

      case SubscriptionFrequency.CUSTOM_DAYS:
        if (!customDays || customDays.length === 0) {
          throw new BadRequestException(
            'Custom days are required for CUSTOM_DAYS frequency',
          );
        }

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
        const currentDayIndexInCustom = customDays.indexOf(currentDayName);

        if (currentDayIndexInCustom !== -1) {
          currentDate.setDate(currentDate.getDate() + 1);
        } else {
          let daysToAdd = 1;
          let nextDayIndex = (dayIndex + 1) % 7;
          let found = false;

          while (!found && daysToAdd < 7) {
            const nextDayName = dayNames[nextDayIndex];
            if (customDays.includes(nextDayName)) {
              found = true;
            } else {
              daysToAdd++;
              nextDayIndex = (nextDayIndex + 1) % 7;
            }
          }

          currentDate.setDate(currentDate.getDate() + daysToAdd);
        }
        break;
    }

    return currentDate;
  }

  getDeliveryDays(
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): DayOfWeek[] {
    switch (frequency) {
      case SubscriptionFrequency.DAILY:
        return Object.values(DayOfWeek);

      case SubscriptionFrequency.ALTERNATIVE_DAYS:
        return [
          DayOfWeek.MONDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SUNDAY,
        ];

      case SubscriptionFrequency.CUSTOM_DAYS:
        if (!customDays || customDays.length === 0) {
          throw new BadRequestException(
            'Custom days are required for CUSTOM_DAYS frequency',
          );
        }
        return customDays;

      default:
        throw new BadRequestException('Invalid frequency type');
    }
  }
}
