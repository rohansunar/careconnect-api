import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PaymentModeRepository } from '../../interfaces/payment-mode.interface';

/**
 * Default payment mode configuration
 */
const DEFAULT_PAYMENT_MODE = 'UPFRONT';

/**
 * File-based implementation of the PaymentModeRepository interface.
 * Handles persistence of payment mode configuration to JSON file.
 */
@Injectable()
export class JsonPaymentModeRepository implements PaymentModeRepository {
  private readonly configPath: string;
  private readonly configDir: string;

  constructor() {
    this.configDir = path.join(__dirname, '../../config');
    this.configPath = path.join(this.configDir, 'payment-mode.config.json');
    this.ensureConfigurationExists();
  }

  /**
   * Ensures the configuration directory and file exist.
   * Creates them with default data if they don't exist.
   * @throws InternalServerErrorException if file operations fail
   */
  private ensureConfigurationExists(): void {
    try {
      // Check if directory exists, create if not
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      // Check if file exists, create with default data if not
      if (!fs.existsSync(this.configPath)) {
        const defaultConfig = { payment_mode: DEFAULT_PAYMENT_MODE };
        fs.writeFileSync(
          this.configPath,
          JSON.stringify(defaultConfig, null, 2),
          'utf8',
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to initialize payment mode configuration: ${errorMessage}`,
      );
    }
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to load payment mode configuration: ${errorMessage}`,
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to save payment mode configuration: ${errorMessage}`,
      );
    }
  }
}
