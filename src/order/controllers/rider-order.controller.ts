import { Controller, Get, Body, Param, Query, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RiderOrderService } from '../services/rider-order.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { VerifyDeliveryOtpDto } from '../dto/verify-delivery-otp.dto';
import { CancelOrderDto } from '../dto/cancel-order.dto';
// Note: Rider authentication guard not implemented in existing codebase
@ApiBearerAuth()
@ApiTags('Rider Orders')
@Controller('rider/orders')
@Roles('rider') // Placeholder for rider auth
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
   * Verifies delivery OTP for an assigned order and marks it delivered.
   */
  @ApiOperation({
    summary: 'Verify delivery OTP (Rider)',
    description:
      'Verify the 4-digit delivery OTP for an order assigned to the rider and mark it as delivered.',
  })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)' })
  @ApiBody({ type: VerifyDeliveryOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified and order delivered.',
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP or state.' })
  @ApiResponse({ status: 403, description: 'Order not assigned to rider.' })
  @Post(':id/verify-delivery-otp')
  async verifyDeliveryOtp(
    @Param('id') id: string,
    @Body() dto: VerifyDeliveryOtpDto,
    @CurrentUser() user: User,
  ) {
    return this.riderOrderService.verifyDeliveryOtpForRider(id, dto.otp, user);
  }

  /**
   * Cancels an assigned order with a reason provided by the rider.
   */
  @ApiOperation({
    summary: 'Cancel assigned order (Rider)',
    description:
      'Cancel an order assigned to the rider. Requires a cancellation reason.',
  })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)' })
  @ApiBody({ type: CancelOrderDto })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  @ApiResponse({ status: 403, description: 'Order not assigned to rider.' })
  @Post(':id/cancel')
  async cancelAssignedOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.riderOrderService.cancelAssignedOrder(
      id,
      dto.cancelReason,
      user,
    );
  }
}
