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
    strategy.validate();
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
}
