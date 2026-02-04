import { Controller, Post, Get, Body, Param, Headers } from '@nestjs/common';
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
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from 'src/auth/decorators/public.decorator';

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
      'Creates a new payment for the specified cart. For ONLINE mode, initiates payment with provider and checks out the cart. For COD/MONTHLY modes, creates an order and links the payment to it without provider initiation.',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or order not found.',
  })
  @Post()
  @Roles('customer')
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
  })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found.',
  })
  @Get(':id')
  @Roles('customer')
  async findOne(@Param('id') id: string) {
    return this.paymentService.findOne(id);
  }

  /**
   * Handles webhooks for payment status updates.
   * @param dto - The webhook payload
   * @returns Updated payment information
   */
  @Public()
  @ApiOperation({
    summary: 'Handle payment webhook',
    description:
      'Processes webhook notifications from payment providers to update payment status.',
  })
  @ApiBody({ type: WebhookDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook data.',
  })
  @Post('webhook')
  async handleWebhook(
    @Body() dto: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentService.handleWebhook(dto, signature);
  }
}
