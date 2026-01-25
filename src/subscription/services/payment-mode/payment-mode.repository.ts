import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PaymentModeRepository } from '../../interfaces/payment-mode.interface';

/**
 * File-based implementation of the PaymentModeRepository interface.
 * Handles persistence of payment mode configuration to JSON file.
 */
@Injectable()
export class JsonPaymentModeRepository implements PaymentModeRepository {
  private readonly configPath: string;

  constructor() {
    this.configPath = path.join(
      __dirname,
      '../../config/payment-mode.config.json',
    );
  }

  /**
   * Gets the current payment mode from the configuration file.
   * @returns Current payment mode
   * @throws InternalServerErrorException if the configuration file is missing or invalid
   */
  getPaymentMode(): string {
    try {
      const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      return config.payment_mode;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to load payment mode configuration',
      );
    }
  }

  /**
   * Sets the payment mode in the configuration file.
   * @param mode - Payment mode to set
   */
  setPaymentMode(mode: string): void {
    try {
      const config = { payment_mode: mode };
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to save payment mode configuration',
      );
    }
  }
}
