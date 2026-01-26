import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { PaymentMode } from '@prisma/client';
import { CartStatus } from '../../common/constants/order-status.constants';

@Injectable()
export class OrderService {
  constructor(
    protected prisma: PrismaService,
    protected cartService: CartService,
  ) {}

  /**
   * Retrieves all orders.
   * @param where - Optional where clause
   * @param include - Optional include for relations, defaults to customer, vendor, address, cart with cartItems and product
   * @returns Array of orders with relations
   */
  async findAll(where = {}, skip: number = 0, limit?: number, include?: any) {
    const defaultInclude = {
      customer: true,
      vendor: true,
      address: { include: { city: true } },
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

    return this.prisma.order.findMany({
      where,
      skip,
      take: limit,
      include: include || defaultInclude,
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

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Creates a new order from a cart.
   * @param customerId - The customer ID
   * @param vendorId - The vendor ID
   * @param addressId - The address ID
   * @param cartId - The cart ID
   * @param totalAmount - The total amount
   * @param paymentMode - The payment mode
   * @param paymentId - The payment ID
   * @returns The created order
   */
  async createOrder(
    customerId: string,
    vendorId: string,
    addressId: string,
    cartId: string,
    totalAmount: number,
    paymentMode: PaymentMode,
    paymentId: string,
  ) {
    // Validate entities
    await this.validateCustomer(customerId);
    await this.validateVendor(vendorId);
    await this.validateAddress(addressId);
    await this.cartService.validateCart(cartId);

    // Fetch cart with items to create order items
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { cartItems: true },
    });

    if (!cart || !cart.cartItems.length) {
      throw new BadRequestException('Cart is empty or not found');
    }

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
        customerId,
        vendorId,
        addressId,
        cartId,
        total_amount: totalAmount,
        payment_mode: paymentMode,
        delivery_status: 'PENDING',
        payment_status: 'PENDING',
        paymentId,
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

    // Create order items from cart items
    await this.prisma.orderItem.createMany({
      data: cart.cartItems.map((cartItem) => ({
        orderId: order.id,
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        price: cartItem.price,
        deposit: cartItem.deposit,
      })),
    });

    // Delete the cart after order creation
    await this.cartService.deleteCart(cartId);

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

    return updatedOrder;
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
   * Confirms delivery of an order.
   * @param orderId - The order ID
   * @returns The updated order
   */
  async confirmDelivery(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Update order status
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        delivery_status: 'DELIVERED',
      },
    });

    // For post-delivery subscriptions, this delivery will be accumulated for monthly billing
    // The month-end adjustment service will handle the billing calculation

    return this.findOne(orderId);
  }
}
