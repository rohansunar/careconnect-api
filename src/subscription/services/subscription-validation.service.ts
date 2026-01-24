import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import type { User } from '../../common/interfaces/user.interface';
import { DeliveryFrequencyService } from './delivery-frequency.service';

/**
 * Service responsible for validating input data for creating a subscription.
 */
@Injectable()
export class SubscriptionValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryFrequencyService: DeliveryFrequencyService,
  ) {}

  /**
   * Validates subscription inputs and retrieves related entities.
   * @param dto - Subscription data
   * @param user - Authenticated user
   * @returns Customer address and product
   * @throws NotFoundException if customer address or product is not found
   * @throws InternalServerErrorException if database operations fail
   */
  async validateSubscriptionInputs(
    dto: CreateSubscriptionDto,
    user: User,
  ): Promise<{ customerAddress: any; product: any }> {
    const customerAddress = await this.prisma.customerAddress.findFirst({
      where: { customerId: user.id, is_active: true, isDefault: true },
    });

    if (!customerAddress) {
      throw new NotFoundException('Customer Address not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId, is_schedulable:true },
    });

    if (!product) {
      throw new NotFoundException('Product not found or cannot be subscribed');
    }

    this.deliveryFrequencyService.validateFrequency(
      dto.frequency,
      dto.custom_days,
    );

    return { customerAddress, product };
  }
}
