import { BadRequestException } from '@nestjs/common';
import {
  DayOfWeek,
  SubscriptionFrequency,
} from '../interfaces/delivery-frequency.interface';

/**
 * Utility class for validation operations.
 * Provides common validation functions used across the subscription module.
 */
export class ValidationUtils {
  /**
   * Validates that custom days are provided, unique, and valid.
   * @param customDays - Array of days for custom delivery schedule
   * @throws BadRequestException if validation fails
   */
  static validateCustomDays(customDays: DayOfWeek[]): void {
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
   * Validates that the provided frequency and custom days combination is valid.
   * For CUSTOM_DAYS frequency, ensures customDays are provided and valid.
   * @param frequency - The subscription frequency type
   * @param customDays - Optional array of days for custom frequency
   * @throws BadRequestException if validation fails
   */
  static validateFrequency(
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

  /**
   * Validates that a payment mode is supported.
   * @param paymentMode - Payment mode to validate
   * @returns True if the payment mode is valid, false otherwise
   */
  static validatePaymentMode(paymentMode: string): boolean {
    const validModes = ['UPFRONT', 'POST_DELIVERY'];
    return validModes.includes(paymentMode);
  }
}
