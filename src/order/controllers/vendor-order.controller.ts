import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
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
import { VerifyDeliveryOtpDto } from '../dto/verify-delivery-otp.dto';
import { CancelOrderDto } from '../dto/cancel-order.dto';
import { AssignOrdersDto } from '../dto/assign-orders.dto';
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

  /**
   * Cancels an order initiated by the vendor.
   * Only orders that have not been delivered can be cancelled.
   * For ONLINE payments, creates refund and fee reversal ledger entries.
   * Sends notifications to customer, vendor, and admin.
   *
   * @param id - The unique identifier of the order (UUID format)
   * @param dto - The cancellation data containing reason
   * @param user - The authenticated vendor user
   * @returns Cancellation result with order details
   */
  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel order',
    description:
      'Cancels an order that has not yet been delivered. ' +
      'For online payments, initiates refund processing and fee reversal. ' +
      'Sends notifications to customer, vendor, and admin.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the order (UUID format)',
  })
  @ApiBody({
    type: CancelOrderDto,
    description: 'Cancellation request data',
    examples: {
      example: {
        value: {
          cancelReason:
            'Customer requested cancellation due to change of plans',
        },
        description: 'Vendor provides reason for cancellation',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Order Cancellation.',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
          description: 'Indicates successful Order Cancellation.',
        },
      },
      example: { success: true },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - invalid order ID format or missing cancellation reason.',
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
    status: 409,
    description: 'Conflict - order has already been delivered or cancelled.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - database operation failed.',
  })
  async cancelOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.vendorOrderService.cancelOrder(id, dto.cancelReason, user);
  }

  /**
   * Assigns one or more orders to a rider for delivery.
   * Supports both single and bulk order assignment.
   * Sends push notification and WhatsApp message to the assigned rider.
   *
   * @param dto - The assignment data containing order IDs and rider ID
   * @param user - The authenticated vendor user
   * @returns BulkAssignmentResponseDto with assignment results
   */
  @Post('assign')
  @ApiOperation({
    summary: 'Assign orders to a rider',
    description:
      'Assigns single or multiple orders to a rider for delivery. ' +
      'All orders will be assigned to the specified rider. ' +
      'Push notification and WhatsApp message will be sent to the rider. ' +
      'Returns 207 (Multi-Status) for partial success in bulk operations.',
  })
  @ApiBody({
    type: AssignOrdersDto,
    description: 'Order assignment request data',
    examples: {
      singleOrder: {
        value: {
          orderIds: ['550e8400-e29b-41d4-a716-446655440001'],
          riderId: '550e8400-e29b-41d4-a716-446655440000',
        },
        description: 'Assign a single order to a rider',
      },
      bulkAssignment: {
        value: {
          orderIds: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003',
          ],
          riderId: '550e8400-e29b-41d4-a716-446655440000',
        },
        description: 'Assign multiple orders to a rider',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'All orders assigned successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Successfully assigned 3 orders to rider',
        },
        assignedOrders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              orderId: {
                type: 'string',
                example: '550e8400-e29b-41d4-a716-446655440001',
              },
              orderNo: { type: 'string', example: 'ORD-001' },
            },
          },
        },
        failedOrders: { type: 'array', items: { type: 'object' } },
        totalOrders: { type: 'number', example: 3 },
        assignedCount: { type: 'number', example: 3 },
        failedCount: { type: 'number', example: 0 },
      },
    },
  })
  @ApiResponse({
    status: 207,
    description: 'Partial success - some orders failed to assign',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Some orders could not be assigned',
        },
        assignedOrders: { type: 'array' },
        failedOrders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              orderId: { type: 'string' },
              reason: { type: 'string' },
            },
          },
        },
        totalOrders: { type: 'number' },
        assignedCount: { type: 'number' },
        failedCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid input format or validation errors',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - rider not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - orders not in assignable state',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - database operation failed',
  })
  @HttpCode(HttpStatus.OK)
  async assignOrders(
    @Body() dto: AssignOrdersDto,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    return this.vendorOrderService.assignOrders(dto, user);
  }

  /**
   * Reverts rider assignment from an order.
   * Clears the assigned rider and resets delivery status.
   * Sends push notification and WhatsApp message to the affected rider.
   *
   * @param id - The unique identifier of the order (UUID format)
   * @param user - The authenticated vendor user
   * @returns Revert result with success status
   */
  @Post(':id/revert-assignment')
  @ApiOperation({
    summary: 'Revert rider assignment from order',
    description:
      'Removes the assigned rider from an order that has not been delivered. ' +
      'The order status will be reset to CONFIRMED/PENDING. ' +
      'Push notification and WhatsApp message will be sent to the affected rider.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the order (UUID format)',
  })
  @ApiBody({
    description: 'Rider assignment revert request data',
    examples: {
      example: {
        value: { reason: 'Rider reported vehicle breakdown' },
        description: 'Vendor provides reason for reverting rider assignment',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Rider assignment reverted successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
          description: 'Indicates successful revert',
        },
        message: {
          type: 'string',
          example:
            'Rider assignment reverted successfully. The order is now available for reassignment.',
          description: 'Human-readable success message',
        },
      },
      example: {
        success: true,
        message:
          'Rider assignment reverted successfully. The order is now available for reassignment.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid order ID format or no rider assigned',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - order does not belong to vendor',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - order has already been delivered',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - database operation failed',
  })
  async revertRiderAssignment(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.vendorOrderService.revertRiderAssignment(id, user);
  }
}
