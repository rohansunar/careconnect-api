import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service responsible for reading and validating the payment mode configuration.
 */
@Injectable()
export class PaymentModeService {
  private paymentMode: string;

  constructor() {
    this.loadPaymentMode();
  }

  /**
   * Loads the payment mode from the configuration file.
   * @throws InternalServerErrorException if the configuration file is missing or invalid
   */
  private loadPaymentMode(): void {
    try {
      const configPath = path.join(
        __dirname,
        '../config/payment-mode.config.json',
      );
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      this.paymentMode = config.payment_mode;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to load payment mode configuration',
      );
    }
  }

  /**
   * Gets the current payment mode.
   * @returns Payment mode (e.g., UPFRONT, MONTHLY)
   */
  getPaymentMode(): string {
    return this.paymentMode;
  }

  /**
   * Validates if a payment mode is supported.
   * @param paymentMode - Payment mode to validate
   * @returns True if the payment mode is valid, false otherwise
   */
  validatePaymentMode(paymentMode: string): boolean {
    const validModes = ['UPFRONT', 'POST_DELIVERY'];
    return validModes.includes(paymentMode);
  }
}
