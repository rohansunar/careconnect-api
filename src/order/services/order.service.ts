import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrderStatus, CartStatus } from '../../common/constants/order-status.constants';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
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

      // Calculate total amount
      const totalAmount = cart ? this.calculateTotalAmount(cart) : 0;

      // Prepare order data
      const data = this.prepareOrderData(dto, totalAmount, addressId);

      // Create order
      const order = await tx.order.create({
        data: data,
        include: {
          customer: true,
          vendor: true,
          address: true,
          cart: {
            include: {
              cartItems: true
            }
          },
        },
      });

      // Update cart status to CHECKED_OUT if cart exists
      if (dto.cartId) {
        await this.cartService.updateCartStatus(dto.cartId, CartStatus.CHECKED_OUT);
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

    return this.prisma.order.update({
      where: { id },
      data: dto,
      include: {
        customer: true,
        vendor: true,
        address: true,
      },
    });
  }

  /**
   * Deletes an order by ID.
   * @param id - The unique identifier of the order
   * @returns Confirmation of deletion
   */
  async delete(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.prisma.order.delete({
      where: { id },
    });

    return { message: 'Order deleted successfully' };
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
    let addressId = "";
    let cart;

    if (dto.customerId) {
      await this.validateCustomer(dto.customerId);
      const address = await this.prisma.customerAddress.findFirst({
        where: { customerId: dto.customerId, isDefault: true, isActive: true }
      });
      if (!address) {
        throw new BadRequestException('No default active address found for customer');
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
      return sum + (Number(item.price) * item.quantity);
    }, 0);
  }

  /**
   * Prepares the order data object.
   * @param dto - The order creation data
   * @param totalAmount - The calculated total amount
   * @param addressId - The validated address ID
   * @returns The prepared order data
   */
  private prepareOrderData(dto: CreateOrderDto, totalAmount: number, addressId: string) {
    return {
      total_amount: totalAmount,
      status: OrderStatus.PENDING,
      payment_status: OrderStatus.PENDING,
      addressId,
      ...dto
    };
  }
}