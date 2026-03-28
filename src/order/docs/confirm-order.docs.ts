import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function ConfirmOrderDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Confirm my order',
      description:
        'Confirms an order that belongs to the authenticated customer. ' +
        'This endpoint is applicable only for ONLINE payment orders. ' +
        'COD orders do not require customer confirmation as payment is collected upon delivery. ' +
        'Upon confirmation, the order status is updated to CONFIRMED and relevant notifications are sent.',
    }),
    ApiParam({
      name: 'orderId',
      description: 'Unique identifier of the order (UUID)',
      required: true,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Order confirmed successfully.',
      schema: {
        example: {
          success: true,
          message: 'Order confirmed successfully',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description:
        'Bad request - COD orders do not require confirmation, order already confirmed, or order in invalid state.',
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - order does not belong to customer.',
    }),
    ApiResponse({
      status: 404,
      description: 'Order not found.',
    }),
  );
}
