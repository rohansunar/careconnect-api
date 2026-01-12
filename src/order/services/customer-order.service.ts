import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import { CancelOrderDto } from '../dto/cancel-order.dto';
import {
  OrderStatus,
  CartStatus,
} from '../../common/constants/order-status.constants';
import { PaymentStatus, Order, Customer, Vendor } from '@prisma/client';
import type { User } from '../../common/interfaces/user.interface';
import { PaymentService } from '../../payment/services/payment.service';
import { NotificationService } from '../../notification/services/notification.service';

interface OrderWithRelations extends Order {
  customer: Customer | null;
  vendor: Vendor | null;
  address: any;
  payments: any[];
}

@Injectable()
export class CustomerOrderService extends OrderService {
  constructor(
    prisma: PrismaService,
    cartService: CartService,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
  ) {
    super(prisma, cartService);
  }
  /**
   * Retrieves all orders for the authenticated customer.
   * @param user - The authenticated customer user
   * @returns Array of customer's orders with relations
   */
  async getMyOrders(user: User) {
    const query = { customerId: user.id };
    const include = {
      cart: {
        include: {
          cartItems: {
            include: {
              product: true,
            },
          },
        },
      },
    };
    return await super.findAll(query, include);
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
    return super.prisma.$transaction(async (tx) => {
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
          status: OrderStatus.CANCELLED,
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

      return updatedOrder;
    });
  }

  /**
   * Validates that an order can be cancelled based on business rules.
   * @param order - The order to validate
   * @throws BadRequestException if order cannot be cancelled
   */
  private validateOrderCancellation(order: OrderWithRelations) {
    // Check if order is already cancelled
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    // Check if order is delivered
    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Order cannot be cancelled as it is already delivered',
      );
    }

    // Check if order is out for delivery
    if (order.status === OrderStatus.OUT_FOR_DELIVERY) {
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
