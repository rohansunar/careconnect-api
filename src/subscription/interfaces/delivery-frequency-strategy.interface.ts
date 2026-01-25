/**
 * Interface defining the contract for delivery frequency strategies.
 * Each strategy handles a specific type of delivery frequency.
 */
export interface DeliveryFrequencyStrategy {
  /**
   * Gets the next delivery date based on the start date.
   * @param startDate - The starting date for the subscription
   * @returns The next delivery date
   */
  getNextDeliveryDate(startDate: Date): Date;

  /**
   * Gets the delivery days for this frequency.
   * @returns Array of days when deliveries will occur
   */
  getDeliveryDays(): DayOfWeek[];

  /**
   * Validates the strategy configuration.
   * @throws Error if validation fails
   */
  validate(): void;
}

/**
 * Interface defining the contract for the delivery frequency factory.
 * The factory creates appropriate strategy instances based on frequency type.
 */
export interface DeliveryFrequencyFactory {
  /**
   * Creates a delivery frequency strategy for the specified frequency.
   * @param frequency - The subscription frequency type
   * @param customDays - Optional array of days for custom frequency
   * @returns DeliveryFrequencyStrategy instance
   */
  createStrategy(
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): DeliveryFrequencyStrategy;
}

import {
  SubscriptionFrequency,
  DayOfWeek,
} from './delivery-frequency.interface';
