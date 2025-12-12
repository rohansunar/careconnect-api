import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
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
    description: 'Creates a new order with the provided details.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or related entities not found.',
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
    description: 'Retrieves a list of all orders.',
  })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully.' })
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
    description: 'Retrieves a single order by its unique identifier.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
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
    description: 'Updates an existing order with the provided details.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({ status: 200, description: 'Order updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.orderService.update(id, dto);
  }

  /**
   * Deletes an order by ID.
   * @param id - The unique identifier of the order
   * @returns Confirmation of deletion
   */
  @ApiOperation({
    summary: 'Delete order by ID',
    description: 'Deletes an order by its unique identifier.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.orderService.delete(id);
  }
}