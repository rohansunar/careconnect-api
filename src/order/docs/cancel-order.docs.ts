import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { CancelOrderDto } from '../dto/cancel-order.dto';

export function CancelOrderDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cancel my order',
      description:
        'Cancels an order that belongs to the authenticated customer.',
    }),
    ApiParam({
      name: 'orderId',
      description: 'Unique identifier of the order (UUID)',
    }),
    ApiBody({
      type: CancelOrderDto,
    }),
    ApiResponse({
      status: 200,
      description: 'Order cancelled successfully.',
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
