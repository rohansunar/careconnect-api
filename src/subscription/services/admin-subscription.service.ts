import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AdminSubscriptionService {
  private readonly configPath: string;
  private readonly logger = new Logger(AdminSubscriptionService.name);

  constructor() {
    this.configPath = path.join(
      __dirname,
      '..',
      'config',
      'payment-mode.config.json',
    );
  }

  /**
   * 
   * Toggles the default payment mode (UPFRONT|POST_DELIVERY) for all subscription creations.
   * @returns An object with a success message and the updated payment mode
   * @throws NotFoundException if the config file is not found or invalid
   */
  async togglePaymentMode(): Promise<{
    message: string;
    payment_mode: string;
  }> {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(configData);
      const currentMode = config.payment_mode;
      const newMode = currentMode === 'UPFRONT' ? 'POST_DELIVERY' : 'UPFRONT';
      const updatedConfig = { payment_mode: newMode };
      fs.writeFileSync(this.configPath, JSON.stringify(updatedConfig, null, 2));
      this.logger.log(`Payment mode toggled from ${currentMode} to ${newMode}`);
      return {
        message: 'Payment mode toggled successfully',
        payment_mode: newMode,
      };
    } catch (error) {
      console.log("error.code",error.code)
      this.logger.error(`Failed to toggle payment mode: ${error.message}`);
      if (error.code === 'ENOENT') {
        throw new NotFoundException(
          'Payment mode configuration file not found',
        );
      } else if (error instanceof SyntaxError) {
        throw new NotFoundException(
          'Payment mode configuration file is corrupted',
        );
      } else {
        throw new NotFoundException(
          'Failed to toggle payment mode configuration',
        );
      }
    }
  }

  /**
  * Retrieves the current default payment mode.
  * @returns An object with the current payment mode
  * @throws NotFoundException if the config file is not found or invalid
  */
  async getPaymentMode(): Promise<{ payment_mode: string }> {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(configData);
      this.logger.log(`Payment mode retrieved: ${config.payment_mode}`);
      return { payment_mode: config.payment_mode };
    } catch (error) {
      if (error.code === 'ENOENT') {
        try {
          const directoryPath = path.dirname(this.configPath);
          if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
            this.logger.log(`Created directory structure at ${directoryPath}`);
          }
          const defaultConfig = { payment_mode: 'UPFRONT' };
          fs.writeFileSync(
            this.configPath,
            JSON.stringify(defaultConfig, null, 2),
          );
          this.logger.log(
            'Created default payment mode configuration with UPFRONT',
          );
          return defaultConfig;
        } catch (fileError) {
          this.logger.error(`Failed to create payment mode configuration: ${fileError.message}`);
          throw new NotFoundException(
            'Failed to create payment mode configuration',
          );
        }
      } else if (error instanceof SyntaxError) {
        this.logger.error('Payment mode configuration file is corrupted');
        throw new NotFoundException(
          'Payment mode configuration file is corrupted',
        );
      } else {
        this.logger.error(`Failed to retrieve payment mode: ${error.message}`);
        throw new NotFoundException('Payment mode configuration not found');
      }
    }
  }
}
