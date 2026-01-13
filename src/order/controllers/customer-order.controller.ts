import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
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
   * Retrieves all orders for the authenticated customer with optional filtering.
   * @param user - The authenticated customer user
   * @param status - Optional status filter (string or array)
   * @param page - Page number for pagination (default 1)
   * @param limit - Number of items per page (default 10)
   * @returns Array of customer's orders
   */
  @ApiOperation({
    summary: 'Get my orders',
    description:
      'Retrieves a list of orders for the authenticated customer, with optional status filtering and pagination.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    schema: {
      type: 'array',
      items: { type: 'string' },
      default: ['PENDING', 'OUT_FOR_DELIVERY'],
    },
    description:
      'Filter by order status(es). Can be a single status or comma-separated string.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    schema: { type: 'integer', default: 1 },
    description: 'Page number for pagination.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: { type: 'integer', default: 10 },
    description: 'Number of items per page.',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully.',
  })
  @Get()
  async getMyOrders(
    @CurrentUser() user: User,
    @Query('status') status?: string | string[],
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const statuses = status
      ? Array.isArray(status)
        ? status
        : status.split(',').map((s) => s.trim())
      : undefined;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.customerOrderService.getMyOrders(
      user,
      statuses,
      pageNum,
      limitNum,
    );
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
