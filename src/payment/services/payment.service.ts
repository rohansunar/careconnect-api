import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { PaymentProviderService } from './payment-provider.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentStatus, Order } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface CartWithDetails {
  id: string;
  customerId: string;
  customer: { id: string; };
  cartItems: {
    price: Decimal;
    quantity: number;
    product: {
      vendorId: string;
      vendor: { id: string; };
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
  private readonly DEFAULT_PAYMENT_MODE = 'ONLINE';
  private readonly PENDING_STATUS = PaymentStatus.PENDING;

  constructor(
    private prisma: PrismaService,
    private paymentProvider: PaymentProviderService,
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
      const cart = await this.retrieveAndValidateCart(dto.cartId);
      this.logger.debug(`Cart retrieved and validated: ${cart.id}`);

      // Extract vendor ID from cart items
      const vendorId = this.getVendorIdFromCart(cart);
      this.logger.debug(`Vendor ID extracted: ${vendorId}`);

      // Retrieve customer's default address
      const defaultAddress = await this.getDefaultAddressForCustomer(cart.customerId);
      this.logger.debug(`Default address retrieved: ${defaultAddress.id}`);

      // Calculate total payment amount
      const totalAmount = this.calculateTotalAmount(cart.cartItems);
      this.logger.debug(`Total amount calculated: ${totalAmount}`);

      // Initiate payment with provider
      const providerResponse = await this.initiatePayment(totalAmount, cart.customerId, vendorId, dto.cartId);
      this.logger.debug(`Payment initiated with provider`);

      // Create payment record in database
      const payment = await this.createPaymentRecord(dto.cartId, cart.customerId, vendorId, totalAmount, dto.paymentMode, providerResponse);
      this.logger.debug(`Payment record created: ${payment.id}`);

      // Create associated order
      const order = await this.createOrder(cart, defaultAddress.id, totalAmount, payment);
      this.logger.debug(`Order created: ${order.id}`);

      this.logger.log(`Payment and order created successfully: payment ${payment.id}, order ${order.id}`);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to create payment for cart ${dto.cartId}: ${error.message}`, error.stack);
      throw error; // Re-throw to maintain error handling
    }
  }

  /**
   * Retrieves and validates the cart with all necessary details.
   * @param cartId - The cart ID
   * @returns The validated cart with details
   * @throws NotFoundException if cart not found
   * @throws BadRequestException if cart is empty
   */
  private async retrieveAndValidateCart(cartId: string): Promise<CartWithDetails> {
    this.logger.debug(`Retrieving cart: ${cartId}`);
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        customer: true,
        cartItems: {
          include: {
            product: {
              include: {
                vendor: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    if (!cart.cartItems || cart.cartItems.length === 0) {
      throw new BadRequestException(`Cart ${cartId} is empty`);
    }

    return cart as unknown as CartWithDetails;
  }

  /**
   * Extracts the vendor ID from the cart items.
   * Assumes all items belong to the same vendor.
   * @param cart - The cart with details
   * @returns The vendor ID
   * @throws BadRequestException if vendor not found
   */
  private getVendorIdFromCart(cart: CartWithDetails): string {
    const vendorId = cart.cartItems[0].product.vendorId;
    if (!vendorId) {
      throw new BadRequestException('Vendor not found for cart items');
    }
    return vendorId;
  }

  /**
   * Retrieves the customer's default address.
   * @param customerId - The customer ID
   * @returns The default address
   * @throws BadRequestException if no default address found
   */
  private async getDefaultAddressForCustomer(customerId: string): Promise<CustomerAddressWithId> {
    this.logger.debug(`Retrieving default address for customer: ${customerId}`);
    const address = await this.prisma.customerAddress.findFirst({
      where: { customerId, isDefault: true },
    });

    if (!address) {
      throw new BadRequestException(`No default address found for customer ${customerId}`);
    }

    return address as CustomerAddressWithId;
  }

  /**
   * Calculates the total amount for the cart items.
   * @param cartItems - The cart items
   * @returns The total amount
   */
  private calculateTotalAmount(cartItems: CartWithDetails['cartItems']): number {
    return cartItems.reduce((sum, item) => sum + item.price.toNumber() * item.quantity, 0);
  }

  /**
   * Initiates payment with the payment provider.
   * @param amount - The payment amount
   * @param customerId - The customer ID
   * @param vendorId - The vendor ID
   * @param cartId - The cart ID (used as order ID)
   * @returns The provider response
   */
  private async initiatePayment(amount: number, customerId: string, vendorId: string, cartId: string): Promise<PaymentProviderResponse> {
    return await this.paymentProvider.initiatePayment({
      amount,
      currency: this.CURRENCY,
      orderId: cartId,
      customerId,
      vendorId,
    });
  }

  /**
   * Creates a payment record in the database.
   * @param cartId - The cart ID
   * @param customerId - The customer ID
   * @param vendorId - The vendor ID
   * @param amount - The payment amount
   * @param paymentMode - The payment mode
   * @param providerResponse - The provider response
   * @returns The created payment
   */
  private async createPaymentRecord(
    cartId: string,
    customerId: string,
    vendorId: string,
    amount: number,
    paymentMode: string | undefined,
    providerResponse: PaymentProviderResponse,
  ): Promise<PaymentWithId> {
    return await this.prisma.payment.create({
      data: {
        customer_id: customerId,
        vendor_id: vendorId,
        amount,
        currency: this.CURRENCY,
        payment_mode: paymentMode || this.DEFAULT_PAYMENT_MODE,
        provider: providerResponse.provider,
        provider_payment_id: providerResponse.providerPaymentId,
        provider_payload: providerResponse.payload,
        status: this.PENDING_STATUS,
      },
      include: {
        customer: true,
        vendor: true,
      },
    }) as PaymentWithId;
  }

  /**
   * Creates an order associated with the payment.
   * @param cart - The cart details
   * @param addressId - The address ID
   * @param totalAmount - The total amount
   * @param payment - The payment record
   * @returns The created order
   */
  private async createOrder(cart: CartWithDetails, addressId: string, totalAmount: number, payment: PaymentWithId): Promise<Order> {
    // Increment order counter
    const counter = await this.prisma.counter.upsert({
      where: { type: 'order' },
      update: { lastNumber: { increment: 1 } },
      create: { type: 'order', lastNumber: 1 },
    });

    const orderNo = 'O' + counter.lastNumber.toString().padStart(6, '0');

    // Create order
    const order = await this.prisma.order.create({
      data: {
        orderNo,
        customerId: cart.customerId,
        vendorId: cart.cartItems[0].product.vendorId,
        addressId,
        cartId: cart.id,
        total_amount: totalAmount,
        status: 'PENDING',
        payment_status: 'PENDING',
      },
      include: {
        customer: true,
        vendor: true,
        address: true,
        cart: {
          include: {
            cartItems: true,
          },
        },
      },
    });

    // Update cart status to checked out
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { status: 'CHECKED_OUT' },
    });

    // Link payment to order
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { order_id: order.id },
    });

    return order;
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
  async handleWebhook(webhookData: Record<string, any>) {
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
      if (verifiedData.status === PaymentStatus.PAID) {
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
        currency: this.CURRENCY,
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
          currency: this.CURRENCY,
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
          customer: true,
          vendor: true,
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
