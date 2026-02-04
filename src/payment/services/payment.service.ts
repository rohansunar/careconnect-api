import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { PaymentProviderService } from './payment-provider.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import {
  PaymentStatus,
  Order,
  PaymentMode,
  SubscriptionStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderService } from '../../order/services/order.service';
import { CartService } from '../../cart/services/cart.service';
import { CartStatus } from '../../common/constants/order-status.constants';
import { OrderNotificationPayloadDto } from '../../notification/dto/order-notification-payload.dto';
import { PushNotificationService } from '../../notification/services/push-notification.service';

interface CartWithDetails {
  id: string;
  customerId: string;
  customer: { id: string };
  cartItems: {
    price: Decimal;
    quantity: number;
    product: {
      vendorId: string;
      vendor: { id: string };
    };
  }[];
}

interface PaymentProviderResponse {
  provider: string;
  providerPaymentId: string;
  payload: Record<string, any>;
}

interface CustomerAddressWithId {
  id: string;
}

export interface PaymentWithId {
  id: string;
}

/**
 * Service for handling payment operations.
 * Manages payment creation, retrieval, and status updates.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly CURRENCY = 'INR';
  private readonly PENDING_STATUS = PaymentStatus.PENDING;

  constructor(
    private prisma: PrismaService,
    private paymentProvider: PaymentProviderService,
    private orderService: OrderService,
    private cartService: CartService,
    private pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Creates a new payment for a cart.
   * Orchestrates the payment creation process including validation, calculation, and record creation.
   * @param dto - The payment creation data
   * @returns The created payment
   */
  async create(dto: CreatePaymentDto) {
    this.logger.log(`Starting payment creation for cart: ${dto.cartId}`);

    try {
      // Retrieve and validate cart details
      const cart = await this.cartService.validateCart(dto.cartId);

      // Retrieve customer's default address
      const defaultAddress = await this.getDefaultAddressForCustomer(
        cart.customerId,
      );
      // Calculate total payment amount
      const totalAmount = this.calculateTotalAmount(cart.cartItems);

      let providerResponse: PaymentProviderResponse | null = null;

      if (dto.paymentMode === 'ONLINE') {
        // Initiate payment with provider
        providerResponse = await this.paymentProvider.initiatePayment({
          amount: totalAmount,
          currency: this.CURRENCY,
          orderId: dto.cartId,
        });
        this.logger.debug(`Payment initiated with provider`);
      }

      // Create payment record in database
      const payment = await this.createPaymentRecord(
        totalAmount,
        providerResponse,
      );
      this.logger.debug(`Payment record created: ${payment.id}`);

      const order = await this.orderService.createOrder(
        cart.customerId,
        cart.cartItems[0].product.vendorId,
        defaultAddress.id,
        cart.id,
        totalAmount,
        dto.paymentMode,
        payment.id,
      );

      // Update cart status to CHECKED_OUT
      await this.cartService.updateCartStatus(cart.id, CartStatus.CHECKED_OUT);

      // Link payment to order
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { order_id: order.id },
      });

      this.logger.log(
        `Payment and order created successfully: payment ${payment.id}, order ${order.id}`,
      );
      // For COD or MONTHLY, create order and delete cart
      if (dto.paymentMode === 'COD' || dto.paymentMode === 'MONTHLY') {
        // Send push notification for order creation
        await this.sendOrderCreatedNotification(order);
      }

      return payment;
    } catch (error) {
      this.logger.error(
        `Failed to create payment for cart ${dto.cartId}: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to maintain error handling
    }
  }

  /**
   * Sends push notification when an order is created.
   * Notifies both the customer and vendor about the new order.
   * @param order - The created order with relations
   */
  private async sendOrderCreatedNotification(
    order: any | Order,
  ): Promise<void> {
    try {
      // Build order notification payload for customer
      const orderPayload = new OrderNotificationPayloadDto();
      orderPayload.orderId = order.id;
      orderPayload.orderNumber = order.orderNo;
      orderPayload.totalAmount = Number(order.total_amount);
      orderPayload.currency = this.CURRENCY;
      orderPayload.paymentMode = order.payment_mode;

      if (order && order?.customer?.id) {
        // Send notification to customer
        await this.pushNotificationService.sendOrderCreatedNotification(
          order.customer.id,
          orderPayload,
        );
      }
    } catch (error) {
      // Log error but don't fail the order creation
      this.logger.error(
        `Failed to send order created notifications for order ${order.orderNo}: ${error.message}`,
      );
    }
  }

  /**
   * Retrieves the customer's default address.
   * @param customerId - The customer ID
   * @returns The default address
   * @throws BadRequestException if no default address found
   */
  private async getDefaultAddressForCustomer(
    customerId: string,
  ): Promise<CustomerAddressWithId> {
    this.logger.debug(`Retrieving default address for customer: ${customerId}`);
    const address = await this.prisma.customerAddress.findFirst({
      where: { customerId, isDefault: true },
    });

    if (!address) {
      throw new BadRequestException(
        `No default address found for customer ${customerId}`,
      );
    }

    return address as CustomerAddressWithId;
  }

  /**
   * Calculates the total amount for the cart items.
   * @param cartItems - The cart items
   * @returns The total amount
   */
  private calculateTotalAmount(
    cartItems: CartWithDetails['cartItems'],
  ): number {
    return cartItems.reduce(
      (sum, item) => sum + item.price.toNumber() * item.quantity,
      0,
    );
  }

  /**
   * Creates a payment record in the database.
   * @param amount - The payment amount
   * @param providerResponse - The provider response (optional for non-ONLINE modes)
   * @returns The created payment
   */
  private async createPaymentRecord(
    amount: number,
    providerResponse?: PaymentProviderResponse | null,
  ): Promise<PaymentWithId> {
    return (await this.prisma.payment.create({
      data: {
        amount,
        currency: this.CURRENCY,
        provider: providerResponse?.provider || undefined,
        provider_payment_id: providerResponse?.providerPaymentId || undefined,
        provider_payload: providerResponse?.payload || undefined,
        status: this.PENDING_STATUS,
      },
    })) as PaymentWithId;
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
   * @param signature - Optional webhook signature for verification
   * @returns Updated payment
   */
  async handleWebhook(webhookData: Record<string, any>, signature?: string) {
    this.logger.log(`Processing webhook for payment`);
    try {
      // Verify webhook with provider
      const verifiedData = await this.paymentProvider.verifyWebhook(
        webhookData,
        signature,
      );

      // Find and update payment status
      const payment = await this.prisma.payment.findFirst({
        where: { provider_payment_id: verifiedData.providerPaymentId },
        include: { order: true }, 
      });

      if (!payment) {
        console.log("verifiedData.providerPaymentId",verifiedData.providerPaymentId, payment)
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
   * Updates payment status, order payment status, and subscription status.
   * Creates a review payment record for admin approval.
   * @param payment - The existing payment record
   * @param webhookData - The webhook payload
   * @returns Result object
   */
  private async handleSuccessfulPayment(
    payment: any,
    webhookData: any,
  ): Promise<{ success: boolean; action: string }> {
    this.logger.log(`Processing successful payment: ${payment.id}`);

    try {
      // 1. Update existing Payment record
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          completed_at: new Date(),
          provider_payload: webhookData,
        },
      });

      // 2. Update Order payment status if linked
      if (payment.order_id) {
        await this.prisma.order.update({
          where: { id: payment.order_id },
          data: { payment_status: 'PAID' },
        });
      }

      // 3. Update Subscription status to ACTIVE
      await this.updateSubscriptionStatus(
        payment.order?.subscriptionId,
        payment.metadata as any,
        SubscriptionStatus.ACTIVE,
      );

      // 4. Create NEW Payment record for admin review queue
      // await this.prisma.payment.create({
      //   data: {
      //     order_id: payment.order_id,
      //     amount: payment.amount,
      //     currency: 'INR',
      //     provider: 'RAZORPAY',
      //     provider_payment_id: `${payment.provider_payment_id}_review_${Date.now()}`,
      //     status: PaymentStatus.PAID,
      //     completed_at: new Date(),
      //     reconciled: false, // Pending admin approval
      //     provider_payload: webhookData,
      //     metadata: {
      //       originalPaymentId: payment.id,
      //       subscriptionId:
      //         payment.order?.subscriptionId ||
      //         (payment.metadata as any)?.subscriptionId,
      //       reviewType: 'subscription_payment',
      //     },
      //   },
      // });

      this.logger.log(`Payment success processed: ${payment.id}`);
      return { success: true, action: 'payment_success' };
    } catch (error) {
      this.logger.error(
        `Failed to process successful payment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handles failed payment webhook.
   * Updates payment status, order payment status, and subscription status.
   * Creates a failed payment record for admin review.
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
      // 1. Update existing Payment record
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          provider_payload: webhookData,
        },
      });

      // 2. Update Order payment status
      if (payment.order_id) {
        await this.prisma.order.update({
          where: { id: payment.order_id },
          data: { payment_status: 'FAILED' },
        });
      }

      // 3. Update Subscription to PROCESSING (requires retry)
      await this.updateSubscriptionStatus(
        payment.order?.subscriptionId,
        payment.metadata as any,
        SubscriptionStatus.PROCESSING,
      );

      // 4. Create FAILED Payment record for admin review
      // await this.prisma.payment.create({
      //   data: {
      //     order_id: payment.order_id,
      //     amount: payment.amount,
      //     currency: 'INR',
      //     provider: 'RAZORPAY',
      //     provider_payment_id: `${payment.provider_payment_id}_failed_${Date.now()}`,
      //     status: PaymentStatus.FAILED,
      //     reconciled: false,
      //     provider_payload: webhookData,
      //     metadata: {
      //       originalPaymentId: payment.id,
      //       subscriptionId: payment.order?.subscriptionId,
      //       reviewType: 'payment_failed',
      //     },
      //   },
      // });

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
   * Creates a refunded payment record for admin review.
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
      // 1. Update existing Payment record
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
          provider_payload: webhookData,
        },
      });

      // 2. Update Order payment status
      if (payment.order_id) {
        await this.prisma.order.update({
          where: { id: payment.order_id },
          data: { payment_status: 'REFUNDED' },
        });
      }

      // 3. Update Subscription to INACTIVE
      await this.updateSubscriptionStatus(
        payment.order?.subscriptionId,
        payment.metadata as any,
        SubscriptionStatus.INACTIVE,
      );

      // // 4. Create REFUNDED Payment record for admin review
      // await this.prisma.payment.create({
      //   data: {
      //     order_id: payment.order_id,
      //     amount: payment.amount,
      //     currency: 'INR',
      //     provider: 'RAZORPAY',
      //     provider_payment_id: `${payment.provider_payment_id}_refunded_${Date.now()}`,
      //     status: PaymentStatus.REFUNDED,
      //     reconciled: false,
      //     provider_payload: webhookData,
      //     metadata: {
      //       originalPaymentId: payment.id,
      //       subscriptionId: payment.order?.subscriptionId,
      //       reviewType: 'payment_refunded',
      //     },
      //   },
      // });

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
   * Updates subscription status if subscription ID is available.
   * @param subscriptionId - The subscription ID from order or metadata
   * @param metadata - The payment metadata
   * @param status - The new status
   */
  private async updateSubscriptionStatus(
    subscriptionId: string | null | undefined,
    metadata: Record<string, any> | null,
    status: SubscriptionStatus,
  ): Promise<void> {
    // Try to get subscription ID from order first, then from metadata
    const subId = subscriptionId || metadata?.subscriptionId;

    if (subId) {
      await this.prisma.subscription.update({
        where: { id: subId },
        data: { status },
      });
      this.logger.log(`Subscription ${subId} updated to ${status}`);
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
        include: { order: true },
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
          order: true,
        },
      });
      // Update order payment status
      await this.prisma.order.update({
        where: { id: payment.order_id! },
        data: { payment_status: 'REFUNDED' },
      });

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
