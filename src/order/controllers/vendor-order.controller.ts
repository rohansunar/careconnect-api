import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { VendorOrderService } from '../services/vendor-order.service';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Vendor Orders')
@Controller('vendor/orders')
@Roles('vendor')
export class VendorOrderController {
  constructor(private readonly vendorOrderService: VendorOrderService) {}

  /**
   * Retrieves paginated orders for the authenticated vendor.
   * @param user - The authenticated vendor user
   * @param page - The page number (optional, default: 1)
   * @param limit - The number of orders per page (optional, default: 10)
   * @returns Paginated orders with total count
   */
  @ApiOperation({
    summary: 'Get my orders',
    description:
      'Retrieves a paginated list of orders for the authenticated vendor.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of orders per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully.',
  })
  @Get()
  async getMyOrders(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.vendorOrderService.getMyOrders(user, page, limit);
  }

  /**
   * Retrieves a single order by ID for the authenticated vendor.
   * @param id - The unique identifier of the order
   * @param user - The authenticated vendor user
   * @returns The order
   */
  @ApiOperation({
    summary: 'Get my order by ID',
    description:
      'Retrieves a single order by its ID, ensuring it belongs to the authenticated vendor.',
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
    description: 'Forbidden - order does not belong to vendor.',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found.',
  })
  @Get(':id')
  async getMyOrder(@Param('id') id: string, @CurrentUser() user: User) {
    return this.vendorOrderService.getMyOrder(id, user);
  }

  /**
   * Updates an order for the authenticated vendor.
   * @param id - The unique identifier of the order
   * @param dto - The update data
   * @param user - The authenticated vendor user
   * @returns The updated order
   */
  @ApiOperation({
    summary: 'Update my order',
    description: 'Updates an order that belongs to the authenticated vendor.',
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - order does not belong to vendor.',
  })
  @Patch(':id')
  async updateMyOrder(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.vendorOrderService.updateMyOrder(id, dto, user);
  }
}
