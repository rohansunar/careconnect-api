/**
 * Interface defining the contract for payment mode repository.
 * This abstraction layer handles persistence of payment mode configuration.
 */
export interface PaymentModeRepository {
  /**
   * Gets the current payment mode from storage.
   * @returns Current payment mode
   */
  getPaymentMode(): string;

  /**
   * Sets the payment mode in storage.
   * @param mode - Payment mode to set
   */
  setPaymentMode(mode: string): void;
}

/**
 * Interface defining the contract for payment mode service.
 * This service handles business logic for payment mode management.
 */
export interface PaymentModeService {
  /**
   * Gets the current payment mode.
   * @returns Current payment mode
   */
  getCurrentMode(): string;

  /**
   * Toggles the payment mode between available options.
   * @returns Updated payment mode
   */
  toggleMode(): string;

  /**
   * Validates if a payment mode is supported.
   * @param mode - Payment mode to validate
   * @returns True if valid, false otherwise
   */
  validateMode(mode: string): boolean;
}
