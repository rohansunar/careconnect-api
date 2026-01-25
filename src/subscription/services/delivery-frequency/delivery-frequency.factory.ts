import { Injectable, BadRequestException } from '@nestjs/common';
import {
  SubscriptionFrequency,
  DayOfWeek,
} from '../../interfaces/delivery-frequency.interface';
import {
  DeliveryFrequencyStrategy,
  DeliveryFrequencyFactory,
} from '../../interfaces/delivery-frequency-strategy.interface';
import { DailyFrequencyService } from './daily-frequency.service';
import { AlternateFrequencyService } from './alternate-frequency.service';
import { CustomFrequencyService } from './custom-frequency.service';

/**
 * Factory for creating delivery frequency strategies.
 * Implements the factory pattern to create appropriate strategy instances.
 */
@Injectable()
export class DeliveryFrequencyFactoryService implements DeliveryFrequencyFactory {
  constructor() {}

  /**
   * Creates a delivery frequency strategy based on the specified frequency type.
   * @param frequency - The subscription frequency type
   * @param customDays - Optional array of days for custom frequency
   * @returns DeliveryFrequencyStrategy instance
   */
  createStrategy(
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): DeliveryFrequencyStrategy {
    switch (frequency) {
      case SubscriptionFrequency.DAILY:
        return new DailyFrequencyService();
      case SubscriptionFrequency.ALTERNATIVE_DAYS:
        return new AlternateFrequencyService();
      case SubscriptionFrequency.CUSTOM_DAYS:
        if (!customDays || customDays.length === 0) {
          throw new BadRequestException(
            'Custom days are required for CUSTOM_DAYS frequency',
          );
        }
        return new CustomFrequencyService(customDays);
      default:
        throw new BadRequestException('Invalid frequency type');
    }
  }
}
