import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { WalletPaymentService } from '../services/wallet-payment.service';
import { WalletService } from '../services/wallet.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { Roles } from '../../auth/decorators/roles.decorator';

/**
 * Controller for wallet payment operations
 * Handles payment initialization for wallet top-ups using Razorpay
 */
@ApiTags('Wallet Payments')
@ApiBearerAuth()
@Controller('customer/wallet/payments')
@Roles('customer')
export class WalletPaymentController {
  constructor(
    private readonly walletPaymentService: WalletPaymentService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Initializes a Razorpay payment for wallet top-up.
   * Creates a payment record in the database and returns the payment details.
   * @param user - The authenticated customer user
   * @param dto - The payment data including amount
   * @returns Payment object with customer details
   */
  @ApiOperation({
    summary: 'Initialize payment for wallet top-up',
    description:
      'Creates a Razorpay payment transaction for adding funds to the customer wallet.',
  })
  @ApiBody({
    type: CreatePaymentDto,
    description: 'Payment data including amount and optional currency/notes',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment initialized successfully.',
    schema: {
      example: {
        id: 'string',
        payment: {
          id: 'string',
          amount: 0,
          currency: 'INR',
          provider: 'RAZORPAY',
          provider_payment_id: 'string',
          status: 'PENDING',
          initiated_at: '2024-01-01T00:00:00.000Z',
          completed_at: null,
          reconciled: false,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        customer: {
          name: 'string',
          email: 'string',
          phone: 'string',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  @Post()
  async initializePayment(
    @CurrentUser() user: User,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.walletPaymentService.initializePayment(user, dto);
  }

  /**
   * Get the last 20 transactions for a customer's wallet
   * Returns transactions in reverse chronological order (newest first)
   * @param customerId - Customer ID query parameter
   * @returns Array of up to 20 wallet transactions
   */
  @ApiOperation({
    summary: 'Get last wallet transactions',
    description:
      'Retrieves the most recent 20 transactions for a customer wallet in reverse chronological order.',
  })
  @ApiQuery({
    name: 'customerId',
    type: String,
    description: 'Customer ID to retrieve transactions for',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully.',
    schema: {
      example: [
        {
          id: 'string',
          walletId: 'string',
          amount: 100.0,
          type: 'CREDIT',
          status: 'COMPLETED',
          currency: 'INR',
          referenceId: 'string',
          referenceType: 'ORDER',
          description: 'Wallet top-up',
          internalNote: null,
          idempotencyKey: 'string',
          createdAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid customer ID.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  @Get('transactions')
  async getLastTransactions(
     @CurrentUser() user: User,
  ) {
    return this.walletService.getTransactionHistory(user.id);
  }
}
