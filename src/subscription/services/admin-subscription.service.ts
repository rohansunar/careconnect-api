import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PaymentModeService } from './payment-mode.service';

/**
 * Service for managing administrative subscription operations.
 * This service provides functionality for administrators to manage payment modes
 * and other subscription-related configurations.
 */
@Injectable()
export class AdminSubscriptionService {
  private readonly logger = new Logger(AdminSubscriptionService.name);

  constructor(private readonly paymentModeService: PaymentModeService) {}

  /**
   * Toggles the default payment mode between UPFRONT and POST_DELIVERY.
   * This affects all new subscription creations.
   * @returns An object with a success message and the updated payment mode
   */
  async togglePaymentMode(): Promise<{
    message: string;
    payment_mode: string;
  }> {
    try {
      const newMode = this.paymentModeService.toggleMode();
      this.logger.log(`Payment mode toggled to ${newMode}`);
      return {
        message: 'Payment mode toggled successfully',
        payment_mode: newMode,
      };
    } catch (error) {
      this.logger.error(`Failed to toggle payment mode: ${error.message}`);
      throw new NotFoundException(
        'Failed to toggle payment mode configuration',
      );
    }
  }

  /**
   * Retrieves the current default payment mode.
   * @returns An object with the current payment mode
   */
  async getPaymentMode(): Promise<{ payment_mode: string }> {
    try {
      const currentMode = this.paymentModeService.getCurrentMode();
      this.logger.log(`Payment mode retrieved: ${currentMode}`);
      return { payment_mode: currentMode };
    } catch (error) {
      this.logger.error(`Failed to retrieve payment mode: ${error.message}`);
      throw new NotFoundException('Payment mode configuration not found');
    }
  }
}
