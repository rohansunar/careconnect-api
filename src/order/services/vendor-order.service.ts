import { Injectable, ForbiddenException } from '@nestjs/common';
import { OrderService } from './order.service';
import type { User } from '../../common/interfaces/user.interface';

@Injectable()
export class VendorOrderService extends OrderService {
  /**
   * Retrieves all orders for the authenticated vendor.
   * @param user - The authenticated vendor user
   * @returns Array of vendor's orders with relations
   */
  async getMyOrders(user: User) {
    const allOrders = await super.findAll();
    return allOrders.filter((order) => order.vendorId === user.id);
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
