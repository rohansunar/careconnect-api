import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { WebhookDto } from '../dto/webhook.dto';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

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
