import { Injectable } from '@nestjs/common';
import { OrderService } from './order.service';

@Injectable()
export class AdminOrderService extends OrderService {
  /**
   * Retrieves all orders for admin.
   * @returns Array of all orders with relations
   */
  async getAllOrders() {
    return super.findAll();
  }

  /**
   * Retrieves a single order by ID for admin.
   * @param id - The unique identifier of the order
   * @returns The order with relations
   */
  async getOrder(id: string) {
    return super.findOne(id);
  }

  /**
   * Updates an order for admin.
   * @param id - The unique identifier of the order
   * @param dto - The update data
   * @returns The updated order with relations
   */
  async updateOrder(id: string, dto: any) {
    return super.update(id, dto);
  }
}
