import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { PaymentProviderService } from './payment-provider.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentStatus } from '@prisma/client';

/**
 * Service for handling payment operations.
 * Manages payment creation, retrieval, and status updates.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private paymentProvider: PaymentProviderService,
  ) {}

  /**
   * Creates a new payment for an order.
   * @param dto - The payment creation data
   * @returns The created payment
   */
  async create(dto: CreatePaymentDto) {
    this.logger.log(`Creating payment for order: ${dto.orderId}`);

    // Validate order exists
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { customer: true, vendor: true },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Check if payment already exists for this order
    const existingPayment = await this.prisma.payment.findFirst({
      where: { order_id: dto.orderId },
    });

    if (existingPayment) {
      throw new BadRequestException('Payment already exists for this order');
    }

    try {
      // Initiate payment with provider
      const providerResponse = await this.paymentProvider.initiatePayment({
        amount: Number(order.total_amount),
        currency: 'INR',
        orderId: dto.orderId,
        customerId: order.customerId!,
        vendorId: order.vendorId!,
      });

      // Create payment record
      const payment = await this.prisma.payment.create({
        data: {
          order_id: dto.orderId,
          customer_id: order.customerId,
          vendor_id: order.vendorId,
          amount: order.total_amount,
          currency: 'INR',
          payment_mode: dto.paymentMode || 'ONLINE',
          provider: providerResponse.provider,
          provider_payment_id: providerResponse.providerPaymentId,
          provider_payload: providerResponse.payload,
          status: PaymentStatus.PENDING,
        },
        include: {
          order: true,
          customer: true,
          vendor: true,
        },
      });

      this.logger.log(`Payment created successfully: ${payment.id}`);
      return payment;
    } catch (error) {
      this.logger.error(
        `Failed to create payment: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to initiate payment');
    }
  }

  /**
   * Retrieves payment details by ID.
   * @param id - The payment ID
   * @returns The payment details
   */
  async findOne(id: string) {
    this.logger.log(`Retrieving payment: ${id}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: true,
        customer: true,
        vendor: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Handles webhook updates for payment status.
   * @param webhookData - The webhook payload
   * @returns Updated payment
   */
  async handleWebhook(webhookData: any) {
    this.logger.log(`Processing webhook for payment: ${webhookData.paymentId}`);

    try {
      // Verify webhook with provider
      const verifiedData =
        await this.paymentProvider.verifyWebhook(webhookData);

      // Find and update payment status
      const payment = await this.prisma.payment.findFirst({
        where: { provider_payment_id: verifiedData.providerPaymentId },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found for webhook');
      }

      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: verifiedData.status as PaymentStatus,
          completed_at:
            verifiedData.status === 'COMPLETED' ? new Date() : undefined,
          provider_payload: webhookData,
        },
        include: {
          order: true,
        },
      });

      // Update order payment status if payment completed
      if (verifiedData.status === PaymentStatus.COMPLETED) {
        await this.prisma.order.update({
          where: { id: payment.order_id! },
          data: { payment_status: 'PAID' },
        });
      }

      this.logger.log(
        `Payment status updated: ${payment.id} to ${verifiedData.status}`,
      );
      return payment;
    } catch (error) {
      this.logger.error(
        `Webhook processing failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Invalid webhook data');
    }
  }

  /**
   * Creates a payment for an order during order creation.
   * @param orderId - The order ID
   * @param customerId - The customer ID
   * @param vendorId - The vendor ID
   * @param amount - The payment amount
   * @returns The created payment
   */
  async createPaymentForOrder(
    orderId: string,
    customerId: string,
    vendorId: string,
    amount: number,
  ) {
    this.logger.log(`Creating payment for order: ${orderId}`);

    try {
      // Initiate payment with provider
      const providerResponse = await this.paymentProvider.initiatePayment({
        amount,
        currency: 'INR',
        orderId,
        customerId,
        vendorId,
      });

      // Create payment record
      const payment = await this.prisma.payment.create({
        data: {
          order_id: orderId,
          customer_id: customerId,
          vendor_id: vendorId,
          amount,
          currency: 'INR',
          payment_mode: 'ONLINE',
          provider: providerResponse.provider,
          provider_payment_id: providerResponse.providerPaymentId,
          provider_payload: providerResponse.payload,
          status: PaymentStatus.PENDING,
        },
      });

      this.logger.log(`Payment created for order: ${payment.id}`);
      return payment;
    } catch (error) {
      this.logger.error(
        `Failed to create payment for order: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
