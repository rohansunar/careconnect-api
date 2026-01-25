import { Injectable } from '@nestjs/common';
import { PaymentModeService as IPaymentModeService } from '../interfaces/payment-mode.interface';
import { JsonPaymentModeRepository } from './payment-mode/payment-mode.repository';

/**
 * Service responsible for reading and validating the payment mode configuration.
 * This service manages the default payment mode for subscriptions (UPFRONT or POST_DELIVERY).
 */
@Injectable()
export class PaymentModeService implements IPaymentModeService {
  constructor(
    private readonly paymentModeRepository: JsonPaymentModeRepository,
  ) {}

  /**
   * Gets the current payment mode.
   * @returns Payment mode (e.g., UPFRONT, POST_DELIVERY)
   */
  getCurrentMode(): string {
    return this.paymentModeRepository.getPaymentMode();
  }

  /**
   * Toggles the payment mode between available options.
   * @returns Updated payment mode
   */
  toggleMode(): string {
    const currentMode = this.getCurrentMode();
    const newMode = currentMode === 'UPFRONT' ? 'POST_DELIVERY' : 'UPFRONT';
    this.paymentModeRepository.setPaymentMode(newMode);
    return newMode;
  }
}
