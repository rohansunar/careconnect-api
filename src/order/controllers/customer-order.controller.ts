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
import { CreateOrderFromCartDto } from '../dto/create-order-from-cart.dto';
import { GetMyOrdersQueryDto } from '../dto/get-my-orders-query.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Customer Orders')
@Controller('customer/orders')
@Roles('customer')
export class CustomerOrderController {
  constructor(private readonly customerOrderService: CustomerOrderService) {}

  /**
   * Creates a new order from an existing cart.
   * This endpoint handles the complete order creation workflow including
   * validation, inventory reservation, and order persistence.
   * @param dto - The order creation data containing cartId and paymentMode
   * @param user - The authenticated customer user
   * @returns The created order with payment details
   */
  @ApiOperation({
    summary: 'Create order from cart',
    description:
      "Creates a new order from the authenticated customer's cart. " +
      'Validates cart items, calculates totals, initiates payment (if ONLINE), ' +
      'and creates the order record with appropriate status management.',
  })
  @ApiBody({ type: CreateOrderFromCartDto })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - invalid data, empty cart, or validation errors.',
  })
  @ApiResponse({
    status: 404,
    description: 'Cart not found.',
  })
  @Post()
  async createOrder(
    @Body() dto: CreateOrderFromCartDto,
    @CurrentUser() user: User,
  ) {
    return this.customerOrderService.createOrderFromCart(dto, user);
  }

  /**
   * Retrieves all orders for the authenticated customer with optional filtering.
   * @param user - The authenticated customer user
   * @param query - Query parameters including delivery_status filter and pagination
   * @returns Array of customer's orders
   */
  @ApiOperation({
    summary: 'Get my orders',
    description:
      'Retrieves a list of orders for the authenticated customer, with optional status filtering and pagination.',
  })
  @ApiQuery({
    name: 'delivery_status',
    required: false,
    schema: {
      type: 'array',
      items: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] },
      default: ['PENDING', 'OUT_FOR_DELIVERY'],
    },
    description:
      'Filter by order delivery status(es). Can be a single status or comma-separated string of valid statuses.',
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
  @ApiResponse({
    status: 400,
    description:
      'Bad request - invalid delivery_status value. Valid values are: PENDING, CONFIRMED, PROCESSING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED.',
  })
  @Get()
  async getMyOrders(
    @CurrentUser() user: User,
    @Query() query: GetMyOrdersQueryDto,
  ) {
    const pageNum = query.page ? parseInt(query.page, 10) : 1;
    const limitNum = query.limit ? parseInt(query.limit, 10) : 10;
    return this.customerOrderService.getMyOrders(
      user,
      query.delivery_status,
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
