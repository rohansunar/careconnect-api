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
import {
  PaymentStatus,
  Order,
  Customer,
  Vendor,
  Payment,
  Prisma,
} from '@prisma/client';
import type { User } from '../../common/interfaces/user.interface';
import { PaymentService } from '../../payment/services/payment.service';
import { OrderNotificationOrchestrator } from '../../notification/services/orchestrators/order-notification.orchestrator';
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

interface OrderWithRelations extends Order {
  customer: Customer | null;
  vendor: Vendor | null;
  address: any;
  payment: Payment | null;
}

/**
 * Interface for filtering orders by optional criteria.
 * Supports filtering by delivery status, payment mode, and payment status.
 */
export interface OrderFiltersDto {
  /** Optional delivery status filter */
  status?: OrderStatus[];
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
    private orderNotificationOrchestrator: OrderNotificationOrchestrator,
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
          provider: providerResponse?.provider || 'COD',
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
        description: 'One time Product Purchase',
        customer: {
          name: createdOrder.customer.name,
          email: createdOrder.customer.email,
          phone: createdOrder.customer.phone,
        },
      };
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
   * Note: Order creation notifications are now handled automatically
   * by the OnPaymentSucceededNotificationHandler after successful payment.
   * This ensures notifications are only sent for paid orders.
   */

  private buildIncludeQuery() {
    return {
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
  }

  /**
   * Builds a Prisma query for filtering orders based on user and optional filters.
   * Preserves the original business logic: orders with ONLINE+PAID or COD+PENDING,
   * excluding cancelled orders.
   * @param userId - The customer ID
   * @param filters - Optional filter parameters
   * @returns Prisma.OrderWhereInput for database query
   */
  private buildOrderQuery(
    userId: string,
    filters?: OrderFiltersDto,
  ): Prisma.OrderWhereInput {
    // Base query: customer must match
    const baseQuery: Prisma.OrderWhereInput = {
      customerId: userId,
    };
    // Orders for Active Tab
    // If no filters provided, return base query with default OR logic
    if (!filters || !filters.status) {
      return {
        ...baseQuery,
        OR: [
          // Online orders that are successfully paid
          {
            AND: [
              { payment_mode: { in: [PaymentMode.ONLINE] } },
              { payment_status: { in: [PaymentStatus.PAID] } },
              {
                delivery_status: {
                  notIn: [OrderStatus.CANCELLED, OrderStatus.DELIVERED],
                },
              },
            ],
          },
          // COD orders that are still pending payment
          {
            AND: [
              { payment_mode: { in: [PaymentMode.COD] } },
              { payment_status: { in: [PaymentStatus.PENDING] } },
              { delivery_status: { notIn: [OrderStatus.CANCELLED] } },
            ],
          },
        ],
      };
    }
    // Orders for History Tab
    return {
      ...baseQuery,
      OR: [
        // Case 1: Online payment still pending & not delivered yet
        {
          AND: [
            { payment_mode: { in: [PaymentMode.ONLINE] } },
            {
              payment_status: {
                in: [PaymentStatus.PENDING, PaymentStatus.FAILED],
              },
            },
            {
              delivery_status: {
                in: [OrderStatus.PENDING, OrderStatus.CANCELLED],
              },
            },
          ],
        },
        // Case 2: Online paid but order got cancelled
        {
          AND: [
            { payment_mode: { in: [PaymentMode.ONLINE] } },
            { payment_status: { in: [PaymentStatus.PAID] } },
            {
              delivery_status: {
                in: [OrderStatus.CANCELLED, OrderStatus.DELIVERED],
              },
            },
          ],
        },
        // COD orders that are still pending payment but order Cancelled
        {
          AND: [
            { payment_mode: { in: [PaymentMode.COD] } },
            { payment_status: { in: [PaymentStatus.PENDING] } },
            { delivery_status: { in: [OrderStatus.CANCELLED] } },
          ],
        },
        // COD orders that are Delivered
        {
          AND: [
            { payment_mode: { in: [PaymentMode.COD] } },
            { payment_status: { in: [PaymentStatus.PAID] } },
            { delivery_status: { in: [OrderStatus.DELIVERED] } },
          ],
        },
      ],
    };
  }

  /**
   * Retrieves all orders for the authenticated customer.
   * Supports filtering by delivery_status, payment_mode, and payment_status.
   *
   * @param user - The authenticated customer user
   * @param statusOrFilters - Either status array (old style) or OrderFiltersDto (new style)
   * @param paymentMode - PaymentMode array (old style) or page number (new style)
   * @param paymentStatus - PaymentStatus array (old style) or limit number (new style)
   * @param page - Page number for pagination (new style only)
   * @param limit - Number of items per page (new style only)
   * @returns Array of customer's orders with relations and pagination info
   */
  async getMyOrders(
    user: User,
    status?: OrderStatus[],
    page: number = 1,
    limit: number = 10,
  ) {
    // Determine if using old or new parameter style
    let filters: OrderFiltersDto | undefined;
    const resolvedPage = page;
    const resolvedLimit = limit;

    // Check if first parameter is OrderFiltersDto (new style)
    if (status && typeof status === 'object') {
      filters = {
        status: status as OrderStatus[] | undefined,
      };
    }
    // Build the query
    const query = this.buildOrderQuery(user.id, filters);
    const include = this.buildIncludeQuery();
    const skip = (resolvedPage - 1) * resolvedLimit;
    const orders = await super.findAll(query, skip, resolvedLimit, include);
    const total = await this.prisma.order.count({ where: query });
    return {
      orders,
      total,
      page: resolvedPage,
      limit: resolvedLimit,
      totalPages: Math.ceil(total / resolvedLimit),
    };
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
          payment: true,
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

      // Find completed payment that needs refund
      const completedPayment = order.payment;
      const hasCompletedPayment =
        completedPayment?.status === PaymentStatus.PAID;

      // Update order status and cancellation details
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          delivery_status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: dto.cancelReason,
          // payment_status: hasCompletedPayment ? 'REFUNDED' : 'CANCELLED',
          cancellation_origin:'CUSTOMER'
        },
        include: {
          customer: true,
          vendor: true,
          address: true,
          payment: true,
        },
      });

      // Process refund for completed payment
      if (hasCompletedPayment && completedPayment) {
        try {
          await this.paymentService.initiateRefund(
            completedPayment.id,
            Number(completedPayment.amount),
            dto.cancelReason,
          );
        } catch (error) {
          console.error(
            `Failed to initiate refund for payment ${completedPayment.id}:`,
            error,
          );
          // Continue with cancellation even if refund fails
          // In a real scenario, you might want to handle this differently
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
  }

  /**
   * Sends notification when an order is cancelled.
   * @param order - The cancelled order with relations
   */
  private async sendOrderCancellationNotification(order: OrderWithRelations) {
    try {
      // Use orchestrator to send cancellation notifications
      await this.orderNotificationOrchestrator.sendOrderCancellationNotifications(
        order.id,
      );
      this.logger.log(
        `Cancellation notifications sent for order ${order.orderNo}`,
      );
    } catch (error) {
      // Log error but don't fail the cancellation
      this.logger.error(
        `Failed to send cancellation notifications for order ${order.orderNo}: ${error.message}`,
      );
    }
  }
}
