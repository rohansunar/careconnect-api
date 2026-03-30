import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderNumberService } from './order-number.service';
import { PrismaService } from '../../common/database/prisma.service';
import type { User } from '../../common/interfaces/user.interface';
import { CancellationOrigin, OrderStatus } from '@prisma/client';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OTP_EXPIRATION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class RiderOrderService extends OrderService {
  constructor(
    protected readonly prisma: PrismaService,
    orderNumberService: OrderNumberService,
  ) {
    super(prisma, orderNumberService);
  }

  private buildIncludeQuery() {
    return {
      orderItems: {
        select: {
          id: true,
          price: true,
          quantity: true,
          product: { select: { name: true, categoryId: true } },
        },
      },
      address: {
        select: {
          address: true,
          pincode: true,
          location: {
            select: {
              name: true,
              state: true,
              country: true,
            },
          },
        },
      },
      payment: {
        select: {
          status: true,
        },
      },
    };
  }

  /**
   * Retrieves all orders assigned to the authenticated rider.
   * @param user - The authenticated rider user
   * @returns Array of rider's assigned orders with relations
   */
  async getAssignedOrders(user: User, page: number = 1, limit: number = 10) {
    // Validate and sanitize pagination parameters
    const sanitizedPage = typeof page === 'number' ? Math.max(1, page) : 1;
    const sanitizedLimit =
      typeof limit === 'number' ? Math.max(1, Math.min(100, limit)) : 10;
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const query = {
      riderId: user.id,
      delivery_status: OrderStatus.OUT_FOR_DELIVERY,
    };
    try {
      const include = this.buildIncludeQuery();
      const orders = await super.findAll(query, skip, sanitizedLimit, include);
      const total = await this.prisma.order.count({ where: query });

      return {
        orders,
        total,
        page: sanitizedPage,
        limit: sanitizedLimit,
        totalPages: Math.ceil(total / sanitizedLimit),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Updates an assigned order, ensuring it is assigned to the rider.
   * @param id - The unique identifier of the order
   * @param dto - The update data
   * @param user - The authenticated rider user
   * @returns The updated order with relations
   */
  async updateAssignedOrder(id: string, dto: any, user: User) {
    // First verify the order belongs to this rider
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { riderId: true },
    });

    if (!order || order.riderId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return super.update(id, dto);
  }

  /**
   * Verifies delivery OTP for the rider and marks the order as delivered.
   */
  async verifyDeliveryOtpForRider(orderId: string, otp: string, user: User) {
    if (!this.isValidUuid(orderId)) {
      throw new BadRequestException('Invalid order ID format');
    }
    if (!this.isValidOtp(otp)) {
      throw new BadRequestException('OTP must be exactly 4 digits');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { payment: true },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }
        if (order.riderId !== user.id) {
          throw new ForbiddenException('Access denied');
        }
        if (order.delivery_status === OrderStatus.PENDING) {
          throw new BadRequestException(
            'Order has not been marked for delivery yet',
          );
        }
        if (order.delivery_status === OrderStatus.DELIVERED) {
          throw new BadRequestException('Order has already been delivered');
        }
        if (!order.delivery_otp || order.delivery_otp !== otp) {
          throw new BadRequestException('Invalid OTP');
        }
        if (this.isOtpExpired(order.otp_generated_at)) {
          throw new BadRequestException('OTP has expired');
        }

        const updateData: Record<string, unknown> = {
          delivery_status: OrderStatus.DELIVERED,
          delivery_otp: null,
          otp_verified: true,
        };

        if (order.payment_mode === 'COD') {
          updateData.payment_status = 'PAID';
          if (order.paymentId && order.payment) {
            await tx.payment.update({
              where: { id: order.paymentId },
              data: { status: 'PAID', completed_at: new Date() },
            });
          }
        }

        await tx.order.update({
          where: { id: orderId },
          data: updateData,
        });
      });

      return { success: true };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to verify delivery OTP. Please try again.',
      );
    }
  }

  /**
   * Cancels an assigned order initiated by the rider.
   */
  async cancelAssignedOrder(
    orderId: string,
    cancelReason: string,
    user: User,
  ): Promise<{ success: boolean }> {
    if (!orderId) {
      throw new BadRequestException('Order ID is required');
    }
    if (!this.isValidUuid(orderId)) {
      throw new BadRequestException(
        'Invalid order ID format. Expected UUID format.',
      );
    }

    const trimmedReason = cancelReason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException('Cancellation reason is required');
    }
    if (trimmedReason.length > 500) {
      throw new BadRequestException(
        'Cancellation reason must not exceed 500 characters',
      );
    }

    const now = new Date();
    try {
      await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }
        if (order.riderId !== user.id) {
          throw new ForbiddenException('Access denied');
        }
        if (order.delivery_status === OrderStatus.DELIVERED) {
          throw new ConflictException(
            'Cannot cancel an order that has already been delivered',
          );
        }
        if (order.delivery_status === OrderStatus.CANCELLED) {
          throw new ConflictException('Order has already been cancelled');
        }

        await tx.order.update({
          where: { id: orderId },
          data: {
            cancellation_origin: CancellationOrigin.RIDER,
            delivery_status: OrderStatus.CANCELLED,
            cancelledAt: now,
            cancelReason: trimmedReason,
          },
        });
      });

      return { success: true };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to cancel order. Please try again.',
      );
    }
  }

  private isValidUuid(value: string): boolean {
    return UUID_REGEX.test(value);
  }

  private isValidOtp(otp: string): boolean {
    return /^\d{4}$/.test(otp);
  }

  private isOtpExpired(otpGeneratedAt: Date | null): boolean {
    if (!otpGeneratedAt) {
      return true;
    }
    const expirationTime = new Date(
      otpGeneratedAt.getTime() + OTP_EXPIRATION_MS,
    );
    return new Date() > expirationTime;
  }
}
