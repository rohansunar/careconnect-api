import { Injectable } from '@nestjs/common';
import {
  SubscriptionFrequency,
  DayOfWeek,
} from '../../interfaces/delivery-frequency.interface';
import {
  PriceCalculator,
  PriceCalculatorFactory,
} from '../../interfaces/price-calculation.interface';
import { DailyPriceCalculator } from './daily-price-calculator';
import { AlternatePriceCalculator } from './alternate-price-calculator';
import { CustomPriceCalculator } from './custom-price-calculator';

/**
 * Factory for creating price calculator strategies.
 * Implements the factory pattern to create appropriate calculator instances.
 */
@Injectable()
export class PriceCalculatorFactoryService implements PriceCalculatorFactory {
  constructor() {}

  /**
   * Creates a price calculator based on the specified frequency type.
   * @param frequency - The subscription frequency type
   * @param customDays - Optional array of days for custom frequency
   * @returns PriceCalculator instance
   */
  createCalculator(
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): PriceCalculator {
    switch (frequency) {
      case SubscriptionFrequency.DAILY:
        return new DailyPriceCalculator();
      case SubscriptionFrequency.ALTERNATIVE_DAYS:
        return new AlternatePriceCalculator();
      case SubscriptionFrequency.CUSTOM_DAYS:
        if (!customDays || customDays.length === 0) {
          throw new Error('Custom days are required for CUSTOM_DAYS frequency');
        }
        return new CustomPriceCalculator(customDays);
      default:
        throw new Error('Invalid frequency type');
    }
  }
}
