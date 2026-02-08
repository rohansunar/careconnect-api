import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { PaymentProviderService } from './payment-provider.service';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';

import {
  InitiatePaymentData,
  PaymentProviderResponse,
} from '../../payment/interfaces/payment.interface';
import { EventBus } from '@nestjs/cqrs';
import { PaymentSucceededEvent } from './payment-succeeded.event';

/**
 * Service for handling payment operations.
 * Manages payment initiation, retrieval, status updates, and refunds.
 * This service is focused on payment gateway communication only.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private paymentProvider: PaymentProviderService,
    private readonly eventBus: EventBus,
    private readonly idempotencyService: WebhookIdempotencyService,
  ) {}

  async initiatePayment(
    data: InitiatePaymentData,
  ): Promise<PaymentProviderResponse> {
    this.logger.log(
      `Initiating payment for order: ${data.orderId} with amount: ${data.amount} ${data.currency}`,
    );

    try {
      const providerResponse = await this.paymentProvider.initiatePayment({
        amount: data.amount,
        currency: data.currency,
        orderId: data.orderId,
        notes: data.notes || {},
      });

      this.logger.log(
        `Payment initiated successfully with provider: ${providerResponse.providerPaymentId}`,
      );

      return providerResponse;
    } catch (error) {
      this.logger.error(
        `Failed to initiate payment for order ${data.orderId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to initiate payment: ${error.message}`,
      );
    }
  }

  /**
   * Retrieves payment details by ID.
   * @param id - The payment ID
   * @returns The payment details with order relation
   */
  async findOne(id: string) {
    this.logger.log(`Retrieving payment: ${id}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        orders: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Handles webhook updates for payment status from the provider.
   * Implements idempotency to prevent duplicate processing.
   * @param webhookData - The webhook payload from payment provider
   * @param signature - Optional webhook signature for verification
   * @returns Updated payment or status result
   * @throws ConflictException - If the event has already been processed
   */
  async handleWebhook(webhookData: Record<string, any>, signature?: string) {
    this.logger.log(`Processing webhook for payment`);
    try {
      const isFirstTime = await this.idempotencyService.ensureNotProcessed(
        webhookData.payload.order.entity.id,
        webhookData.event,
        webhookData,
      );

      if (!isFirstTime) {
        return { success: true };
      } // ACK duplicate safely

      // Verify webhook with provider
      const verifiedData = await this.paymentProvider.verifyWebhook(
        webhookData,
        signature,
      );

      // Find and update payment status
      const payment = await this.prisma.payment.findFirst({
        where: { provider_payment_id: verifiedData.providerPaymentId },
        include: { orders: true },
      });

      if (!payment) {
        this.logger.warn(
          `Payment not found for provider payment ID: ${verifiedData.providerPaymentId}`,
        );
        throw new NotFoundException('Payment not found for webhook');
      }

      // Route by payment status
      const status = verifiedData.status.toUpperCase();

      switch (status) {
        case 'CAPTURED':
        case 'PAID':
        case 'COMPLETED':
          return this.handleSuccessfulPayment(payment, webhookData);
        case 'FAILED':
          return this.handleFailedPayment(payment, webhookData);
        case 'REFUNDED':
          return this.handleRefundedPayment(payment, webhookData);
        default:
          this.logger.warn(`Unknown payment status: ${status}`);
          return payment;
      }
    } catch (error) {
      this.logger.error(
        `Webhook processing failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Invalid webhook data');
    }
  }

  /**
   * Handles successful payment webhook.
   * Updates payment status, order payment status, subscription status,
   * and creates ledger entries for sales and platform fees.
   * @param payment - The existing payment record
   * @param webhookData - The webhook payload
   * @returns Result object
   */
  private async handleSuccessfulPayment(
    payment: any,
    webhookData: any,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Processing successful payment: ${payment.id}`);

    try {
      const notes = webhookData.payload?.payment?.entity?.notes;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          completed_at: new Date(),
          provider_payload: webhookData,
        },
      });
      // 🔔 ANNOUNCE FACT (BELL RINGS)
      this.eventBus.publish(
        new PaymentSucceededEvent(
          payment,
          webhookData,
          notes.orderId,
          notes.subscribeID,
          payment.amount,
          payment.payment_mode,
        ),
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to process successful payment: ${error.message}`,
        error.stack,
      );
      return { success: false };
      // Log error but don't fail the entire payment processing for ledger issues
      // The core payment and order status updates are more critical
      // return { success: true, action: 'payment_success_ledger_error' };
    }
  }

  /**
   * Handles failed payment webhook.
   * Updates payment status and order payment status.
   * @param payment - The existing payment record
   * @param webhookData - The webhook payload
   * @returns Result object
   */
  private async handleFailedPayment(
    payment: any,
    webhookData: any,
  ): Promise<{ success: boolean; action: string }> {
    this.logger.log(`Processing failed payment: ${payment.id}`);

    try {
      const notes = webhookData.payload?.payment?.entity?.notes;
      // Update existing Payment record
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          provider_payload: webhookData,
        },
      });

      // Update Order payment status
      if (notes.orderId) {
        await this.prisma.order.update({
          where: { id: notes.orderId },
          data: { payment_status: 'FAILED' },
        });
      }

      this.logger.log(`Payment failure processed: ${payment.id}`);
      return { success: true, action: 'payment_failed' };
    } catch (error) {
      this.logger.error(
        `Failed to process failed payment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handles refunded payment webhook.
   * Updates payment status, order payment status, and subscription status.
   * @param payment - The existing payment record
   * @param webhookData - The webhook payload
   * @returns Result object
   */
  private async handleRefundedPayment(
    payment: any,
    webhookData: any,
  ): Promise<{ success: boolean; action: string }> {
    this.logger.log(`Processing refunded payment: ${payment.id}`);

    try {
      // Update existing Payment record
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
          provider_payload: webhookData,
        },
      });

      // Update Order payment status
      const refundedOrderId = payment.orders?.[0]?.id;
      if (refundedOrderId) {
        await this.prisma.order.update({
          where: { id: refundedOrderId },
          data: { payment_status: 'REFUNDED' },
        });
      }

      const subscriptionId =
        webhookData.payload?.payment?.entity?.notes?.subscribeID;
      if (subscriptionId) {
        await this.prisma.subscription.update({
          where: { id: subscriptionId },
          data: { status: SubscriptionStatus.DELETED },
        });
        this.logger.log(
          `Subscription ${subscriptionId} updated to ${SubscriptionStatus.DELETED}`,
        );
      }

      this.logger.log(`Payment refund processed: ${payment.id}`);
      return { success: true, action: 'payment_refunded' };
    } catch (error) {
      this.logger.error(
        `Failed to process refunded payment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Initiates a refund for a payment.
   * @param paymentId - The payment ID to refund
   * @param amount - The refund amount
   * @param reason - The reason for refund
   * @returns The refund result
   */
  async initiateRefund(paymentId: string, amount: number, reason: string) {
    this.logger.log(`Initiating refund for payment: ${paymentId}`);

    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { orders: true },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.PAID) {
        throw new BadRequestException('Can only refund completed payments');
      }

      if (!payment.provider_payment_id) {
        throw new BadRequestException('Payment provider ID not found');
      }

      // Initiate refund with provider
      const refundResult = await this.paymentProvider.initiateRefund({
        paymentId: payment.provider_payment_id,
        amount,
        reason,
      });

      // Update payment status to REFUNDED
      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          provider_payload: {
            ...((payment.provider_payload as any) || {}),
            refund: refundResult as any,
          },
        },
        include: {
          orders: true,
        },
      });

      // Update order payment status
      const refundOrderId = payment.orders?.[0]?.id;
      if (refundOrderId) {
        await this.prisma.order.update({
          where: { id: refundOrderId },
          data: { payment_status: 'REFUNDED' },
        });
      }

      this.logger.log(`Refund initiated successfully: ${paymentId}`);
      return updatedPayment;
    } catch (error) {
      this.logger.error(
        `Failed to initiate refund: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to initiate refund');
    }
  }
}
