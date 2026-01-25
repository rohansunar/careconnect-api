/**
 * Interface defining the contract for subscription validation.
 * This service validates subscription creation inputs.
 */
export interface SubscriptionValidator {
  /**
   * Validates subscription creation inputs.
   * @param dto - Subscription creation data transfer object
   * @param user - User creating the subscription
   * @returns Validation result
   */
  validateInputs(
    dto: CreateSubscriptionDto,
    user: User,
  ): Promise<ValidationResult>;
}

import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { User } from '../../common/interfaces/user.interface';

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}
