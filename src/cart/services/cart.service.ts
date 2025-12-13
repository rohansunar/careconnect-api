import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateCartItemDto } from '../dto/create-cart-item.dto';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';
import { CartStatus } from '../../common/constants/order-status.constants';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /**
   * Adds an item to the customer's cart with validation.
   * Handles duplicate items by updating quantity instead of creating new entries.
   * @param dto - The cart item creation data
   * @returns The created or updated cart item
   */
  async addToCart(dto: CreateCartItemDto, customerId: string) {
    // Validate customer exists
    await this.validateCustomer(customerId);

    // Validate product exists and get current pricing
    const product = await this.validateProduct(dto.productId);

    // Get or create active cart for customer
    let cart = await this.prisma.cart.findFirst({
      where: {
        customerId,
        status: 'ACTIVE',
      },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          customerId,
        },
      });
    }

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
      },
    });

    if (existingItem) {
      // Update existing item quantity
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + dto.quantity,
          updatedAt: new Date(),
        },
        include: {
          product: true,
        },
      });
    }

    // Create new cart item
    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        price: product.price,
        deposit: product.deposit,
      },
    });
  }

  /**
   * Updates the quantity of a cart item.
   * @param cartItemId - The unique identifier of the cart item
   * @param dto - The update data containing new quantity
   * @returns The updated cart item
   */
  async updateQuantity(cartItemId: string, dto: UpdateCartItemDto) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        quantity: dto.quantity,
        updatedAt: new Date(),
      },
      include: {
        product: true,
      },
    });
  }

  /**
   * Removes a cart item from the customer's cart.
   * @param cartItemId - The unique identifier of the cart item to remove
   * @returns Confirmation of deletion
   */
  async removeFromCart(cartItemId: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return { message: 'Cart item removed successfully' };
  }

  /**
   * Validates that a product exists and is available.
   * @param productId - The unique identifier of the product
   * @returns The product data if valid
   * @throws BadRequestException if product doesn't exist or is inactive
   */
  async validateProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.is_active) {
      throw new BadRequestException('Product not found or unavailable');
    }

    return product;
  }

  /**
   * Validates that a customer exists.
   * @param customerId - The unique identifier of the customer
   * @throws BadRequestException if customer doesn't exist
   */
  async validateCustomer(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }
  }

  /**
   * Retrieves all cart items for a specific customer.
   * @param customerId - The unique identifier of the customer
   * @returns Array of cart items with product details
   */
  async getCartItems(customerId: string) {
    return this.prisma.cartItem.findMany({
      where: { cart: { customerId } },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Updates the status of a cart.
   * @param cartId - The unique identifier of the cart
   * @param status - The new status for the cart
   * @returns The updated cart
   * @throws NotFoundException if cart doesn't exist
   */
  async updateCartStatus(cartId: string, status: CartStatus) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }
}
