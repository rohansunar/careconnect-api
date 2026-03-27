import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { SubscriptionRepositoryService } from '../repositories/subscription.repository';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import {
  RecalculateSubscriptionPreviewDto,
} from '../dto/subscription-preview.dto';
import type { User } from '../../common/interfaces/user.interface';
import { DeliveryFrequencyService } from './delivery-frequency.service';
import { PriceCalculationService } from './price-calculation.service';
import { SubscriptionValidationService } from './subscription-validation.service';
import { PrismaService } from '../../common/database/prisma.service';
import {
  DayOfWeek,
  SubscriptionFrequency,
} from '../interfaces/delivery-frequency.interface';
import { PaymentProviderService } from '../../payment/services/payment-provider.service';
import { PaymentStatus, Prisma, Subscription } from '@prisma/client';
import { SubscriptionStatus } from '@prisma/client';
import { getTimezone } from '../../common/utils/timezone.utils';

// Define DELETED status constant since it may not be in generated client yet
const SUBSCRIPTION_DELETED_STATUS = 'DELETED' as SubscriptionStatus;

// Constants for magic strings
const ERROR_START_DATE_PAST = 'Start date cannot be in the past';

/**
 * Interface for paginated subscription response
 */
export interface PaginatedSubscriptionsResponse {
  subscriptions: Subscription[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecalculateSubscriptionPreviewResponse {
  productName: string;
  productImage: string | null;
  totalAmount: number;
  totalUnits: number;
  subscriptionPrice: number;
  frequency: SubscriptionFrequency;
  startDate: string;
  nextDeliveryDate: string;
  forMonth: string;
  totalDeliveries: number;
}

interface SubscriptionPreviewParams {
  productId: string;
  unit?: number;
  frequency?: SubscriptionFrequency;
  startDate?: Date;
  customDays?: DayOfWeek[];
  validationTimezone?: string;
}

interface ResolvedSubscriptionPreview {
  productName: string;
  productImage: string | null;
  unit: number;
  subscriptionPrice: number;
  frequency: SubscriptionFrequency;
  billingStartDate: Date;
  numberOfDeliveries: number;
  totalAmount: number;
  nextDeliveryDate: Date;
  startDate: Date;
}

/**
 * Service for managing customer subscription operations.
 * This service provides functionality for customers to create, view, update, and manage their subscriptions.
 */
@Injectable()
export class CustomerSubscriptionService {
  private readonly CURRENCY = 'INR';
  private readonly appTimezone = getTimezone();
  private readonly previewTimezone = 'Asia/Kolkata';
  constructor(
    private readonly subscriptionRepository: SubscriptionRepositoryService,
    private readonly deliveryFrequencyService: DeliveryFrequencyService,
    private readonly priceCalculationService: PriceCalculationService,
    private readonly subscriptionValidationService: SubscriptionValidationService,
    private paymentProvider: PaymentProviderService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Validates the start date to ensure it's not in the past.
   * @param startDate - The start date to validate
   * @private
   */
  private validateStartDate(startDate: Date, zone: string = this.appTimezone) {
    const subscriptionDate = DateTime.fromJSDate(startDate, {
      zone,
    }).startOf('day');
    const currentDate = DateTime.now().setZone(zone).startOf('day');

    if (subscriptionDate < currentDate) {
      throw new BadRequestException(ERROR_START_DATE_PAST);
    }
  }

  async calculateSubscriptionPreview(
    dto: RecalculateSubscriptionPreviewDto,
  ): Promise<RecalculateSubscriptionPreviewResponse> {
    const frequency = dto.frequency ?? SubscriptionFrequency.DAILY;
    const startDate = dto.start_date
      ? this.parseAppDate(dto.start_date, this.previewTimezone)
      : this.getTomorrowDate(this.previewTimezone);
    const preview = await this.buildSubscriptionPreview({
      productId: dto.productId,
      frequency,
      startDate,
      unit:dto.unit,
      customDays: dto.custom_days,
      validationTimezone: this.previewTimezone,
    });

    return this.toRecalculateSubscriptionPreviewResponse(preview);
  }

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

    const startDate = this.parseAppDate(dto.start_date);
    this.validateStartDate(startDate);
    const customDays = this.extractCustomDays(dto.frequency, dto.custom_days);
    const pricingBreakdown =
      this.priceCalculationService.calculatePricingBreakdown(
        dto.quantity,
        Number(product.subscription_price),
        dto.frequency,
        startDate,
        customDays,
      );
    const totalPrice = pricingBreakdown.totalPrice;
    const nextDeliveryDate = pricingBreakdown.nextDeliveryDate;

    let existingSubscription;
    try {
      existingSubscription =
        await this.subscriptionRepository.findByCustomerAndProduct(
          user.id,
          dto.productId,
        );
    } catch {
      throw new InternalServerErrorException(
        'Failed to check for duplicate subscription',
      );
    }

    if (existingSubscription && existingSubscription.length > 0) {
      throw new ConflictException(
        'A subscription for this product already exists for this address.',
      );
    }

    const createdSubscription = await this.subscriptionRepository.create({
      customerId: customerAddress.customerId,
      customerAddressId: customerAddress.id,
      productId: dto.productId,
      quantity: dto.quantity,
      priceSnapshot: Number(product.subscription_price),
      total_price: totalPrice,
      frequency: dto.frequency,
      customDays: customDays,
      startDate: startDate,
      nextDeliveryDate: nextDeliveryDate,
      status: 'PROCESSING',
    });

    const providerResponse = await this.paymentProvider.initiatePayment({
      amount: createdSubscription.subscription_price,
      currency: this.CURRENCY,
      orderId: createdSubscription.id,
      notes: { subscribeID: createdSubscription.id },
    });

    // Create payment record in database
    const payment = (await this.prisma.payment.create({
      data: {
        amount: createdSubscription.subscription_price,
        currency: this.CURRENCY,
        provider: providerResponse?.provider || undefined,
        provider_payment_id: providerResponse?.providerPaymentId || undefined,
        provider_payload: providerResponse?.payload || undefined,
        status: PaymentStatus.PENDING,
      },
    })) as { id: string };

    await this.prisma.subscription.update({
      where: { id: createdSubscription.id },
      data: { paymentId: payment.id },
    });

    return {
      id: createdSubscription.id,
      payment,
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
   * Uses customerId and status indexes for optimal query performance.
   * @param user - The authenticated customer user
   * @param page - Page number for pagination (default: 1)
   * @param limit - Number of items per page (default: 10)
   * @returns Object containing paginated subscriptions, total count, and pagination metadata
   * @throws BadRequestException if pagination parameters are invalid
   */
  async getMySubscriptions(
    user: User,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedSubscriptionsResponse> {
    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    // Build query using SubscriptionWhereInput for proper indexing
    // The customerId and status fields are indexed in the Prisma schema
    const query: Prisma.SubscriptionWhereInput = {
      customerId: user.id,
      status: { not: SUBSCRIPTION_DELETED_STATUS },
    };

    const skip = (validatedPage - 1) * validatedLimit;

    // Execute findMany with index-friendly query conditions
    const subscriptions = await this.prisma.subscription.findMany({
      where: query,
      skip,
      take: validatedLimit,
      include: {
        product: {
          select: { name: true, images: true },
        },
        customerAddress: {
          select: {
            label: true,
            address: true,
            pincode: true,
            location: { select: { name: true, state: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Count total matching records
    const total = await this.prisma.subscription.count({
      where: query,
    });

    return {
      subscriptions,
      total,
      page: validatedPage,
      limit: validatedLimit,
      totalPages: Math.ceil(total / validatedLimit),
    };
  }

  /**
   * Toggles the status of a subscription between ACTIVE and INACTIVE.
   * This allows customers to pause and resume their subscriptions.
   * @param id - The unique identifier of the subscription
   * @param user - The authenticated customer user
   * @returns The updated subscription
   * @throws NotFoundException if subscription is not found
   * @throws ForbiddenException if user doesn't own the subscription or subscription is suspended
   */
  async toggleSubscriptionStatus(id: string, user: User) {
    const subscription = await this.validateSubscriptionOwnership(id, user);

    // Check if subscription is suspended - cannot modify suspended subscriptions
    if (subscription.status === 'SUSPENDED') {
      throw new ForbiddenException(
        'Your subscription is currently suspended and cannot be modified at this time. Please contact support for assistance.',
      );
    }

    // Determine the new status based on current status
    const newStatus = subscription.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    // Prepare update data with new status
    const updateData: {
      status: 'ACTIVE' | 'INACTIVE';
      nextDeliveryDate?: Date;
    } = {
      status: newStatus,
    };

    // If reactivating subscription (INACTIVE -> ACTIVE), recalculate next delivery date
    // based on the current date and subscription frequency
    if (newStatus === 'ACTIVE' && subscription.status === 'INACTIVE') {
      const currentDate = new Date();
      const customDays = subscription.customDays || [];

      // Calculate the next delivery date using the delivery frequency service
      updateData.nextDeliveryDate =
        this.deliveryFrequencyService.getNextDeliveryDate(
          currentDate,
          subscription.frequency,
          customDays,
        );
    }

    return this.subscriptionRepository.update(id, updateData);
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
    await this.validateSubscriptionOwnership(id, user);
    return this.subscriptionRepository.delete(id);
  }

  /**
   * Validates subscription ownership by fetching the subscription, checking existence, and verifying ownership.
   * @param id - The unique identifier of the subscription
   * @param user - The authenticated customer user
   * @returns The subscription if valid
   * @throws NotFoundException if subscription is not found
   * @throws ForbiddenException if user doesn't own the subscription
   */
  private async validateSubscriptionOwnership(id: string, user: User) {
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

  private async buildSubscriptionPreview(
    params: SubscriptionPreviewParams,
  ): Promise<ResolvedSubscriptionPreview> {
    const unit = params.unit ?? 1;
    const frequency = params.frequency ?? SubscriptionFrequency.DAILY;
    const startDate = params.startDate ?? this.getTomorrowDate();
    const customDays = this.extractCustomDays(frequency, params.customDays);

    this.validateStartDate(
      startDate,
      params.validationTimezone ?? this.appTimezone,
    );
    this.subscriptionValidationService.validateDeliveryConfiguration(
      frequency,
      customDays,
    );

    const product =
      await this.subscriptionValidationService.getSchedulableProduct(
        params.productId,
      );
    const unitPrice = Number(product.subscription_price);
    const pricingBreakdown =
      this.priceCalculationService.calculatePricingBreakdown(
        unit,
        unitPrice,
        frequency,
        startDate,
        customDays,
      );

    return {
      productName: product.name,
      productImage: product.images[0] ?? null,
      unit,
      subscriptionPrice: unitPrice,
      frequency,
      billingStartDate: pricingBreakdown.billingStartDate,
      numberOfDeliveries: pricingBreakdown.deliveryCount,
      totalAmount: pricingBreakdown.totalPrice,
      nextDeliveryDate: pricingBreakdown.nextDeliveryDate,
      startDate,
    };
  }

  private toRecalculateSubscriptionPreviewResponse(
    preview: ResolvedSubscriptionPreview,
  ): RecalculateSubscriptionPreviewResponse {
    return {
      productName: preview.productName,
      productImage: preview.productImage,
      totalAmount: preview.totalAmount,
      totalUnits: preview.unit,
      subscriptionPrice: preview.subscriptionPrice,
      frequency: preview.frequency,
      startDate: this.formatDate(preview.startDate, this.previewTimezone),
      nextDeliveryDate: this.formatDate(
        preview.nextDeliveryDate,
        this.previewTimezone,
      ),
      forMonth: this.formatMonth(
        preview.billingStartDate,
        this.previewTimezone,
      ),
      totalDeliveries: preview.numberOfDeliveries,
    };
  }

  private parseAppDate(date: string, zone: string = this.appTimezone): Date {
    const parsedDate = DateTime.fromISO(date, {
      zone,
    }).startOf('day');

    if (!parsedDate.isValid) {
      throw new BadRequestException('Invalid start date');
    }

    return parsedDate.toJSDate();
  }

  private getTomorrowDate(zone: string = this.appTimezone): Date {
    return DateTime.now()
      .setZone(zone)
      .plus({ days: 1 })
      .startOf('day')
      .toJSDate();
  }

  private formatDate(date: Date, zone: string = this.appTimezone): string {
    return DateTime.fromJSDate(date, { zone }).toFormat('yyyy-MM-dd');
  }

  private formatMonth(date: Date, zone: string = this.appTimezone): string {
    return DateTime.fromJSDate(date, { zone }).toFormat('LLLL');
  }
}
