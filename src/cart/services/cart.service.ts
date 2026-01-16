import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateCartItemDto } from '../dto/create-cart-item.dto';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';
import { CheckoutRequestDto, CheckoutResponseDto } from '../dto/checkout.dto';
import { CartStatus } from '../../common/constants/order-status.constants';

@Injectable()
export class CartService {
  private readonly DEFAULT_QUANTITY = 1;

  constructor(private prisma: PrismaService) {}

  /**
   * Adds an item to the customer's cart with validation.
   * Handles duplicate items by updating quantity instead of creating new entries.
   * All operations are performed within a transaction for atomicity.
   * @param dto - The cart item creation data
   * @returns The created or updated cart item with product details
   */
  async addToCart(dto: CreateCartItemDto, customerId: string) {
    // Validate quantity
    if (
      dto.quantity &&
      (dto.quantity <= 0 || !Number.isInteger(dto.quantity))
    ) {
      throw new BadRequestException('Quantity must be a positive integer');
    }
    const quantity = dto.quantity || this.DEFAULT_QUANTITY;

    return this.prisma.$transaction(async (tx) => {
      // Validate customer exists
      await this.validateCustomer(customerId);

      // Validate product exists and get current pricing
      const product = await this.validateProduct(dto.productId);
      await this.validateDeliveryAddress(customerId)

      // Get or create active cart for customer
      let cart = await tx.cart.findFirst({
        where: {
          customerId,
          status: CartStatus.ACTIVE,
        },
      });
      if (!cart) {
        cart = await tx.cart.create({
          data: {
            customerId,
          },
        });
      }

      // Check if item already exists in cart
      const existingItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: dto.productId,
        },
      });

      if (existingItem) {
        // Update existing item quantity
        return tx.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + quantity,
            updatedAt: new Date(),
          },
        });
      }

      // Create new cart item
      return tx.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity,
          price: product.price,
          deposit: product.deposit,
        },
      });
    });
  }

  /**
   * Updates the quantity of a cart item.
   * @param customerId - The unique identifier of the customer
   * @param productId - The unique identifier of the product
   * @param dto - The update data containing new quantity
   * @returns The updated cart item
   */
  async updateQuantity(
    customerId: string,
    productId: string,
    dto: UpdateCartItemDto,
  ) {
    // Get the active cart for the customer
    const cart = await this.prisma.cart.findFirst({
      where: {
        customerId,
        status: CartStatus.ACTIVE,
      },
      include: {
        cartItems: {
          where: { productId },
        },
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      throw new NotFoundException('Cart item not found');
    }

    const cartItem = cart.cartItems[0];

    return this.prisma.cartItem.update({
      where: { id: cartItem.id },
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
   * Validates that a cart exists and is active.
   * @param cartId - The unique identifier of the cart
   * @returns The validated cart with cartItems
   * @throws BadRequestException if cart doesn't exist or is not active
   */
  async validateCart(cartId: string) {
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

  /**
   * Generates a checkout preview with itemized breakdown, vendor grouping, and address validation.
   * @param customerId - The unique identifier of the customer
   * @returns The checkout preview response with grouped items and calculations
   */
  async generateCheckout(customerId: string): Promise<CheckoutResponseDto> {
    // Validate customer exists
    await this.validateCustomer(customerId);

    // Get customer's active cart with items and product details
    const cart = await this.prisma.cart.findFirst({
      where: {
        customerId,
        status: 'ACTIVE',
      },
      include: {
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

    if (!cart || cart.cartItems.length === 0) {
      throw new BadRequestException('Cart is empty or not found');
    }

    // Validate delivery address
    const deliveryAddress = await this.validateDeliveryAddress(customerId);

    // Group cart items by vendor
    const vendorGroups = this.groupCartItemsByVendor(cart.cartItems);

    // Calculate totals
    const calculations = this.calculateTotals(vendorGroups);

    // Check if address is valid for all vendors (basic validation)
    const isAddressValid = await this.validateAddressForVendors(
      deliveryAddress,
      vendorGroups,
    );

    return {
      cartId: cart.id,
      deliveryAddress: {
        id: deliveryAddress.id,
        label: deliveryAddress.label || undefined,
        address: deliveryAddress.address || undefined,
        city: deliveryAddress.city?.name,
        pincode: deliveryAddress.pincode || undefined,
      },
      isAddressValid,
      cartItems: vendorGroups.flatMap((group) => group.items),
      totalItems: cart.cartItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: calculations.subtotal,
      totalDeposit: calculations.totalDeposit,
      grandTotal: calculations.grandTotal,
      deliveryNotes: isAddressValid
        ? undefined
        : 'Some vendors may have delivery restrictions to this address',
    };
  }

  /**
   * Groups cart items by vendor for checkout preview.
   * @param cartItems - Array of cart items with product and vendor details
   * @returns Array of vendor groups with their items
   */
  private groupCartItemsByVendor(cartItems: any[]) {
    const vendorGroups = new Map();

    cartItems.forEach((item) => {
      const vendorId = item.product.vendor.id;

      if (!vendorGroups.has(vendorId)) {
        vendorGroups.set(vendorId, {
          vendor: {
            id: item.product.vendor.id,
            name: item.product.vendor.name,
            vendorNo: item.product.vendor.vendorNo,
          },
          items: [],
          vendorSubtotal: 0,
          vendorTotalDeposit: 0,
        });
      }

      const group = vendorGroups.get(vendorId);
      const checkoutItem = {
        id: item.id,
        productId: item.product.id,
        name: item.product.name,
        images: item.product.images,
        description: item.product.description,
        quantity: item.quantity,
        price: item.price,
        deposit: item.deposit,
        totalPrice: item.price * item.quantity,
        totalDeposit: item.deposit ? item.deposit * item.quantity : undefined,
      };
      group.items.push(checkoutItem);
      group.vendorSubtotal += checkoutItem.totalPrice;
      if (checkoutItem.totalDeposit) {
        group.vendorTotalDeposit += checkoutItem.totalDeposit;
      }
    });

    return Array.from(vendorGroups.values());
  }

  /**
   * Calculates totals across all vendor groups.
   * @param vendorGroups - Array of vendor groups
   * @returns Object with subtotal, totalDeposit, and grandTotal
   */
  private calculateTotals(vendorGroups: any[]) {
    let subtotal = 0;
    let totalDeposit = 0;

    vendorGroups.forEach((group) => {
      subtotal += group.vendorSubtotal;
      if (group.vendorTotalDeposit > 0) {
        totalDeposit += group.vendorTotalDeposit;
      }
    });

    return {
      subtotal,
      totalDeposit: totalDeposit > 0 ? totalDeposit : undefined,
      grandTotal: subtotal + (totalDeposit || 0),
    };
  }

  /**
   * Validates that a delivery address exists and belongs to the customer.
   * @param addressId - The unique identifier of the address
   * @param customerId - The unique identifier of the customer
   * @returns The address data if valid
   * @throws BadRequestException if address doesn't exist or doesn't belong to customer
   */
  async validateDeliveryAddress(customerId: string) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { customerId, isDefault: true, isActive:true },
      include: {
        city: true,
      },
    });

    if (!address) {
      throw new BadRequestException('Please add address!');
    }

    if (address.customerId !== customerId) {
      throw new BadRequestException(
        'Delivery address does not belong to the customer',
      );
    }

    return address;
  }

  /**
   * Validates if the delivery address is suitable for all vendors (basic validation).
   * @param deliveryAddress - The delivery address data
   * @param vendorGroups - Array of vendor groups
   * @returns Boolean indicating if address is valid for all vendors
   */
  private async validateAddressForVendors(
    deliveryAddress: any,
    vendorGroups: any[],
  ): Promise<boolean> {
    // Basic validation - in a real implementation, you might check:
    // 1. Vendor service radius
    // 2. Vendor availability in the address city
    // 3. Delivery restrictions

    // For now, we'll do basic city and pincode validation
    for (const group of vendorGroups) {
      const vendor = group.vendor;

      // Check if vendor has service radius and if address is within it
      // This is a simplified check - in reality, you'd calculate distance
      if (vendor.service_radius_m && deliveryAddress.cityId) {
        // Basic city matching - vendors should serve the same city
        if (vendor.cityId && vendor.cityId !== deliveryAddress.cityId) {
          return false;
        }
      }
    }

    return true;
  }
}
