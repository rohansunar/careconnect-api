import { Injectable, ForbiddenException } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderNumberService } from './order-number.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import type { User } from '../../common/interfaces/user.interface';

@Injectable()
export class RiderOrderService extends OrderService {
  constructor(
    prisma: PrismaService,
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
    const allOrders = await super.findAll();
    return allOrders.filter(
      (order) => order.assigned_rider_phone === user.phone,
    );
  }

  /**
   * Retrieves a single assigned order by ID, ensuring it is assigned to the rider.
   * @param id - The unique identifier of the order
   * @param user - The authenticated rider user
   * @returns The order with relations
   */
  async getAssignedOrder(id: string, user: User) {
    const order = await super.findOne(id);
    if (order.assigned_rider_phone !== user.phone) {
      throw new ForbiddenException('Access denied');
    }
    return order;
  }

  /**
   * Updates an assigned order, ensuring it is assigned to the rider.
   * @param id - The unique identifier of the order
   * @param dto - The update data
   * @param user - The authenticated rider user
   * @returns The updated order with relations
   */
  async updateAssignedOrder(id: string, dto: any, user: User) {
    const order = await super.findOne(id);
    if (order.assigned_rider_phone !== user.phone) {
      throw new ForbiddenException('Access denied');
    }
    return super.update(id, dto);
  }
}
