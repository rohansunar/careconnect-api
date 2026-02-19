import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { RiderOrderService } from '../services/rider-order.service';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../common/interfaces/user.interface';
// Note: Rider authentication guard not implemented in existing codebase

@ApiTags('Rider Orders')
@Controller('rider/orders')
// @UseGuards(RiderAuthGuard) // Placeholder for rider auth
export class RiderOrderController {
  constructor(private readonly riderOrderService: RiderOrderService) {}

  /**
   * Retrieves all orders assigned to the authenticated rider.
   * @param user - The authenticated rider user
   * @returns Array of rider's assigned orders
   */
  @ApiOperation({
    summary: 'Get assigned orders',
    description:
      'Retrieves a list of all orders assigned to the authenticated rider.',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully.',
  })
  @Get()
  async getAssignedOrders(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.riderOrderService.getAssignedOrders(user, page, limit);
  }

  /**
   * Updates an assigned order for the authenticated rider.
   * @param id - The unique identifier of the order
   * @param dto - The update data
   * @param user - The authenticated rider user
   * @returns The updated order
   */
  @ApiOperation({
    summary: 'Update assigned order',
    description:
      'Updates an order that is assigned to the authenticated rider.',
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
    description: 'Forbidden - order not assigned to rider.',
  })
  @Patch(':id')
  async updateAssignedOrder(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.riderOrderService.updateAssignedOrder(id, dto, user);
  }
}
