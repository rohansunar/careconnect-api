import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AdminOrderService } from '../services/admin-order.service';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

@ApiTags('Admin Orders')
@Controller('admin/orders')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminOrderController {
  constructor(private readonly adminOrderService: AdminOrderService) {}


  /**
   * Retrieves all orders (admin only).
   * @returns Array of all orders
   */
  @ApiOperation({
    summary: 'Get all orders',
    description: 'Retrieves a list of all orders.',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully.',
  })
  @Get()
  async getAllOrders() {
    return this.adminOrderService.getAllOrders();
  }

  /**
   * Retrieves a single order by ID (admin only).
   * @param id - The unique identifier of the order
   * @returns The order
   */
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Retrieves a single order by its ID.',
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
    status: 404,
    description: 'Order not found.',
  })
  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.adminOrderService.getOrder(id);
  }

  /**
   * Updates an order by ID (admin only).
   * @param id - The unique identifier of the order
   * @param dto - The update data
   * @returns The updated order
   */
  @ApiOperation({
    summary: 'Update order by ID',
    description: 'Updates an existing order with the provided details.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the order (UUID)',
  })
  @ApiBody({
    type: UpdateOrderDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Order updated successfully.',
  })
  @Patch(':id')
  async updateOrder(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.adminOrderService.updateOrder(id, dto);
  }
}
