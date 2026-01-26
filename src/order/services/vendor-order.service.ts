import { Injectable, ForbiddenException } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderNumberService } from './order-number.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import type { User } from '../../common/interfaces/user.interface';

@Injectable()
export class VendorOrderService extends OrderService {
  constructor(
    prisma: PrismaService,
    cartService: CartService,
    orderNumberService: OrderNumberService,
  ) {
    super(prisma, cartService, orderNumberService);
  }
  /**
   * Retrieves paginated orders for the authenticated vendor.
   * @param user - The authenticated vendor user
   * @param page - The page number (default: 1)
   * @param limit - The number of orders per page (default: 10)
   * @returns Object with orders array and total count
   */
  async getMyOrders(user: User, page: number = 1, limit: number = 10) {
    const query = { vendorId: user.id };
    const orders = await super.findAll(query, 0, undefined, { address: true });
    const total = await this.prisma.order.count({ where: query });
    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Retrieves a single order by ID, ensuring it belongs to the vendor.
   * @param id - The unique identifier of the order
   * @param user - The authenticated vendor user
   * @returns The order with relations
   */
  async getMyOrder(id: string, user: User) {
    const order = await super.findOne(id);
    if (order.vendorId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return order;
  }

  /**
   * Updates an order, ensuring it belongs to the vendor.
   * @param id - The unique identifier of the order
   * @param dto - The update data
   * @param user - The authenticated vendor user
   * @returns The updated order with relations
   */
  async updateMyOrder(id: string, dto: any, user: User) {
    const order = await super.findOne(id);
    if (order.vendorId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return super.update(id, dto);
  }
}
