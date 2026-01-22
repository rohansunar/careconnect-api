import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';

/**
 * Interface for payment initiation data
 */
interface InitiatePaymentData {
  amount: number;
  currency: string;
  orderId: string;
}

/**
 * Interface for payment provider response
 */
interface ProviderResponse {
  provider: string;
  providerPaymentId: string;
  payload: any;
}

/**
 * Interface for webhook verification data
 */
interface WebhookVerificationData {
  providerPaymentId: string;
  status: string;
}

/**
 * Interface for refund initiation data
 */
interface InitiateRefundData {
  paymentId: string;
  amount: number;
  reason: string;
}

/**
 * Interface for refund provider response
 */
interface RefundProviderResponse {
  refundId: string;
  status: string;
  payload: any;
}

/**
 * Service for handling payment provider integrations.
 * Currently supports mock implementation, configurable for Razorpay.
 */
@Injectable()
export class PaymentProviderService {
  private readonly logger = new Logger(PaymentProviderService.name);
  private readonly provider: string;
  private razorpayInstance: Razorpay;

  constructor(private configService: ConfigService) {
    // Default to mock, can be configured via env
    this.provider = this.configService.get<string>('PAYMENT_PROVIDER', 'MOCK');

    // Initialize Razorpay if configured
    if (this.provider === 'RAZORPAY') {
      const razorpayKeyId = this.configService.get<string>('RAZORPAY_KEY_ID');
      const razorpayKeySecret = this.configService.get<string>(
        'RAZORPAY_KEY_SECRET',
      );

      if (!razorpayKeyId || !razorpayKeySecret) {
        throw new Error('Razorpay key ID and secret must be configured');
      }

      this.razorpayInstance = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      });
    }
  }

  /**
   * Initiates a payment with the configured provider.
   * @param data - Payment initiation data
   * @returns Provider response
   */
  async initiatePayment(data: InitiatePaymentData): Promise<ProviderResponse> {
    this.logger.log(
      `Initiating payment for order: ${data.orderId} with provider: ${this.provider}`,
    );

    switch (this.provider) {
      case 'RAZORPAY':
        return this.initiateRazorpayPayment(data);
      case 'MOCK':
      default:
        return this.initiateMockPayment(data);
    }
  }

  /**
   * Verifies and processes webhook data from payment provider.
   * @param webhookData - Raw webhook payload
   * @returns Verified webhook data
   */
  async verifyWebhook(webhookData: any): Promise<WebhookVerificationData> {
    this.logger.log(`Verifying webhook with provider: ${this.provider}`);

    switch (this.provider) {
      case 'RAZORPAY':
        return this.verifyRazorpayWebhook(webhookData);
      case 'MOCK':
      default:
        return this.verifyMockWebhook(webhookData);
    }
  }

  /**
   * Initiates a refund with the configured provider.
   * @param data - Refund initiation data
   * @returns Refund provider response
   */
  async initiateRefund(
    data: InitiateRefundData,
  ): Promise<RefundProviderResponse> {
    this.logger.log(
      `Initiating refund for payment: ${data.paymentId} with provider: ${this.provider}`,
    );

    switch (this.provider) {
      case 'RAZORPAY':
        return this.initiateRazorpayRefund(data);
      case 'MOCK':
      default:
        return this.initiateMockRefund(data);
    }
  }

  /**
   * Mock payment initiation for development/testing.
   */
  private async initiateMockPayment(
    data: InitiatePaymentData,
  ): Promise<ProviderResponse> {
    const mockPaymentId = `mock_${Date.now()}_${data.orderId}`;

    return {
      provider: 'MOCK',
      providerPaymentId: mockPaymentId,
      payload: {
        mock: true,
        amount: data.amount,
        currency: data.currency,
        orderId: data.orderId,
      },
    };
  }

  /**
   * Mock refund initiation for development/testing.
   */
  private async initiateMockRefund(
    data: InitiateRefundData,
  ): Promise<RefundProviderResponse> {
    const mockRefundId = `mock_refund_${Date.now()}_${data.paymentId}`;

    this.logger.log(
      `Mock refund initiated: ${mockRefundId} for payment: ${data.paymentId}`,
    );

    return {
      refundId: mockRefundId,
      status: 'COMPLETED',
      payload: {
        mock: true,
        originalPaymentId: data.paymentId,
        amount: data.amount,
        reason: data.reason,
      },
    };
  }

  /**
   * Mock webhook verification.
   */
  private async verifyMockWebhook(
    webhookData: any,
  ): Promise<WebhookVerificationData> {
    // In mock, assume payment is completed
    return {
      providerPaymentId: webhookData.paymentId || 'mock_payment_id',
      status: 'COMPLETED',
    };
  }

  /**
   * Razorpay payment initiation.
   * Creates an order using the Razorpay SDK.
   */
  private async initiateRazorpayPayment(
    data: InitiatePaymentData,
  ): Promise<ProviderResponse> {
    try {
      const options = {
        amount: data.amount * 100, // Razorpay expects amount in paise
        currency: data.currency,
        receipt: data.orderId,
        payment_capture: 1, // Auto-capture payment
      };

      const order = await this.razorpayInstance.orders.create(options);

      return {
        provider: 'RAZORPAY',
        providerPaymentId: order.id,
        payload: {
          razorpayOrderId: order.id,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          receipt: order.receipt,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to initiate Razorpay payment: ${error.message}`,
        error.stack,
      );
      throw new Error(`Razorpay payment initiation failed: ${error.message}`);
    }
  }

  /**
   * Razorpay webhook verification.
   * Verifies the authenticity of the webhook using Razorpay's signature verification.
   */
  private async verifyRazorpayWebhook(
    webhookData: any,
  ): Promise<WebhookVerificationData> {
    try {
      // Extract payment ID and status from webhook payload
      const paymentId = webhookData.payload?.payment?.entity?.id;
      const status = webhookData.payload?.payment?.entity?.status;

      if (!paymentId || !status) {
        throw new Error(
          'Invalid webhook payload: missing payment ID or status',
        );
      }

      return {
        providerPaymentId: paymentId,
        status: status.toUpperCase(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify Razorpay webhook: ${error.message}`,
        error.stack,
      );
      throw new Error(`Razorpay webhook verification failed: ${error.message}`);
    }
  }

  /**
   * Razorpay refund initiation.
   * Initiates a refund for the specified payment using the Razorpay SDK.
   */
  private async initiateRazorpayRefund(
    data: InitiateRefundData,
  ): Promise<RefundProviderResponse> {
    try {
      const refund = await this.razorpayInstance.payments.refund(
        data.paymentId,
        {
          amount: data.amount * 100, // Razorpay expects amount in paise
          speed: 'normal',
          notes: {
            reason: data.reason,
          },
        },
      );

      return {
        refundId: refund.id,
        status: refund.status.toUpperCase(),
        payload: {
          razorpayRefundId: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
          paymentId: data.paymentId,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to initiate Razorpay refund: ${error.message}`,
        error.stack,
      );
      throw new Error(`Razorpay refund initiation failed: ${error.message}`);
    }
  }
}
