import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { PaymentProviderService } from '../../payment/services/payment-provider.service';
import { PaymentStatus } from '@prisma/client';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import type { User } from '../../common/interfaces/user.interface';

/**
 * Interface for payment response structure matching subscription creation
 */
export interface WalletPaymentResponse {
  id: string;
  payment: {
    id: string;
    amount: number;
    currency: string;
    provider: string | null;
    provider_payment_id: string | null;
    status: PaymentStatus;
    initiated_at: Date;
    completed_at: Date | null;
    reconciled: boolean;
    created_at: Date;
    updated_at: Date;
  };
  customer: {
    name: string;
    email: string | null;
    phone: string;
  };
}

/**
 * Service for handling wallet payment operations.
 * Manages payment initialization for wallet top-ups using Razorpay.
 */
@Injectable()
export class WalletPaymentService {
  private readonly logger = new Logger(WalletPaymentService.name);
  private readonly CURRENCY = 'INR';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaymentProviderService))
    private readonly paymentProvider: PaymentProviderService,
  ) {}

  /**
   * Initializes a Razorpay payment for wallet top-up.
   * Creates a payment record in the database and returns payment details
   * matching the subscription creation response structure.
   * @param user - The authenticated customer user
   * @param dto - The payment data transfer object
   * @returns Payment object with customer details
   * @throws BadRequestException if payment initialization fails
   */
  async initializePayment(user: User, dto: CreatePaymentDto) {
    this.logger.log(
      `Initializing payment for customer: ${user.id} with amount: ${dto.amount}`,
    );

    const amount = dto.amount;
    const currency = this.CURRENCY;

    // Validate amount
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    try {
      // Get customer details
      const customer = await this.prisma.customer.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      });

      if (!customer) {
        throw new BadRequestException('User not found');
      }

      // Generate a unique order ID for this payment
      const orderId = `wallet_${Date.now()}`;

      // Initiate payment with Razorpay
      const providerResponse = await this.paymentProvider.initiatePayment({
        amount,
        currency,
        orderId,
        notes: {
          customerId: user.id,
          walletTopup: 'true',
        },
      });

      this.logger.log(
        `Payment initiated with provider: ${providerResponse.providerPaymentId}`,
      );

      // Create payment record in database
      const payment = await this.prisma.payment.create({
        data: {
          amount,
          currency,
          provider: providerResponse.provider,
          provider_payment_id: providerResponse.providerPaymentId,
          provider_payload: providerResponse.payload,
          status: PaymentStatus.PENDING,
        },
      });

      this.logger.log(`Payment record created: ${payment.id}`);

      // Return response matching subscription creation structure
      return {
        id: payment.id,
        payment,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to initialize payment for customer ${user.id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to initialize payment: ${error.message}`,
      );
    }
  }
}
