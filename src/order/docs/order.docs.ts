import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { CreateOrderFromCartDto } from '../dto/create-order-from-cart.dto';

export function CreateOrderFromCartDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create order from cart',
      description:
        "Creates a new order from the authenticated customer's cart. " +
        'Validates cart items, calculates totals, initiates payment (if ONLINE), ' +
        'and creates the order record with appropriate status management.',
    }),
    ApiBody({ type: CreateOrderFromCartDto }),
    ApiResponse({
      status: 201,
      description: 'Order created successfully.',
    }),
    ApiResponse({
      status: 400,
      description:
        'Bad request - invalid data, empty cart, or validation errors.',
    }),
    ApiResponse({
      status: 404,
      description: 'Cart not found.',
    }),
  );
}

export function GetMyOrdersDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get my orders',
      description:
        'Retrieves a list of orders for the authenticated customer, with optional filtering by delivery status, payment mode, payment status, and pagination.',
    }),
    ApiQuery({
      name: 'delivery_status',
      required: false,
      schema: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'PENDING',
            'CONFIRMED',
            'PROCESSING',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'CANCELLED',
          ],
        },
        default: ['PENDING', 'OUT_FOR_DELIVERY'],
      },
      description:
        'Filter by order delivery status(es). Can be a single status or comma-separated string of valid statuses.',
    }),
    ApiQuery({
      name: 'payment_mode',
      required: false,
      schema: {
        type: 'array',
        items: { type: 'string', enum: ['ONLINE', 'COD', 'MONTHLY'] },
      },
      description:
        'Filter by payment mode(s). Can be a single mode or comma-separated string of valid modes.',
    }),
    ApiQuery({
      name: 'payment_status',
      required: false,
      schema: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['PENDING', 'PAID', 'FAILED', 'REFUND_INITIATED', 'REFUNDED'],
        },
      },
      description:
        'Filter by payment status(es). Can be a single status or comma-separated string of valid statuses.',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      schema: { type: 'integer', default: 1 },
      description: 'Page number for pagination.',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      schema: { type: 'integer', default: 10 },
      description: 'Number of items per page.',
    }),
    ApiResponse({
      status: 200,
      description: 'Orders retrieved successfully.',
    }),
    ApiResponse({
      status: 400,
      description:
        'Bad request - invalid filter value. Valid delivery_status values are: PENDING, CONFIRMED, PROCESSING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED. Valid payment_mode values are: ONLINE, COD, MONTHLY. Valid payment_status values are: PENDING, PAID, FAILED, REFUND_INITIATED, REFUNDED.',
    }),
  );
}

export function GetMyOrderDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get my order by ID',
      description:
        'Retrieves a single order by its ID, ensuring it belongs to the authenticated customer.',
    }),
    ApiResponse({
      status: 200,
      description: 'Order retrieved successfully.',
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
