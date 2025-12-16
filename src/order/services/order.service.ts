import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import { PaymentService } from '../../payment/services/payment.service';
import { NotificationService } from '../../notification/services/notification.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { CancelOrderDto } from '../dto/cancel-order.dto';
import {
  OrderStatus,
  CartStatus,
} from '../../common/constants/order-status.constants';
import type { User } from '../../common/interfaces/user.interface';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Creates a new order with validation.
   * @param dto - The order creation data
   * @returns The created order with relations
   */
  async create(dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      // Validate entities
      const { addressId, cart } = await this.validateEntities(dto);

      // Increment counter for order
      const counter = await tx.counter.upsert({
        where: { type: 'order' },
        update: { lastNumber: { increment: 1 } },
        create: { type: 'order', lastNumber: 1 },
      });

      // Generate orderNo
      const orderNo = 'O' + counter.lastNumber.toString().padStart(6, '0');

      // Calculate total amount
      const totalAmount = cart ? this.calculateTotalAmount(cart) : 0;

      // Prepare order data
      const data = this.prepareOrderData(dto, totalAmount, addressId, orderNo);

      // Create order
      const order = await tx.order.create({
        data: data,
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

      // Update cart status to CHECKED_OUT if cart exists
      if (dto.cartId) {
        await this.cartService.updateCartStatus(
          dto.cartId,
          CartStatus.CHECKED_OUT,
        );
      }

      // Create payment for the order
      try {
        await this.paymentService.createPaymentForOrder(
          order.id,
          order.customerId!,
          order.vendorId!,
          Number(order.total_amount),
        );
      } catch (error) {
        // Log error but don't fail order creation
        console.error('Failed to create payment for order:', error);
      }

      return order;
    });
  }

  /**
   * Retrieves all orders.
   * @returns Array of orders with relations
   */
  async findAll() {
    return this.prisma.order.findMany({
      include: {
        customer: true,
        vendor: true,
        address: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Retrieves a single order by ID.
   * @param id - The unique identifier of the order
   * @returns The order with relations
   */
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        vendor: true,
        address: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Updates an order by ID.
   * @param id - The unique identifier of the order
   * @param dto - The update data
   * @returns The updated order with relations
   */
  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Store previous assigned_rider_phone for notification check
    const previousAssignedRiderPhone = order.assigned_rider_phone;

    // Validate related entities if provided
    if (dto.customer_id) {
      await this.validateCustomer(dto.customer_id);
    }
    if (dto.vendor_id) {
      await this.validateVendor(dto.vendor_id);
    }
    if (dto.address_id) {
      await this.validateAddress(dto.address_id);
    }
    if (dto.product_id) {
      await this.validateProduct(dto.product_id);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: dto,
      include: {
        customer: true,
        vendor: true,
        address: true,
        cart: {
          include: {
            cartItems: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    // Send WhatsApp notification if rider is newly assigned
    if (
      !previousAssignedRiderPhone &&
      dto.assigned_rider_phone &&
      dto.assigned_rider_phone.trim() !== ''
    ) {
      await this.sendRiderAssignmentNotification(updatedOrder);
    }

    return updatedOrder;
  }

  /**
   * Cancels an order with proper validation and refund logic.
   * @param orderId - The unique identifier of the order
   * @param dto - The cancellation data
   * @param currentUser - The authenticated customer
   * @returns The cancelled order with relations
   */
  async cancelOrder(
    orderId: string,
    dto: CancelOrderDto,
    currentUser: User,
  ) {
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
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: dto.cancelReason,
          payment_status: completedPayments.length > 0 ? 'REFUNDED' : 'CANCELLED',
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
  private validateOrderCancellation(order: any) {
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
    if (order.status === OrderStatus.SHIPPED) {
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
  private async sendOrderCancellationNotification(order: any) {
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

  /**
   * Validates that a customer exists.
   * @param customerId - The unique identifier of the customer
   * @throws BadRequestException if customer doesn't exist
   */
  private async validateCustomer(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }
  }

  /**
   * Validates that a vendor exists.
   * @param vendorId - The unique identifier of the vendor
   * @throws BadRequestException if vendor doesn't exist
   */
  private async validateVendor(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }
  }

  /**
   * Validates that an address exists.
   * @param addressId - The unique identifier of the address
   * @throws BadRequestException if address doesn't exist
   */
  private async validateAddress(addressId: string) {
    const address = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new BadRequestException('Address not found');
    }
  }

  /**
   * Validates that a product exists and is active.
   * @param productId - The unique identifier of the product
   * @throws BadRequestException if product doesn't exist or is inactive
   */
  private async validateProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.is_active) {
      throw new BadRequestException('Product not found or unavailable');
    }
  }

  /**
   * Validates that a cart exists and is active.
   * @param cartId - The unique identifier of the cart
   * @throws BadRequestException if cart doesn't exist or is not active
   */
  private async validateCart(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { cartItems: true },
    });

    if (!cart) {
      throw new BadRequestException('Cart not found');
    }

    if (cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException('Cart is not active or already processed');
    }
    return cart;
  }

  /**
   * Validates all entities required for order creation.
   * @param dto - The order creation data
   * @returns Object containing validated addressId and cart
   */
  private async validateEntities(dto: CreateOrderDto) {
    let addressId = '';
    let cart;

    if (dto.customerId) {
      await this.validateCustomer(dto.customerId);
      const address = await this.prisma.customerAddress.findFirst({
        where: { customerId: dto.customerId, isDefault: true, isActive: true },
      });
      if (!address) {
        throw new BadRequestException(
          'No default active address found for customer',
        );
      }
      addressId = address.id;
    }

    if (dto.vendorId) {
      await this.validateVendor(dto.vendorId);
    }

    if (dto.cartId) {
      cart = await this.validateCart(dto.cartId);
    }

    return { addressId, cart };
  }

  /**
   * Calculates the total amount from cart items.
   * @param cart - The validated cart with cartItems
   * @returns The calculated total amount
   */
  private calculateTotalAmount(cart: any): number {
    return cart.cartItems.reduce((sum: number, item: any) => {
      return sum + Number(item.price) * item.quantity;
    }, 0);
  }

  /**
   * Prepares the order data object.
   * @param dto - The order creation data
   * @param totalAmount - The calculated total amount
   * @param addressId - The validated address ID
   * @param orderNo - The generated order number
   * @returns The prepared order data
   */
  private prepareOrderData(
    dto: CreateOrderDto,
    totalAmount: number,
    addressId: string,
    orderNo: string,
  ) {
    return {
      orderNo,
      total_amount: totalAmount,
      status: OrderStatus.PENDING,
      payment_status: OrderStatus.PENDING,
      addressId,
      ...dto,
    };
  }

  /**
   * Sends WhatsApp notification to rider when order is assigned.
   * @param order - The updated order with relations
   */
  private async sendRiderAssignmentNotification(order: any) {
    if (!order.assigned_rider_phone) {
      return;
    }

    try {
      const itemsList = order.cart?.cartItems
        ?.map(
          (item: any) =>
            `- ${item.product?.name || 'Unknown Product'} x${item.quantity} (${item.price} each)`,
        )
        .join('\n') || 'No items';

      const message = `🚚 New Order Assigned!

Order ID: ${order.orderNo}
Customer: ${order.customer?.name || 'N/A'}
Address: ${order.address?.fullAddress || 'N/A'}
Items:
${itemsList}
Total: ₹${order.total_amount}

Please confirm delivery.`;

      await this.notificationService.sendWhatsApp(
        order.assigned_rider_phone,
        message,
      );
    } catch (error) {
      // Log error but don't fail the update
      console.error('Failed to send rider notification:', error);
    }
  }
}
