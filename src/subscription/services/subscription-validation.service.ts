import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import type { User } from '../../common/interfaces/user.interface';
import { DeliveryFrequencyService } from './delivery-frequency.service';
import {
  SubscriptionValidator,
  ValidationResult,
} from '../interfaces/subscription-validation.interface';

/**
 * Service responsible for validating input data for creating a subscription.
 * This service ensures that all required entities exist and are valid before subscription creation.
 */
@Injectable()
export class SubscriptionValidationService implements SubscriptionValidator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryFrequencyService: DeliveryFrequencyService,
  ) {}

  /**
   * Validates subscription inputs and retrieves related entities.
   * Performs the following validations:
   * 1. Ensures a default active customer address exists
   * 2. Verifies the product exists and is subscribable
   * 3. Validates the delivery frequency and custom days
   * @param dto - Subscription data transfer object
   * @param user - Authenticated user making the request
   * @returns Object containing validated customer address and product
   * @throws NotFoundException if customer address or product is not found
   * @throws InternalServerErrorException if database operations fail
   */
  async validateInputs(
    dto: CreateSubscriptionDto,
    user: User,
  ): Promise<ValidationResult> {
    const customerAddress = await this.prisma.customerAddress.findFirst({
      where: { customerId: user.id, is_active: true, isDefault: true },
      include: { customer: true },
    });

    if (!customerAddress) {
      return { isValid: false, errors: ['Customer Address not found'] };
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId, is_schedulable: true },
    });

    if (!product) {
      return {
        isValid: false,
        errors: ['Product not found or cannot be subscribed'],
      };
    }

    try {
      this.deliveryFrequencyService.validateFrequency(
        dto.frequency,
        dto.custom_days,
      );
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }

    return { isValid: true, customerAddress, product };
  }
}
