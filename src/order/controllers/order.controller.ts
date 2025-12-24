import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { OrderService } from '../services/order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { CancelOrderDto } from '../dto/cancel-order.dto';
import { CancelOrderResponseDto } from '../dto/cancel-order-response.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { CustomerAuthGuard } from '../../auth/guards/customer-auth.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * Creates a new order.
   * @param dto - The order creation data
   * @returns The created order
   */
  @ApiOperation({
    summary: 'Create a new order',
    description:
      'Creates a new order with the provided details. Validates related entities (customer, vendor, address, product) if IDs are provided.',
  })
  @ApiBody({
    type: CreateOrderDto,
    examples: {
      example1: {
        summary: 'Create order example',
        value: {
          customerId: 'customer-uuid-123',
          vendorId: 'vendor-uuid-456',
          cartId: 'cart-uuid-456',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully.',
    schema: {
      example: {
        id: 'order-uuid-123',
        customerId: 'customer-uuid-123',
        vendorId: 'vendor-uuid-456',
        addressId: 'address-uuid-789',
        productId: 'product-uuid-101',
        qty: 2,
        total_amount: 50.0,
        status: 'PENDING',
        payment_status: 'PENDING',
        assigned_rider_phone: '+1234567890',
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T10:00:00.000Z',
        customer: { id: 'customer-uuid-123', name: 'John Doe' },
        vendor: { id: 'vendor-uuid-456', name: 'Vendor Inc' },
        address: { id: 'address-uuid-789', street: '123 Main St' },
        product: { id: 'product-uuid-101', name: 'Water Jar' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or related entities not found.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Customer not found',
        error: 'Bad Request',
      },
    },
  })
  @Post()
  async create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto);
  }

  /**
   * Retrieves all orders.
   * @returns Array of orders
   */
  @ApiOperation({
    summary: 'Get all orders',
    description:
      'Retrieves a list of all orders, ordered by creation date descending, including related customer, vendor, address, and product information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully.',
    schema: {
      example: [
        {
          id: 'order-uuid-123',
          customerId: 'customer-uuid-123',
          vendorId: 'vendor-uuid-456',
          addressId: 'address-uuid-789',
          productId: 'product-uuid-101',
          status: 'PENDING',
          payment_status: 'PENDING',
          assigned_rider_phone: '+1234567890',
          created_at: '2023-12-01T10:00:00.000Z',
          updated_at: '2023-12-01T10:00:00.000Z',
          customer: { id: 'customer-uuid-123', name: 'John Doe' },
          vendor: { id: 'vendor-uuid-456', name: 'Vendor Inc' },
          address: { id: 'address-uuid-789', street: '123 Main St' },
          product: { id: 'product-uuid-101', name: 'Water Jar' },
        },
      ],
    },
  })
  @Get()
  async findAll() {
    return this.orderService.findAll();
  }

  /**
   * Retrieves a single order by ID.
   * @param id - The unique identifier of the order
   * @returns The order
   */
  @ApiOperation({
    summary: 'Get order by ID',
    description:
      'Retrieves a single order by its unique identifier, including related customer, vendor, address, and product information.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the order (UUID)',
    example: 'order-uuid-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Order retrieved successfully.',
    schema: {
      example: {
        id: 'order-uuid-123',
        customerId: 'customer-uuid-123',
        vendorId: 'vendor-uuid-456',
        addressId: 'address-uuid-789',
        productId: 'product-uuid-101',
        qty: 2,
        total_amount: 50.0,
        status: 'PENDING',
        payment_status: 'PENDING',
        assigned_rider_phone: '+1234567890',
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T10:00:00.000Z',
        customer: { id: 'customer-uuid-123', name: 'John Doe' },
        vendor: { id: 'vendor-uuid-456', name: 'Vendor Inc' },
        address: { id: 'address-uuid-789', street: '123 Main St' },
        product: { id: 'product-uuid-101', name: 'Water Jar' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      },
    },
  })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  /**
   * Updates an order by ID.
   * @param id - The unique identifier of the order
   * @param dto - The update data
   * @returns The updated order
   */
  @ApiOperation({
    summary: 'Update order by ID',
    description:
      'Updates an existing order with the provided details. Validates related entities if IDs are provided.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the order (UUID)',
    example: 'order-uuid-123',
  })
  @ApiBody({
    type: UpdateOrderDto,
    examples: {
      example1: {
        summary: 'Update order status example',
        value: {
          status: 'CONFIRMED',
          payment_status: 'PAID',
          assigned_rider_phone: '+1234567890',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Order updated successfully.',
    schema: {
      example: {
        id: 'order-uuid-123',
        customerId: 'customer-uuid-123',
        vendorId: 'vendor-uuid-456',
        addressId: 'address-uuid-789',
        productId: 'product-uuid-101',
        total_amount: 50.0,
        status: 'CONFIRMED',
        payment_status: 'PAID',
        assigned_rider_phone: '+1234567890',
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T10:05:00.000Z',
        customer: { id: 'customer-uuid-123', name: 'John Doe' },
        vendor: { id: 'vendor-uuid-456', name: 'Vendor Inc' },
        address: { id: 'address-uuid-789', street: '123 Main St' },
        product: { id: 'product-uuid-101', name: 'Water Jar' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or related entities not found.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Vendor not found',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      },
    },
  })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.orderService.update(id, dto);
  }

  /**
   * Cancels an order by ID.
   * @param orderId - The unique identifier of the order
   * @param dto - The cancellation data
   * @param currentUser - The authenticated customer
   * @returns The cancelled order
   */
  @ApiOperation({
    summary: 'Cancel an order',
    description:
      'Cancels an existing order that belongs to the authenticated customer. Updates order status to CANCELLED, sets cancelledAt timestamp, and initiates refund if payment exists.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Unique identifier of the order (UUID)',
    example: 'order-uuid-123',
  })
  @ApiBody({
    type: CancelOrderDto,
    examples: {
      example1: {
        summary: 'Cancel order example',
        value: {
          cancelReason:
            'Customer requested cancellation due to change of plans',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully.',
    schema: {
      example: {
        id: 'order-uuid-123',
        orderNo: 'O000001',
        status: 'CANCELLED',
        payment_status: 'REFUNDED',
        cancelReason: 'Customer requested cancellation due to change of plans',
        cancelledAt: '2023-12-01T10:30:00.000Z',
        customer: {
          id: 'customer-uuid-123',
          name: 'John Doe',
          phone: '+1234567890',
        },
        vendor: {
          id: 'vendor-uuid-456',
          name: 'Vendor Inc',
        },
        total_amount: 50.0,
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - order cannot be cancelled or invalid data.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Order cannot be cancelled as it is already delivered',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - customer not authenticated.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - customer not authorized to cancel this order.',
    schema: {
      example: {
        statusCode: 403,
        message: 'You are not authorized to cancel this order',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      },
    },
  })
  @Post(':orderId/cancel')
  @UseGuards(CustomerAuthGuard)
  async cancel(
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.orderService.cancelOrder(orderId, dto, currentUser);
  }
}
