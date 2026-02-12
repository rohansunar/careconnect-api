import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
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
import { VendorOrderService } from '../services/vendor-order.service';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { VerifyDeliveryOtpDto } from '../dto/verify-delivery-otp.dto';
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

  /**
   * Marks an order as OUT_FOR_DELIVERY and generates a 4-digit OTP.
   * @param id - The unique identifier of the order
   * @param user - The authenticated vendor user
   * @returns The updated order with delivery OTP
   */
  @Post(':id/out-for-delivery')
  @ApiOperation({
    summary: 'Mark order as out for delivery',
    description:
      'Updates the order status to OUT_FOR_DELIVERY and generates a 4-digit OTP for delivery verification.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the order (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Order marked as out for delivery successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - order does not belong to vendor.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - order is already out for delivery or delivered.',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found.',
  })
  async markOutForDelivery(@Param('id') id: string, @CurrentUser() user: User) {
    return this.vendorOrderService.markOutForDelivery(id, user);
  }

  /**
   * Verifies delivery OTP and marks the order as delivered.
   * For COD orders, payment status is also updated to PAID.
   * Creates platform listing fee ledger entries for COD orders only.
   * Sends notifications upon successful delivery.
   *
   * @param id - The unique identifier of the order (UUID format)
   * @param dto - The OTP verification data
   * @param user - The authenticated vendor user
   * @returns Verification result with success status
   */
  @Post(':id/verify-delivery-otp')
  @ApiOperation({
    summary: 'Verify delivery OTP',
    description:
      'Verifies the 4-digit OTP for an order marked as out for delivery. ' +
      'Updates delivery_status to DELIVERED and payment_status to PAID for COD orders. ' +
      'Creates platform listing fee ledger entries only for COD orders. ' +
      'Sends multi-channel notifications upon successful delivery.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the order (UUID format)',
  })
  @ApiBody({
    type: VerifyDeliveryOtpDto,
    description: 'OTP verification data',
    examples: {
      example: {
        value: { otp: '1234' },
        description:
          'The 4-digit OTP received from mark-out-for-delivery endpoint',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully, order marked as delivered.',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
          description: 'Indicates successful OTP verification',
        },
      },
      example: { success: true },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - invalid OTP, order already delivered, order not ready for delivery verification, OTP expired, or invalid input format.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - order does not belong to vendor.',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - database operation failed.',
  })
  async verifyDeliveryOtp(
    @Param('id') id: string,
    @Body() dto: VerifyDeliveryOtpDto,
    @CurrentUser() user: User,
  ) {
    return this.vendorOrderService.verifyDeliveryOtp(id, dto.otp, user);
  }
}
