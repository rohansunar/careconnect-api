import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import type { User } from '../../common/interfaces/user.interface';
import { DeliveryFrequencyService } from './delivery-frequency.service';
import {
  DayOfWeek,
  SubscriptionFrequency,
} from '../interfaces/delivery-frequency.interface';
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

  async getSchedulableProduct(productId: string) {
    try {
      const product = await this.prisma.product.findFirst({
        where: { id: productId, is_schedulable: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found or cannot be subscribed');
      }

      if (product.subscription_price === null) {
        throw new BadRequestException(
          'Subscription price is not configured for this product',
        );
      }

      return product;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to validate product');
    }
  }

  validateDeliveryConfiguration(
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): void {
    this.deliveryFrequencyService.validateFrequency(frequency, customDays);
  }

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

    let product;
    try {
      product = await this.getSchedulableProduct(dto.productId);
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message],
      };
    }

    try {
      this.validateDeliveryConfiguration(dto.frequency, dto.custom_days);
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }

    return { isValid: true, customerAddress, product };
  }
}
