import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CustomerOrderService } from '../services/customer-order.service';
import { CancelOrderDto } from '../dto/cancel-order.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { CustomerAuthGuard } from '../../auth/guards/customer-auth.guard';

@ApiTags('Customer Orders')
@Controller('customer/orders')
@UseGuards(CustomerAuthGuard)
export class CustomerOrderController {
  constructor(private readonly customerOrderService: CustomerOrderService) {}

  /**
   * Retrieves all orders for the authenticated customer.
   * @param user - The authenticated customer user
   * @returns Array of customer's orders
   */
  @ApiOperation({
    summary: 'Get my orders',
    description:
      'Retrieves a list of all orders for the authenticated customer.',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully.',
  })
  @Get()
  async getMyOrders(@CurrentUser() user: User) {
    return this.customerOrderService.getMyOrders(user);
  }

  /**
   * Retrieves a single order by ID for the authenticated customer.
   * @param id - The unique identifier of the order
   * @param user - The authenticated customer user
   * @returns The order
   */
  @ApiOperation({
    summary: 'Get my order by ID',
    description:
      'Retrieves a single order by its ID, ensuring it belongs to the authenticated customer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the order (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Order retrieved successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - order does not belong to customer.',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found.',
  })
  @Get(':id')
  async getMyOrder(@Param('id') id: string, @CurrentUser() user: User) {
    return this.customerOrderService.getMyOrder(id, user);
  }

  /**
   * Cancels an order for the authenticated customer.
   * @param orderId - The unique identifier of the order
   * @param dto - The cancellation data
   * @param user - The authenticated customer user
   * @returns The cancelled order
   */
  @ApiOperation({
    summary: 'Cancel my order',
    description: 'Cancels an order that belongs to the authenticated customer.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Unique identifier of the order (UUID)',
  })
  @ApiBody({
    type: CancelOrderDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - order does not belong to customer.',
  })
  @Post(':orderId/cancel')
  async cancelMyOrder(
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.customerOrderService.cancelMyOrder(orderId, dto, user);
  }
}
