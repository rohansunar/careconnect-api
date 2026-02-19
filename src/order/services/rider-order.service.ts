import { Injectable, ForbiddenException } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderNumberService } from './order-number.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import type { User } from '../../common/interfaces/user.interface';

@Injectable()
export class RiderOrderService extends OrderService {
  constructor(
    protected readonly prisma: PrismaService,
    cartService: CartService,
    orderNumberService: OrderNumberService,
  ) {
    super(prisma, cartService, orderNumberService);
  }

  /**
   * Retrieves all orders assigned to the authenticated rider.
   * @param user - The authenticated rider user
   * @returns Array of rider's assigned orders with relations
   */
  async getAssignedOrders(user: User) {
    return this.prisma.order.findMany({
      where: { riderId: user.id },
      include: {
        customer: true,
        vendor: true,
        address: { include: { location: true } },
        cart: {
          include: {
            cartItems: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
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
