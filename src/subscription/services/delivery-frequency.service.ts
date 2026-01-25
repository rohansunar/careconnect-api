import { Injectable, BadRequestException } from '@nestjs/common';
import { DeliveryFrequencyFactoryService } from './delivery-frequency/delivery-frequency.factory';
import {
  DayOfWeek,
  SubscriptionFrequency,
} from '../interfaces/delivery-frequency.interface';
import { DeliveryFrequencyService as IDeliveryFrequencyService } from '../interfaces/delivery-frequency.interface';

/**
 * Service for managing and validating delivery frequency logic.
 * This service uses the strategy pattern to delegate frequency-specific operations
 * to appropriate strategy implementations.
 */
@Injectable()
export class DeliveryFrequencyService implements IDeliveryFrequencyService {
  constructor(
    private readonly deliveryFrequencyFactory: DeliveryFrequencyFactoryService,
  ) {}

  /**
   * Validates the frequency and custom days combination.
   * For CUSTOM_DAYS frequency, ensures custom days are provided and valid.
   * @param frequency - The subscription frequency type
   * @param customDays - Optional array of days for custom frequency
   * @throws BadRequestException if validation fails
   */
  validateFrequency(
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): void {
    const strategy = this.deliveryFrequencyFactory.createStrategy(
      frequency,
      customDays,
    );
    console.log("strategy",strategy,  strategy.validate())
    strategy.validate();
  }

  /**
   * Validates that custom days are provided, unique, and valid.
   * @param customDays - Array of days for custom delivery schedule
   * @throws BadRequestException if validation fails
   */
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

    const allDays: number[] = Object.values(DayOfWeek).filter(
      (day): day is number => typeof day === 'number',
    );
    for (const day of customDays) {
      if (!allDays.includes(day)) {
        throw new BadRequestException(`Invalid day: ${day}`);
      }
    }
  }

  /**
   * Calculates the next delivery date based on the start date and frequency.
   * For custom days, finds the next valid day in the custom schedule.
   * @param startDate - The starting date for the subscription
   * @param frequency - The subscription frequency type
   * @param customDays - Optional array of days for custom frequency
   * @returns The next delivery date
   * @throws BadRequestException if customDays are required but not provided
   */
  getNextDeliveryDate(
    startDate: Date,
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): Date {
    const strategy = this.deliveryFrequencyFactory.createStrategy(
      frequency,
      customDays,
    );
    return strategy.getNextDeliveryDate(startDate);
  }

  /**
   * Returns the days of the week that deliveries will occur based on frequency.
   * For DAILY: returns all days
   * For ALTERNATIVE_DAYS: returns Monday, Wednesday, Friday, Sunday
   * For CUSTOM_DAYS: returns the provided custom days
   * @param frequency - The subscription frequency type
   * @param customDays - Optional array of days for custom frequency
   * @returns Array of days when deliveries will occur
   * @throws BadRequestException if customDays are required but not provided or if frequency is invalid
   */
  getDeliveryDays(
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): DayOfWeek[] {
    const strategy = this.deliveryFrequencyFactory.createStrategy(
      frequency,
      customDays,
    );
    return strategy.getDeliveryDays();
  }
}
