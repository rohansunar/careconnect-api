import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import type { User } from '../../common/interfaces/user.interface';
import { DeliveryFrequencyService } from './delivery-frequency.service';
import { PriceCalculationService } from './price-calculation.service';
import { PaymentModeService } from './payment-mode.service';
import { SubscriptionValidationService } from './subscription-validation.service';
import {
  DayOfWeek,
  SubscriptionFrequency,
} from '../interfaces/delivery-frequency.interface';

@Injectable()
export class CustomerSubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryFrequencyService: DeliveryFrequencyService,
    private readonly priceCalculationService: PriceCalculationService,
    private readonly paymentModeService: PaymentModeService,
    private readonly subscriptionValidationService: SubscriptionValidationService,
  ) {}

  /**
   * Creates a new subscription for the authenticated customer.
   * @param user - The authenticated customer user
   * @param dto - The subscription data
   * @returns The created subscription with calculated total price and payment mode
   */
  async createSubscription(user: User, dto: CreateSubscriptionDto) {
    const { customerAddress, product } =
      await this.subscriptionValidationService.validateSubscriptionInputs(
        dto,
        user,
      );

    const customDays =
      dto.frequency === SubscriptionFrequency.CUSTOM_DAYS
        ? dto.custom_days
        : [];
    const nextDeliveryDate = this.deliveryFrequencyService.getNextDeliveryDate(
      new Date(dto.start_date),
      dto.frequency,
      customDays,
    );

    const totalPrice = this.priceCalculationService.calculateTotalPrice(
      dto.quantity,
      product.price,
      dto.frequency,
      new Date(dto.start_date),
    );

    const paymentMode = this.paymentModeService.getPaymentMode();

    let hasDuplicate;
    try {
      hasDuplicate = await this.prisma.subscription.findFirst({
        where: {
          customerAddressId: customerAddress.id,
          productId: dto.productId,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to check for duplicate subscription',
      );
    }

    if (hasDuplicate) {
      throw new ConflictException(
        'A subscription for this product already exists for this customer address.',
      );
    }

    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: user.id },
        select: {
          name: true,
          email: true,
          phone: true,
        },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      const createdSubscription = await this.prisma.subscription.create({
        data: {
          customerAddressId: customerAddress.id,
          vendorId: product.vendorId,
          productId: dto.productId,
          quantity: dto.quantity,
          frequency: dto.frequency,
          custom_days: customDays as any,
          next_delivery_date: nextDeliveryDate,
          start_date: new Date(dto.start_date),
          total_price: totalPrice,
          payment_mode: paymentMode,
        },
      });

      return {
        id: "createdSubscription.id",
        total_price: "createdSubscription.total_price",
        payment_mode: paymentMode,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  /**
   * Retrieves all subscriptions for the authenticated customer.
   * @param user - The authenticated customer user
   * @param status - Optional status filter, can be string or array of strings
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @returns Array of customer's subscriptions with relations
   */
  async getMySubscriptions(
    user: User,
    status?: string[],
    page: number = 1,
    limit: number = 10,
  ) {
    const query = {
      customerAddress: {
        customerId: user.id,
        isDefault: true,
      },
    };
    const skip = (page - 1) * limit;
    const subscriptions = await this.prisma.subscription.findMany({
      where: query,
      include: {
        customerAddress: true,
        product: true,
      },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    });
    const total = await this.prisma.subscription.count({ where: query });
    return {
      subscriptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves a single subscription by ID, ensuring it belongs to the customer.
   * @param id - The unique identifier of the subscription
   * @param user - The authenticated customer user
   * @returns The subscription with relations
   */
  async getMySubscription(id: string, user: User) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { customerAddress: true },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (subscription.customerAddress?.customerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return subscription;
  }

  /**
   * Updates a subscription, ensuring it belongs to the customer.
   * @param id - The unique identifier of the subscription
   * @param dto - The subscription data
   * @param user - The authenticated customer user
   * @returns The updated subscription
   */
  async updateMySubscription(
    id: string,
    dto: UpdateSubscriptionDto,
    user: User,
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { customerAddress: true },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (subscription.customerAddress?.customerId !== user.id) {
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

      const customDays =
        dto.frequency === SubscriptionFrequency.CUSTOM_DAYS
          ? dto.custom_days
          : [];
      updateData.custom_days = customDays;

      const nextDeliveryDate =
        this.deliveryFrequencyService.getNextDeliveryDate(
          subscription.start_date,
          dto.frequency,
          customDays,
        );
      updateData.next_delivery_date = nextDeliveryDate;
    }
    if (dto.start_date !== undefined) {
      updateData.start_date = new Date(dto.start_date);
    }
    return this.prisma.subscription.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Toggles the status of a subscription between ACTIVE and INACTIVE.
   * @param id - The unique identifier of the subscription
   * @param user - The authenticated customer user
   * @param action - The action to perform (pause or resume)
   * @returns The updated subscription
   */
  async toggleSubscriptionStatus(id: string, user: User) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { customerAddress: true },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (subscription.customerAddress?.customerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    const newStatus = subscription.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: newStatus,
      },
    });
  }

  /**
   * Deletes a subscription, ensuring it belongs to the customer.
   * @param id - The unique identifier of the subscription
   * @param user - The authenticated customer user
   * @returns The deleted subscription
   */
  async deleteMySubscription(id: string, user: User) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { customerAddress: true },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (subscription.customerAddress?.customerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return this.prisma.subscription.delete({
      where: { id },
    });
  }
}
