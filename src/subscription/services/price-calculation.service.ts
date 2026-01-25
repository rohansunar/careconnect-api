import { Injectable, Logger } from '@nestjs/common';
import { PriceCalculatorFactoryService } from './price-calculation/price-calculator.factory';
import {
  SubscriptionFrequency,
  DayOfWeek,
} from '../interfaces/delivery-frequency.interface';

/**
 * Service responsible for calculating the total price of a subscription.
 * This service uses the strategy pattern to delegate price calculations to
 * appropriate calculator implementations based on frequency type.
 */
@Injectable()
export class PriceCalculationService {
  private readonly logger = new Logger(PriceCalculationService.name);

  constructor(
    private readonly priceCalculatorFactory: PriceCalculatorFactoryService,
  ) {}

  /**
   * Calculates the total price for a subscription based on quantity, price, frequency, and start date.
   * This method acts as the main entry point and uses the factory to create appropriate calculators.
   * @param quantity - Number of items per delivery
   * @param price - Price per item
   * @param frequency - Delivery frequency type
   * @param startDate - Date when the subscription starts
   * @param customDays - Optional array of days for custom frequency
   * @returns Total calculated price for the subscription
   * @throws Error if an invalid frequency type is provided
   */
  calculateTotalPrice(
    quantity: number,
    price: number,
    frequency: SubscriptionFrequency,
    startDate: Date,
    customDays?: DayOfWeek[],
  ): number {
    this.logger.log(
      `Starting total price calculation. Quantity: ${quantity}, Price: ${price}, Frequency: ${frequency}, Start Date: ${startDate}`,
    );

    const calculator = this.priceCalculatorFactory.createCalculator(
      frequency,
      customDays,
    );
    const totalPrice = calculator.calculatePrice(quantity, price, startDate);

    this.logger.log(`Total calculated price: ${totalPrice}`);
    return totalPrice;
  }
}
