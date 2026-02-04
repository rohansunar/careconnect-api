import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderNumberService } from './order-number.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import { CancelOrderDto } from '../dto/cancel-order.dto';
import {
  CreateOrderFromCartDto,
  PaymentMode,
} from '../dto/create-order-from-cart.dto';
import { OrderStatus } from '../../common/constants/order-status.constants';
import { CartStatus } from '../../common/constants/order-status.constants';
import { PaymentStatus, Order, Customer, Vendor } from '@prisma/client';
import type { User } from '../../common/interfaces/user.interface';
import { PaymentService } from '../../payment/services/payment.service';
import { NotificationService } from '../../notification/services/notification.service';
import { PushNotificationService } from '../../notification/services/push-notification.service';
import { OrderNotificationPayloadDto } from '../../notification/dto/order-notification-payload.dto';
import { UserType } from '../../notification/dto/user-type.enum';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Interface for cart items with product details
 */
interface CartItemWithDetails {
  id: string;
  price: Decimal;
  quantity: number;
  product: {
    vendorId: string;
    vendor: { id: string };
  };
}

/**
 * Interface for cart with customer details
 */
interface CartWithDetails {
  id: string;
  customerId: string;
  customer: { id: string };
  cartItems: CartItemWithDetails[];
}

interface OrderWithRelations extends Order {
  customer: Customer | null;
  vendor: Vendor | null;
  address: any;
  payments: any[];
}

@Injectable()
export class CustomerOrderService extends OrderService {
  private readonly logger = new Logger(CustomerOrderService.name);
  private readonly CURRENCY = 'INR';

  constructor(
    prisma: PrismaService,
    cartService: CartService,
    orderNumberService: OrderNumberService,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
    private pushNotificationService: PushNotificationService,
  ) {
    super(prisma, cartService, orderNumberService);
  }

  /**
   * Creates a new order from an existing cart.
   * Handles the complete order creation workflow including:
   * - Cart validation
   * - Address validation
   * - Total calculation
   * - Payment initiation (for ONLINE mode)
   * - Order record creation
   * - Cart status update
   * - Push notification sending
   *
   * @param dto - The order creation data containing cartId and paymentMode
   * @param user - The authenticated customer user
   * @returns The created order with payment details
   */
  async createOrderFromCart(dto: CreateOrderFromCartDto, user: User) {
    this.logger.log(`Starting order creation for cart: ${dto.cartId}`);

    try {
      // Retrieve and validate cart details
      const cart = await this.cartService.validateCart(dto.cartId);

      // Verify cart belongs to the authenticated customer
      if (cart.customerId !== user.id) {
        throw new ForbiddenException(
          'You are not authorized to create an order from this cart',
        );
      }

      // Retrieve customer's default address
      const defaultAddress = await this.getDefaultAddressForCustomer(
        cart.customerId,
      );

      // Calculate total payment amount
      const totalAmount = this.calculateTotalAmount(cart.cartItems);

      let providerResponse: {
        provider: string;
        providerPaymentId: string;
        payload: Record<string, any>;
      } | null = null;

      // Create order using the parent service method
      const createdOrder = await super.createOrder(
        cart.customerId,
        cart.cartItems[0].product.vendorId,
        defaultAddress.id,
        cart.id,
        totalAmount,
        dto.paymentMode,
      );

      // Initiate payment with provider for ONLINE mode
      if (dto.paymentMode === PaymentMode.ONLINE) {
        providerResponse = await this.paymentService.initiatePayment({
          amount: totalAmount,
          currency: this.CURRENCY,
          orderId: createdOrder.id,
          notes: { orderId: createdOrder.id },
        });
        this.logger.debug(`Payment initiated with provider`);
      }

      const payment = (await this.prisma.payment.create({
        data: {
          amount: createdOrder.total_amount,
          currency: this.CURRENCY,
          provider: providerResponse?.provider || undefined,
          provider_payment_id: providerResponse?.providerPaymentId || undefined,
          provider_payload: providerResponse?.payload || undefined,
          status: PaymentStatus.PENDING,
        },
      })) as { id: string };

      await this.prisma.order.update({
        where: { id: createdOrder.id },
        data: { paymentId: payment.id },
      });

      // Update cart status to CHECKED_OUT
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { status: CartStatus.CHECKED_OUT },
      });

      this.logger.log(
        `Order created successfully: order ${createdOrder.orderNo}, payment ${providerResponse?.providerPaymentId || 'N/A'}`,
      );

      return {
        payment,
        description:"One time Product Purchase",
        customer: {
          name: createdOrder.customer.name,
          email: createdOrder.customer.email,
          phone: createdOrder.customer.phone,
        },
      };

      // Send push notification for order creation (non-blocking)
      // this.sendOrderCreatedNotification(order).catch((error) => {
      //   this.logger.error(`Failed to send notification for order ${order.id}`, {
      //     orderId: order.id,
      //     timestamp: new Date().toISOString(),
      //     error: error.message,
      //   });
      // });

      // return {
      //   order,
      //   payment: {
      //     id: order.paymentId,
      //     providerPaymentId: providerResponse?.providerPaymentId,
      //     amount: totalAmount,
      //     currency: this.CURRENCY,
      //     paymentMode: dto.paymentMode,
      //   },
      // };
    } catch (error) {
      this.logger.error(
        `Failed to create order for cart ${dto.cartId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieves the customer's default address.
   * @param customerId - The customer ID
   * @returns The default address
   * @throws BadRequestException if no default address found
   */
  private async getDefaultAddressForCustomer(customerId: string) {
    this.logger.debug(`Retrieving default address for customer: ${customerId}`);
    const address = await this.prisma.customerAddress.findFirst({
      where: { customerId, isDefault: true },
    });

    if (!address) {
      throw new BadRequestException(
        `No default address found for customer ${customerId}`,
      );
    }

    return address;
  }

  /**
   * Calculates the total amount for the cart items.
   * @param cartItems - The cart items
   * @returns The total amount
   */
  private calculateTotalAmount(cartItems: CartItemWithDetails[]): number {
    return cartItems.reduce(
      (sum, item) => sum + item.price.toNumber() * item.quantity,
      0,
    );
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
      // Build order notification payload
      const orderPayload = new OrderNotificationPayloadDto();
      orderPayload.orderId = order.id;
      orderPayload.orderNumber = order.orderNo;
      orderPayload.totalAmount = Number(order.total_amount);
      orderPayload.currency = this.CURRENCY;
      orderPayload.paymentMode = order.payment_mode;

      // Send notification to customer
      if (order.customer?.id) {
        await this.pushNotificationService.sendOrderCreatedNotification(
          order.customer.id,
          orderPayload,
        );
      }

      // Send notification to vendor
      if (order.vendor?.id) {
        await this.pushNotificationService.sendOrderToVendorNotification(
          order.vendor.id,
          orderPayload,
        );
      }

      this.logger.log(
        `Order created notifications sent for order ${order.orderNo}`,
      );
    } catch (error) {
      // Log error but don't fail the order creation
      this.logger.error(
        `Failed to send order created notifications for order ${order.orderNo}: ${error.message}`,
      );
    }
  }

  /**
   * Retrieves all orders for the authenticated customer.
   * @param user - The authenticated customer user
   * @param status - Optional status filter, can be string or array of strings
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @returns Array of customer's orders with relations
   */
  async getMyOrders(
    user: User,
    status?: string[],
    page: number = 1,
    limit: number = 10,
  ) {
    const statuses = status || [
      OrderStatus.PENDING,
      OrderStatus.OUT_FOR_DELIVERY,
    ];
    const query = {
      customerId: user.id,
      delivery_status: { in: statuses as any },
    };
    const include = {
      orderItems: {
        select: {
          id: true,
          price: true,
          quantity: true,
          product: { select: { name: true } },
        },
      },
      address: {
        select: {
          address: true,
          pincode: true,
          location: {
            select: {
              name: true,
              state: true,
              country: true,
            },
          },
        },
      },
      payment: {
        select: {
          status: true,
        },
      },
    };

    const skip = (page - 1) * limit;
    const orders = await super.findAll(query, skip, limit, include);
    const total = await this.prisma.order.count({ where: query });
    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Retrieves a single order by ID, ensuring it belongs to the customer.
   * @param id - The unique identifier of the order
   * @param user - The authenticated customer user
   * @returns The order with relations
   */
  async getMyOrder(id: string, user: User) {
    const order = await super.findOne(id);
    if (order.customerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return order;
  }

  /**
   * Cancels an order, ensuring it belongs to the customer.
   * @param orderId - The unique identifier of the order
   * @param dto - The cancellation data
   * @param user - The authenticated customer user
   * @returns The cancelled order with relations
   */
  async cancelMyOrder(orderId: string, dto: CancelOrderDto, user: User) {
    const order = await super.findOne(orderId);
    if (order.customerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return this.cancelOrder(orderId, dto, user);
  }

  /**
   * Cancels an order with proper validation and refund logic.
   * @param orderId - The unique identifier of the order
   * @param dto - The cancellation data
   * @param currentUser - The authenticated customer
   * @returns The cancelled order with relations
   */
  async cancelOrder(orderId: string, dto: CancelOrderDto, currentUser: User) {
    return this.prisma.$transaction(async (tx) => {
      // Find the order with related data
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: true,
          address: true,
          payments: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Check if the order belongs to the authenticated customer
      if (order.customerId !== currentUser.id) {
        throw new ForbiddenException(
          'You are not authorized to cancel this order',
        );
      }

      // Check if order can be cancelled
      this.validateOrderCancellation(order);

      // Find completed payments that need refund
      const completedPayments = order.payments.filter(
        (payment) => payment.status === PaymentStatus.PAID,
      );

      // Update order status and cancellation details
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          delivery_status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: dto.cancelReason,
          payment_status:
            completedPayments.length > 0 ? 'REFUNDED' : 'CANCELLED',
        },
        include: {
          customer: true,
          vendor: true,
          address: true,
          payments: true,
        },
      });

      // Process refunds for completed payments
      if (completedPayments.length > 0) {
        for (const payment of completedPayments) {
          try {
            await this.paymentService.initiateRefund(
              payment.id,
              Number(payment.amount),
              dto.cancelReason,
            );
          } catch (error) {
            console.error(
              `Failed to initiate refund for payment ${payment.id}:`,
              error,
            );
            // Continue with cancellation even if refund fails
            // In a real scenario, you might want to handle this differently
          }
        }
      }

      // Send cancellation notification
      await this.sendOrderCancellationNotification(updatedOrder);

      return {
        status: 200,
        message: 'Order Cancelled',
      };
    });
  }

  /**
   * Validates that an order can be cancelled based on business rules.
   * @param order - The order to validate
   * @throws BadRequestException if order cannot be cancelled
   */
  private validateOrderCancellation(order: OrderWithRelations) {
    // Check if order is already cancelled
    if (order.delivery_status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    // Check if order is delivered
    if (order.delivery_status === OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Order cannot be cancelled as it is already delivered',
      );
    }

    // Check if order is out for delivery
    if (order.delivery_status === OrderStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException(
        'Order cannot be cancelled as it is already out for delivery',
      );
    }

    // Add more business rules as needed
    // For example, you might have a time-based rule:
    // const orderAge = Date.now() - new Date(order.created_at).getTime();
    // const maxCancellationTime = 24 * 60 * 60 * 1000; // 24 hours
    // if (orderAge > maxCancellationTime) {
    //   throw new BadRequestException('Order cancellation time has expired');
    // }
  }

  /**
   * Sends notification when an order is cancelled.
   * @param order - The cancelled order with relations
   */
  private async sendOrderCancellationNotification(order: OrderWithRelations) {
    try {
      // Send notification to customer
      if (order.customer?.phone) {
        const message = `🚫 Order Cancelled
                            Order ID: ${order.orderNo}
                            Reason: ${order.cancelReason}
                            Amount: ₹${order.total_amount}

                            Your order has been successfully cancelled.`;

        await this.notificationService.sendWhatsApp(
          order.customer.phone,
          message,
        );
      }

      // Send notification to vendor
      if (order.vendor?.phone) {
        const message = `🚫 Order Cancelled
          Order ID: ${order.orderNo}
          Customer: ${order.customer?.name || 'N/A'}
          Amount: ₹${order.total_amount}
          Reason: ${order.cancelReason}

          Please update your inventory accordingly.`;

        await this.notificationService.sendWhatsApp(
          order.vendor.phone,
          message,
        );
      }
    } catch (error) {
      // Log error but don't fail the cancellation
      console.error('Failed to send cancellation notifications:', error);
    }
  }
}
