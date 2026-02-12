import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import { OrderNotificationOrchestrator } from '../../notification/services/orchestrators/order-notification.orchestrator';
import type { User } from '../../common/interfaces/user.interface';
import { PaymentMode } from '@prisma/client';

/**
 * Platform fee calculation result
 */
export interface PlatformFeeResult {
  orderItemId: string;
  listingFee: number;
}

/**
 * Regular expression for validating UUID format
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * OTP expiration time in milliseconds (24 hours)
 */
const OTP_EXPIRATION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class VendorOrderService extends OrderService {
  private readonly logger = new Logger(VendorOrderService.name);

  constructor(
    protected prisma: PrismaService,
    protected cartService: CartService,
    private readonly notificationOrchestrator: OrderNotificationOrchestrator,
  ) {
    super(prisma, cartService, {} as any);
  }

  private buildIncludeQuery() {
    return {
      orderItems: {
        select: {
          id: true,
          price: true,
          quantity: true,
          product: { select: { name: true, categoryId: true } },
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
   * Validates if the given string is a valid UUID format.
   * @param value - The string to validate
   * @returns True if valid UUID, false otherwise
   */
  private isValidUuid(value: string): boolean {
    return UUID_REGEX.test(value);
  }

  /**
   * Validates if the given OTP is a 4-digit numeric string.
   * @param otp - The OTP to validate
   * @returns True if valid 4-digit numeric OTP, false otherwise
   */
  private isValidOtp(otp: string): boolean {
    return /^\d{4}$/.test(otp);
  }

  /**
   * Checks if the OTP has expired based on the generation timestamp.
   * @param otpGeneratedAt - The timestamp when OTP was generated
   * @returns True if OTP has expired, false otherwise
   */
  private isOtpExpired(otpGeneratedAt: Date | null): boolean {
    if (!otpGeneratedAt) {
      return true;
    }
    const expirationTime = new Date(
      otpGeneratedAt.getTime() + OTP_EXPIRATION_MS,
    );
    return new Date() > expirationTime;
  }

  /**
   * Retrieves paginated orders for the authenticated vendor.
   * @param user - The authenticated vendor user
   * @param page - The page number (default: 1)
   * @param limit - The number of orders per page (default: 10)
   * @returns Object with orders array and total count
   */
  async getMyOrders(user: User, page: number = 1, limit: number = 10) {
    const query = { vendorId: user.id };
    const include = this.buildIncludeQuery();
    const orders = await super.findAll(query, page, limit, include);
    const total = await this.prisma.order.count({ where: query });
    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Retrieves a single order by ID, ensuring it belongs to the vendor.
   * @param id - The unique identifier of the order
   * @param user - The authenticated vendor user
   * @returns The order with relations
   */
  async getMyOrder(id: string, user: User) {
    const order = await super.findOne(id);
    if (order.vendorId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return order;
  }

  /**
   * Marks an order as OUT_FOR_DELIVERY and generates a 4-digit OTP.
   * @param orderId - The unique identifier of the order
   * @param user - The authenticated vendor user
   * @returns Object with success status, order ID, and delivery status
   * @throws BadRequestException - For invalid input or invalid order state
   * @throws ForbiddenException - If vendor doesn't own the order
   * @throws NotFoundException - If order not found
   * @throws InternalServerErrorException - If database operation fails
   */
  async markOutForDelivery(
    orderId: string,
    user: User,
  ): Promise<{ success: true }> {
    // Validate orderId is provided
    if (!orderId) {
      throw new BadRequestException('Order ID is required');
    }

    // Validate orderId format
    if (!this.isValidUuid(orderId)) {
      throw new BadRequestException('Invalid order ID format');
    }

    // Fetch order with try-catch
    let order;
    try {
      order = await super.findOne(orderId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch order ${orderId} for user ${user.id}: ${errorMessage}`,
      );
      throw new NotFoundException('Order not found');
    }

    // Verify order belongs to vendor
    if (order.vendorId !== user.id) {
      this.logger.warn(
        `Vendor ${user.id} attempted to access order ${orderId} owned by vendor ${order.vendorId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Validate order state transitions
    if (order.delivery_status === 'OUT_FOR_DELIVERY') {
      throw new BadRequestException('Order is already out for delivery');
    }

    if (order.delivery_status === 'DELIVERED') {
      throw new BadRequestException('Order has already been delivered');
    }

    // Generate 4-digit numeric OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Update order with try-catch
    try {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          delivery_status: 'OUT_FOR_DELIVERY',
          delivery_otp: otp,
          otp_generated_at: new Date(),
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        'Failed to mark order as out for delivery',
      );
    }

    // Log successful operation
    this.logger.log(
      `Order ${orderId} marked as out for delivery by vendor ${user.id}`,
    );

    // Send notifications asynchronously (outside transaction)
    this.notificationOrchestrator
      .sendOrderOutForDeliveryNotification(orderId)
      .catch((error) => {
        this.logger.error(
          `Failed to send out-for-delivery notifications for order ${orderId}: ${error.message}`,
        );
      });

    return {
      success: true,
    };
  }

  /**
   * Verifies delivery OTP and updates order status to DELIVERED.
   * Creates platform listing fee ledger entries only for COD orders.
   * Sends notifications upon successful delivery.
   *
   * @param orderId - The unique identifier of the order
   * @param otp - The 4-digit OTP code
   * @param user - The authenticated vendor user
   * @returns Object with success status
   * @throws BadRequestException - For invalid input or OTP
   * @throws ForbiddenException - If vendor doesn't own the order
   * @throws NotFoundException - If order not found
   */
  async verifyDeliveryOtp(
    orderId: string,
    otp: string,
    user: User,
  ): Promise<{ success: true }> {
    // Validate orderId format
    if (!this.isValidUuid(orderId)) {
      throw new BadRequestException('Invalid order ID format');
    }

    // Validate OTP format
    if (!this.isValidOtp(otp)) {
      throw new BadRequestException('OTP must be exactly 4 digits');
    }

    try {
      // Use Prisma transaction for atomicity
      await this.prisma.$transaction(async (tx) => {
        // Fetch order with order items for fee calculation
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            orderItems: {
              include: {
                product: {
                  include: {
                    categories: true,
                  },
                },
              },
            },
          },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        // Verify order belongs to vendor
        if (order.vendorId !== user.id) {
          throw new ForbiddenException('Access denied');
        }

        // Check order status
        if (order.delivery_status === 'PENDING') {
          throw new BadRequestException(
            'Order has not been marked for delivery yet',
          );
        }

        if (order.delivery_status === 'DELIVERED') {
          throw new BadRequestException('Order has already been delivered');
        }

        // Verify OTP
        if (order.delivery_otp !== otp) {
          throw new BadRequestException('Invalid OTP');
        }

        // Check OTP expiration
        if (this.isOtpExpired(order.otp_generated_at)) {
          throw new BadRequestException('OTP has expired');
        }

        // Prepare update data
        const updateData: Record<string, unknown> = {
          delivery_status: 'DELIVERED',
          delivery_otp: null,
          otp_verified: true,
        };

        // For COD orders, mark payment as PAID upon delivery
        if (order.payment_mode === 'COD') {
          updateData.payment_status = 'PAID';
        }

        // Create platform listing fee entries ONLY for COD orders
        if (order.payment_mode === 'COD') {
          await this.createPlatformListingFeeEntriesTransaction(
            tx as any,
            orderId,
            order.vendorId,
            order.payment_mode,
            order.orderItems,
          );
        }

        // Update order status within transaction
        await tx.order.update({
          where: { id: orderId },
          data: updateData,
        });
      });
    } catch (error) {
      // Re-throw NestJS exceptions as-is
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Log unexpected errors and throw generic error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to verify delivery OTP for order ${orderId}: ${errorMessage}`,
      );
      throw new InternalServerErrorException('Failed to verify delivery OTP');
    }

    // Send notifications asynchronously (outside transaction)
    this.notificationOrchestrator
      .sendOrderDeliveredNotifications(orderId)
      .catch((error) => {
        this.logger.error(
          `Failed to send delivery notifications for order ${orderId}: ${error.message}`,
        );
      });

    return { success: true };
  }

  /**
   * Creates platform listing fee ledger entries within a transaction.
   * Fee calculation: item_price × quantity × (platform_fee_percentage / 100)
   *
   * @param tx - Prisma transaction client
   * @param orderId - The order ID
   * @param vendorId - The vendor ID
   * @param paymentMode - The order payment mode
   * @param orderItems - The order items with product and category info
   */
  private async createPlatformListingFeeEntriesTransaction(
    tx: Omit<
      PrismaService,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
    >,
    orderId: string,
    vendorId: string,
    paymentMode: PaymentMode,
    orderItems: Array<{
      id: string;
      price: any;
      quantity: number;
      product: {
        categoryId: string;
      };
    }>,
  ): Promise<void> {
    const defaultPlatformFeePercentage = 0; // Default 0%

    for (const orderItem of orderItems) {
      try {
        // Get platform fee percentage from category's platform fee settings
        const platformFeeSetting = await tx.platformFee.findFirst({
          where: { categoryId: orderItem.product.categoryId },
        });

        // Use category-specific fee or default
        const feePercentage = platformFeeSetting
          ? Number(platformFeeSetting.product_listing_fee)
          : defaultPlatformFeePercentage;

        // Calculate listing fee: price × quantity × (percentage / 100)
        const itemPrice = Number(orderItem.price);
        const quantity = orderItem.quantity;
        const listingFee = Number(
          ((itemPrice * quantity * feePercentage) / 100).toFixed(2),
        );

        // Skip if fee is zero or negative
        if (listingFee <= 0) {
          this.logger.debug(
            `Skipping ledger entry for order item ${orderItem.id}: fee is ${listingFee}`,
          );
          continue;
        }

        // Create ledger entry
        await tx.ledger.create({
          data: {
            vendorId,
            orderItemId: orderItem.id,
            type: 'PLATFORM_FEE',
            feeType: 'LISTING_FEE',
            amount: listingFee,
            paymentMode,
          },
        });

        this.logger.log(
          `Created ledger entry for order ${orderId}, item ${orderItem.id}: ₹${listingFee}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to create ledger entry for order item ${orderItem.id}: ${errorMessage}`,
        );
        // Re-throw to rollback transaction
        throw new InternalServerErrorException(
          `Failed to create ledger entry: ${errorMessage}`,
        );
      }
    }
  }

  /**
   * Cancels an order initiated by the vendor.
   *
   * Business Logic:
   * - Only orders not yet delivered can be cancelled
   * - Creates refund ledger entries for ONLINE payment mode
   * - Creates fee reversal entries for platform fees
   * - Sends notifications to customer, vendor, and admin
   *
   * @param orderId - The unique identifier of the order (UUID format)
   * @param cancelReason - The vendor's reason for cancellation
   * @param user - The authenticated vendor user
   * @returns Cancellation result with order details
   * @throws BadRequestException - For invalid input format
   * @throws ForbiddenException - If vendor doesn't own the order
   * @throws NotFoundException - If order not found
   * @throws ConflictException - If order is already delivered or cancelled
   * @throws InternalServerErrorException - If database operation fails
   */
  async cancelOrder(
    orderId: string,
    cancelReason: string,
    user: User,
  ): Promise<{
    success: boolean;
  }> {
    // Validate orderId format
    if (!orderId) {
      throw new BadRequestException('Order ID is required');
    }

    if (!this.isValidUuid(orderId)) {
      throw new BadRequestException(
        'Invalid order ID format. Expected UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)',
      );
    }

    const trimmedReason = cancelReason.trim();
    if (trimmedReason.length > 500) {
      throw new BadRequestException(
        'Cancellation reason must not exceed 500 characters',
      );
    }

    // Fetch order with all required relations
    let order;
    try {
      order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: true,
          orderItems: {
            include: {
              product: {
                include: {
                  categories: true,
                },
              },
            },
          },
          payment: true,
        },
      });
      console.log("Order", order)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch order ${orderId} for cancellation: ${errorMessage}`,
      );
      throw new NotFoundException('Order not found');
    }

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Verify order belongs to vendor
    if (order.vendorId !== user.id) {
      this.logger.warn(
        `Vendor ${user.id} attempted to cancel order ${orderId} owned by vendor ${order.vendorId}`,
      );
      throw new ForbiddenException(
        'You do not have permission to cancel this order',
      );
    }

    // Validate order is not already delivered
    if (order.delivery_status === 'DELIVERED') {
      this.logger.warn(
        `Cancellation rejected - order ${orderId} is already delivered`,
      );
      throw new ConflictException(
        'Cannot cancel an order that has already been delivered',
      );
    }

    // Validate order is not already cancelled
    if (order.delivery_status === 'CANCELLED') {
      this.logger.warn(
        `Cancellation rejected - order ${orderId} is already cancelled`,
      );
      throw new ConflictException('Order has already been cancelled');
    }

    // Prepare the prefixed cancellation reason
    const prefixedCancelReason = `Vendor-Cancellation: ${trimmedReason}`;
    const now = new Date();
    let refundAmount: number | undefined;

    try {
      // Use Prisma transaction for atomicity
      await this.prisma.$transaction(async (tx) => {
        // Update order status to CANCELLED
        await tx.order.update({
          where: { id: orderId },
          data: {
            delivery_status: 'CANCELLED',
            cancelledAt: now,
            cancelReason: prefixedCancelReason,
          },
        });

        // Handle refund for ONLINE payments
        if (order.payment_mode === 'ONLINE') {
          const orderAmount = Number(order.total_amount);

          // Create refund ledger entry (negative amount)
          // Use first orderItem for the refund entry (aggregated refund)
          const firstOrderItem = order.orderItems[0];
          if (firstOrderItem) {
            await tx.ledger.create({
              data: {
                vendorId: order.vendorId,
                orderItemId: firstOrderItem.id,
                type: 'REFUND',
                feeType: 'ADJUSTMENT',
                amount: -orderAmount, // Negative for refund
                paymentMode: order.payment_mode,
              },
            });

            this.logger.log(
              `Created refund ledger entry for order ${orderId}: ₹${orderAmount} (refund)`,
            );
          }

          // Create fee reversal entries for platform fees
          await this.createRefundFeeReversalEntries(
            tx as any,
            orderId,
            order.vendorId,
            order.payment_mode,
            order.orderItems,
          );

          refundAmount = orderAmount;
        }
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to cancel order ${orderId}: ${errorMessage}`,
      );
      throw new InternalServerErrorException(
        'Failed to process order cancellation. Please try again.',
      );
    }

    // Log successful cancellation
    this.logger.log(
      `Order ${orderId} (${order.orderNo}) cancelled by vendor ${user.id}. Reason: ${trimmedReason}`,
    );

    // Send notifications asynchronously (outside transaction)
    this.notificationOrchestrator
      .sendOrderCancellationNotifications(orderId)
      .catch((error) => {
        this.logger.error(
          `Failed to send cancellation notifications for order ${orderId}: ${error.message}`,
        );
      });

    return { success: true };
  }

  /**
   * Creates fee reversal ledger entries for refunds.
   * Reverses any platform fees that were charged when the order was created.
   *
   * @param tx - Prisma transaction client
   * @param orderId - The order ID
   * @param vendorId - The vendor ID
   * @param paymentMode - The order payment mode
   * @param orderItems - The order items with product and category info
   */
  private async createRefundFeeReversalEntries(
    tx: Omit<
      PrismaService,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
    >,
    orderId: string,
    vendorId: string,
    paymentMode: PaymentMode,
    orderItems: Array<{
      id: string;
      price: any;
      quantity: number;
      product: {
        categoryId: string;
      };
    }>,
  ): Promise<void> {
    const defaultPlatformFeePercentage = 0; // Default 0%

    for (const orderItem of orderItems) {
      try {
        // Get platform fee percentage from category's platform fee settings
        const platformFeeSetting = await tx.platformFee.findFirst({
          where: { categoryId: orderItem.product.categoryId },
        });

        // Use category-specific fee or default
        const feePercentage = platformFeeSetting
          ? Number(platformFeeSetting.product_listing_fee)
          : defaultPlatformFeePercentage;

        // Calculate listing fee: price × quantity × (percentage / 100)
        const itemPrice = Number(orderItem.price);
        const quantity = orderItem.quantity;
        const listingFee = Number(
          ((itemPrice * quantity * feePercentage) / 100).toFixed(2),
        );

        // Skip if fee is zero or negative
        if (listingFee <= 0) {
          this.logger.debug(
            `Skipping fee reversal for order item ${orderItem.id}: fee is ${listingFee}`,
          );
          continue;
        }

        // Create fee reversal ledger entry (positive value to reverse the charge)
        await tx.ledger.create({
          data: {
            vendorId,
            orderItemId: orderItem.id,
            type: 'PLATFORM_FEE',
            feeType: 'LISTING_FEE',
            amount: listingFee, // Positive to reverse the fee
            paymentMode,
          },
        });

        this.logger.log(
          `Created fee reversal entry for order ${orderId}, item ${orderItem.id}: ₹${listingFee}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to create fee reversal entry for order item ${orderItem.id}: ${errorMessage}`,
        );
        // Don't throw - refund should still proceed even if fee reversal fails
        // Fee reversal can be handled manually if needed
      }
    }
  }
}
