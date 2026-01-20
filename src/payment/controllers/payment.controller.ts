import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { WebhookDto } from '../dto/webhook.dto';
import { CustomerAuthGuard } from '../../auth/guards/customer-auth.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Creates a new payment for an order.
   * @param dto - The payment creation data
   * @returns The created payment
   */
  @ApiOperation({
    summary: 'Create a new payment',
    description:
      'Creates a new payment for the specified order. Validates order existence and initiates payment with provider.',
  })
  @ApiBody({
    type: CreatePaymentDto,
    examples: {
      example1: {
        summary: 'Create payment example',
        value: {
          cartId: 'cart-uuid-123',
          paymentMode: 'ONLINE',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully.',
    schema: {
      example: {
        id: 'payment-uuid-123',
        order_id: 'order-uuid-123',
        amount: 100.0,
        currency: 'INR',
        status: 'PENDING',
        provider: 'MOCK',
        provider_payment_id: 'mock_1234567890_order-uuid-123',
        created_at: '2023-12-01T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or order not found.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Order not found',
        error: 'Bad Request',
      },
    },
  })
  @Post()
  @UseGuards(CustomerAuthGuard)
  async create(@Body() dto: CreatePaymentDto) {
    return this.paymentService.create(dto);
  }

  /**
   * Retrieves payment details by ID.
   * @param id - The unique identifier of the payment
   * @returns The payment details
   */
  @ApiOperation({
    summary: 'Get payment details',
    description:
      'Retrieves detailed information about a specific payment by its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the payment (UUID)',
    example: 'payment-uuid-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully.',
    schema: {
      example: {
        id: 'payment-uuid-123',
        order_id: 'order-uuid-123',
        amount: 100.0,
        currency: 'INR',
        payment_mode: 'ONLINE',
        provider: 'MOCK',
        provider_payment_id: 'mock_1234567890_order-uuid-123',
        status: 'PENDING',
        created_at: '2023-12-01T10:00:00.000Z',
        order: { id: 'order-uuid-123', total_amount: 100.0 },
        customer: { id: 'customer-uuid-456', name: 'John Doe' },
        vendor: { id: 'vendor-uuid-789', name: 'Vendor Inc' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Payment not found',
        error: 'Not Found',
      },
    },
  })
  @Get(':id')
  @UseGuards(CustomerAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.paymentService.findOne(id);
  }

  /**
   * Handles webhooks for payment status updates.
   * @param webhookData - The webhook payload
   * @returns Updated payment information
   */
  @ApiOperation({
    summary: 'Handle payment webhook',
    description:
      'Processes webhook notifications from payment providers to update payment status.',
  })
  @ApiBody({
    type: WebhookDto,
    examples: {
      example1: {
        summary: 'Webhook example',
        value: {
          payload: {
            paymentId: 'mock_1234567890_order-uuid-123',
            status: 'COMPLETED',
            amount: 100.0,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully.',
    schema: {
      example: {
        id: 'payment-uuid-123',
        status: 'COMPLETED',
        completed_at: '2023-12-01T10:05:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook data.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid webhook data',
        error: 'Bad Request',
      },
    },
  })
  @Post('webhook')
  async handleWebhook(@Body() webhookData: WebhookDto) {
    return this.paymentService.handleWebhook(
      webhookData.payload || webhookData,
    );
  }
}
