import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
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

  /**
   * Validates if a payment mode is supported.
   * Currently supports UPFRONT and POST_DELIVERY modes.
   * @param paymentMode - Payment mode to validate
   * @returns True if the payment mode is valid, false otherwise
   */
  validateMode(paymentMode: string): boolean {
    const validModes = ['UPFRONT', 'POST_DELIVERY'];
    return validModes.includes(paymentMode);
  }
}
