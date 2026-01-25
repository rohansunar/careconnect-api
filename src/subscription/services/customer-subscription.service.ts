import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionRepositoryService } from '../repositories/subscription.repository';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import type { User } from '../../common/interfaces/user.interface';
import { DeliveryFrequencyService } from './delivery-frequency.service';
import { PriceCalculationService } from './price-calculation.service';
import { PaymentModeService } from './payment-mode.service';
import { SubscriptionValidationService } from './subscription-validation.service';
import { PrismaService } from '../../common/database/prisma.service';
import {
  DayOfWeek,
  SubscriptionFrequency,
} from '../interfaces/delivery-frequency.interface';

/**
 * Service for managing customer subscription operations.
 * This service provides functionality for customers to create, view, update, and manage their subscriptions.
 */
@Injectable()
export class CustomerSubscriptionService {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepositoryService,
    private readonly deliveryFrequencyService: DeliveryFrequencyService,
    private readonly priceCalculationService: PriceCalculationService,
    private readonly paymentModeService: PaymentModeService,
    private readonly subscriptionValidationService: SubscriptionValidationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Creates a new subscription for the authenticated customer.
   * This method performs the following operations:
   * 1. Validates subscription inputs
   * 2. Calculates the next delivery date based on frequency
   * 3. Computes the total price for the subscription
   * 4. Checks for duplicate subscriptions
   * 5. Creates the subscription record
   * @param user - The authenticated customer user
   * @param dto - The subscription data transfer object
   * @returns Object containing subscription ID, total price, payment mode, and customer details
   * @throws ConflictException if a duplicate subscription exists
   * @throws NotFoundException if customer is not found
   * @throws InternalServerErrorException if database operations fail
   */
  async createSubscription(user: User, dto: CreateSubscriptionDto) {
    const validationResult =
      await this.subscriptionValidationService.validateInputs(dto, user);

    if (!validationResult.isValid) {
      throw new NotFoundException(
        validationResult.errors?.join(', ') || 'Validation failed',
      );
    }

    const customerAddress = validationResult.customerAddress!;
    const product = validationResult.product!;

    const startDate = new Date(dto.start_date);
    const currentDate = new Date();
    if (startDate.setHours(0, 0, 0, 0) < currentDate.setHours(0, 0, 0, 0)) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    const customDays = this.extractCustomDays(dto.frequency, dto.custom_days);
    const nextDeliveryDate = this.deliveryFrequencyService.getNextDeliveryDate(
      startDate,
      dto.frequency,
      customDays,
    );

    const totalPrice = this.priceCalculationService.calculateTotalPrice(
      dto.quantity,
      Number(product.price),
      dto.frequency,
      startDate,
      customDays,
    );

    const paymentMode = this.paymentModeService.getCurrentMode();

    let existingSubscription;
    try {
      existingSubscription =
        await this.subscriptionRepository.findByCustomerAndProduct(
          user.id,
          dto.productId,
        );
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to check for duplicate subscription',
      );
    }

    if (existingSubscription && existingSubscription.length > 0) {
      throw new ConflictException(
        'A subscription for this product already exists for this customer address.',
      );
    }

    const createdSubscription = await this.subscriptionRepository.create({
      customerId: customerAddress.id,
      productId: dto.productId,
      quantity: dto.quantity,
      price: totalPrice,
      frequency: dto.frequency,
      customDays: customDays,
      startDate: startDate,
      nextDeliveryDate: nextDeliveryDate,
      status: 'PROCESSING',
    });

    return {
      id: createdSubscription.id,
      total_price: createdSubscription.price,
      payment_mode: paymentMode,
      customer: {
        name: customerAddress.customer.name,
        email: customerAddress.customer.email,
        phone: customerAddress.customer.phone,
      },
    };
  }

  /**
   * Retrieves all subscriptions for the authenticated customer.
   * Supports pagination and filtering by status.
   * @param user - The authenticated customer user
   * @param status - Optional status filter, can be string or array of strings
   * @param page - Page number for pagination (default: 1)
   * @param limit - Number of items per page (default: 10)
   * @returns Object containing paginated subscriptions, total count, and pagination metadata
   */
  async getMySubscriptions(
    user: User,
    status?: string[],
    page: number = 1,
    limit: number = 10,
  ) {
    const subscriptions =
      await this.subscriptionRepository.findByCustomerAndProduct(user.id, '');
    const skip = (page - 1) * limit;
    const paginatedSubscriptions = subscriptions.slice(skip, skip + limit);
    const total = subscriptions.length;
    return {
      subscriptions: paginatedSubscriptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves a single subscription by ID, ensuring it belongs to the customer.
   * Performs ownership validation to prevent unauthorized access.
   * @param id - The unique identifier of the subscription
   * @param user - The authenticated customer user
   * @returns The subscription with relations
   * @throws NotFoundException if subscription is not found
   * @throws ForbiddenException if user doesn't own the subscription
   */
  async getMySubscription(id: string, user: User) {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (subscription.customerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return subscription;
  }

  /**
   * Updates a subscription, ensuring it belongs to the customer.
   * Supports updating quantity, frequency, custom days, and start date.
   * @param id - The unique identifier of the subscription
   * @param dto - The subscription data transfer object
   * @param user - The authenticated customer user
   * @returns The updated subscription
   * @throws NotFoundException if subscription is not found
   * @throws ForbiddenException if user doesn't own the subscription
   */
  async updateMySubscription(
    id: string,
    dto: UpdateSubscriptionDto,
    user: User,
  ) {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (subscription.customerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    const updateData: any = {};
    if (dto.quantity !== undefined) {
      updateData.quantity = dto.quantity;
    }
    if (dto.frequency !== undefined) {
      this.deliveryFrequencyService.validateFrequency(
        dto.frequency,
        dto.custom_days,
      );
      updateData.frequency = dto.frequency;

      const customDays = this.extractCustomDays(dto.frequency, dto.custom_days);
      updateData.customDays = customDays;

      const nextDeliveryDate =
        this.deliveryFrequencyService.getNextDeliveryDate(
          subscription.startDate,
          dto.frequency,
          customDays,
        );
      updateData.startDate = nextDeliveryDate;
    }
    if (dto.start_date !== undefined) {
      updateData.startDate = new Date(dto.start_date);
    }
    return this.subscriptionRepository.update(id, updateData);
  }

  /**
   * Toggles the status of a subscription between ACTIVE and INACTIVE.
   * This allows customers to pause and resume their subscriptions.
   * @param id - The unique identifier of the subscription
   * @param user - The authenticated customer user
   * @returns The updated subscription
   * @throws NotFoundException if subscription is not found
   * @throws ForbiddenException if user doesn't own the subscription
   */
  async toggleSubscriptionStatus(id: string, user: User) {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (subscription.customerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    const newStatus = subscription.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.subscriptionRepository.update(id, { status: newStatus });
  }

  /**
   * Deletes a subscription, ensuring it belongs to the customer.
   * Performs ownership validation before deletion.
   * @param id - The unique identifier of the subscription
   * @param user - The authenticated customer user
   * @returns The deleted subscription
   * @throws NotFoundException if subscription is not found
   * @throws ForbiddenException if user doesn't own the subscription
   */
  async deleteMySubscription(id: string, user: User) {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (subscription.customerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return this.subscriptionRepository.delete(id);
  }

  /**
   * Extracts custom days based on frequency.
   * @param frequency - The subscription frequency
   * @param customDays - Optional custom days array
   * @returns Array of custom days or empty array
   */
  private extractCustomDays(
    frequency: SubscriptionFrequency,
    customDays?: DayOfWeek[],
  ): DayOfWeek[] {
    return frequency === SubscriptionFrequency.CUSTOM_DAYS
      ? customDays || []
      : [];
  }
}
