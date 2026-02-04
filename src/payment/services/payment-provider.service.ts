import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import {
  InitiatePaymentData,
  ProviderResponse,
  RefundProviderResponse,
  WebhookVerificationData,
  InitiateRefundData,
} from '../interfaces/payment.interface';

/**
 * Service for handling Razorpay payment provider integration.
 */
@Injectable()
export class PaymentProviderService {
  private readonly logger = new Logger(PaymentProviderService.name);
  private readonly provider: string;
  private razorpayInstance: Razorpay;

  constructor(private configService: ConfigService) {
    this.provider = 'RAZORPAY';

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

  /**
   * Initiates a payment with Razorpay.
   * @param data - Payment initiation data
   * @returns Provider response
   */
  async initiatePayment(data: InitiatePaymentData): Promise<ProviderResponse> {
    this.logger.log(
      `Initiating payment for order: ${data.orderId} with provider: ${this.provider}`,
    );

    return this.initiateRazorpayPayment(data);
  }

  /**
   * Verifies and processes webhook data from Razorpay.
   * @param webhookData - Raw webhook payload
   * @param signature - Optional webhook signature for verification
   * @returns Verified webhook data
   */
  async verifyWebhook(
    webhookData: any,
    signature?: string,
  ): Promise<WebhookVerificationData> {
    this.logger.log(`Verifying webhook with provider: ${this.provider}`);

    if (signature) {
      const isValid = await this.verifyRazorpayWebhookSignature(
        webhookData,
        signature,
      );
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }

    return this.verifyRazorpayWebhook(webhookData);
  }

  /**
   * Initiates a refund with Razorpay.
   * @param data - Refund initiation data
   * @returns Refund provider response
   */
  async initiateRefund(
    data: InitiateRefundData,
  ): Promise<RefundProviderResponse> {
    this.logger.log(
      `Initiating refund for payment: ${data.paymentId} with provider: ${this.provider}`,
    );

    return this.initiateRazorpayRefund(data);
  }

  /**
   * Verifies Razorpay webhook signature for security.
   * @param webhookData - Raw webhook payload
   * @param signature - Signature from Razorpay header
   * @returns True if signature is valid
   */
  private async verifyRazorpayWebhookSignature(
    webhookData: any,
    signature: string,
  ): Promise<boolean> {
    try {
      const webhookSecret = this.configService.get<string>(
        'RAZORPAY_WEBHOOK_SECRET',
      );

      if (!webhookSecret) {
        this.logger.warn('Razorpay webhook secret not configured');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      this.logger.error(
        `Failed to verify webhook signature: ${error.message}`,
        error.stack,
      );
      return false;
    }
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
        amount: data.amount * 100,
        currency: data.currency,
        receipt: data.orderId,
        payment_capture: 1,
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
   * Extracts payment ID and status from webhook payload.
   */
  private async verifyRazorpayWebhook(
    webhookData: any,
  ): Promise<WebhookVerificationData> {
    try {
      const paymentId = webhookData.payload?.payment?.entity?.order_id;
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
          amount: data.amount * 100,
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
