import { Injectable, ForbiddenException } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderNumberService } from './order-number.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import type { User } from '../../common/interfaces/user.interface';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class RiderOrderService extends OrderService {
  constructor(
    protected readonly prisma: PrismaService,
    cartService: CartService,
    orderNumberService: OrderNumberService,
  ) {
    super(prisma, cartService, orderNumberService);
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
}
