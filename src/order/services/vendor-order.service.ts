import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { OrderService } from './order.service';
import { PrismaService } from '../../common/database/prisma.service';
import { OrderNotificationOrchestrator } from '../../notification/services/orchestrators/order-notification.orchestrator';
import type { User } from '../../common/interfaces/user.interface';
import { PaymentMode, PaymentStatus } from '@prisma/client';
import { AssignOrdersDto } from '../dto/assign-orders.dto';
import { OrderStatus, CancellationOrigin } from '@prisma/client';
import { OrderDeliveredEvent } from '../events/order-delivered.event';
import { IDistance } from '../../search/interfaces/search.interfaces';

/**
 * Interface for order with distance result from raw SQL query
 */
export interface OrderWithDistanceResult {
  id: string;
  orderNo: string;
  customerId: string;
  vendorId: string;
  addressId: string;
  cartId: string | null;
  total_amount: unknown;
  payment_status: string;
  riderId: string | null;
  created_at: Date;
  updated_at: Date;
  payment_mode: string;
  subscriptionId: string | null;
  delivery_status: string;
  delivery_otp: string | null;
  otp_verified: boolean;
  otp_generated_at: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  cancellation_origin: string | null;
  paymentId: string | null;
  distanceKm: number | null;
  customer: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
  vendor: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
  address: {
    id: string;
    label: string | null;
    address: string | null;
    pincode: string | null;
    isDefault: boolean | null;
    is_active: boolean | null;
    isServiceable: boolean | null;
    location: {
      id: string;
      name: string | null;
      state: string | null;
      country: string | null;
    } | null;
  } | null;
  rider: {
    id: string;
    name: string | null;
  } | null;
  orderItems: Array<{
    id: string;
    price: unknown;
    quantity: number;
    product: {
      id: string;
      name: string | null;
      categoryId: string | null;
    };
  }>;
  payment: {
    id: string;
    status: string | null;
  } | null;
}

/**
 * Interface for paginated orders response
 */
export interface PaginatedOrdersResponse {
  orders: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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

/**
 * Order statuses that are valid for assignment to a rider
 */
const ASSIGNABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
];

@Injectable()
export class VendorOrderService extends OrderService {
  private readonly logger = new Logger(VendorOrderService.name);

  constructor(
    protected prisma: PrismaService,
    private readonly notificationOrchestrator: OrderNotificationOrchestrator,
    private readonly eventBus: EventBus,
  ) {
    super(prisma);
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
      rider: { select: { name: true } },
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
   * Formats distance in kilometers to IDistance object.
   * @param distanceKm - Distance in kilometers
   * @returns Formatted distance with value and unit
   */
  private formatDistance(distanceKm: number): IDistance {
    if (distanceKm < 1) {
      return {
        value: Math.round(distanceKm * 1000),
        unit: 'meters',
      };
    } else {
      return {
        value: Math.round(distanceKm * 100) / 100,
        unit: 'km',
      };
    }
  }

  /**
   * Retrieves paginated orders for the authenticated vendor.
   * Includes distance calculation between vendor's address and customer's address.
   * @param user - The authenticated vendor user
   * @param page - The page number (default: 1)
   * @param limit - The number of orders per page (default: 10)
   * @returns Object with orders array and total count, including distance in { value, unit } format
   */
  async getMyOrders(user: User, page: number = 1, limit: number = 10) {
    // Validate and sanitize pagination parameters
    const sanitizedPage = typeof page === 'number' ? Math.max(1, page) : 1;
    const sanitizedLimit =
      typeof limit === 'number' ? Math.max(1, Math.min(100, limit)) : 10;
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const query = {
      vendorId: user.id,
      NOT: {
        AND: [
          { payment_mode: PaymentMode.ONLINE },
          { payment_status: 'PENDING' },
        ],
      },
    };
    try {
      // Use raw SQL query to calculate distance between vendor and customer addresses
      const orders = await this.getOrdersWithDistance(
        user.id,
        skip,
        sanitizedLimit,
      );
      const total = await this.prisma.order.count({ where: query });

      // Transform orders to include distance in { value, unit } format
      const transformedOrders = orders.map((order) => {
        const { distanceKm, ...rest } = order;
        // Only include distance if it has a valid value
        if (distanceKm !== null && distanceKm !== undefined) {
          return {
            ...rest,
            distance: this.formatDistance(Number(distanceKm)),
          };
        }
        // If distance cannot be calculated, omit the distance field
        return rest;
      });

      return {
        orders: transformedOrders,
        total,
        page: sanitizedPage,
        limit: sanitizedLimit,
        totalPages: Math.ceil(total / sanitizedLimit),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch orders for vendor ${user.id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Retrieves orders with distance calculation using PostGIS.
   * Calculates the distance between vendor's address and customer's address.
   * @param vendorId - The vendor ID
   * @param skip - Number of records to skip
   * @param limit - Maximum number of records to return
   * @returns Array of orders with distance in kilometers
   */
  private async getOrdersWithDistance(
    vendorId: string,
    skip: number,
    limit: number,
  ): Promise<OrderWithDistanceResult[]> {
    const query = this.buildOrdersWithDistanceQuery();

    try {
      const result = await this.prisma.$queryRawUnsafe<OrderWithDistanceResult[]>(
        query,
        vendorId,
        limit,
        skip,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch orders with distance for vendor ${vendorId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Builds the complete SQL query for fetching orders with distance calculation.
   * @returns The complete SQL query string
   */
  private buildOrdersWithDistanceQuery(): string {
    const selectClause = this.buildSelectClause();
    const fromClause = this.buildFromClause();
    const whereClause = this.buildWhereClause();
    const orderByClause = this.buildOrderByClause();
    const limitOffsetClause = this.buildLimitOffsetClause();

    return `${selectClause} ${fromClause} ${whereClause} ${orderByClause} ${limitOffsetClause}`;
  }

  /**
   * Builds the SELECT clause for the orders query.
   * @returns The SELECT clause SQL fragment
   */
  private buildSelectClause(): string {
    return `
      SELECT 
        o."id",
        o."orderNo",
        o."customerId",
        o."vendorId",
        o."addressId",
        o."cartId",
        o."total_amount",
        o."payment_status",
        o."riderId",
        o."created_at",
        o."updated_at",
        o."payment_mode",
        o."subscriptionId",
        o."delivery_status",
        o."delivery_otp",
        o."otp_verified",
        o."otp_generated_at",
        o."cancelledAt",
        o."cancelReason",
        o."cancellation_origin",
        o."paymentId",
        ${this.buildDistanceColumn()},
        ${this.buildCustomerJson()},
        ${this.buildVendorJson()},
        ${this.buildAddressJson()},
        ${this.buildRiderJson()},
        ${this.buildOrderItemsJson()},
        ${this.buildPaymentJson()}
    `;
  }

  /**
   * Builds the distance calculation column using PostGIS.
   * @returns The distance column SQL fragment
   */
  private buildDistanceColumn(): string {
    return `COALESCE(
          ST_Distance(
            va."geopoint",
            ca."geopoint"
          ) / 1000.0,
          NULL
        ) AS "distanceKm"`;
  }

  /**
   * Builds the customer JSON column.
   * @returns The customer JSON SQL fragment
   */
  private buildCustomerJson(): string {
    return `json_build_object(
          'id', c."id",
          'name', c."name",
          'phone', c."phone"
        ) AS "customer"`;
  }

  /**
   * Builds the vendor JSON column.
   * @returns The vendor JSON SQL fragment
   */
  private buildVendorJson(): string {
    return `json_build_object(
          'id', v."id",
          'name', v."name",
          'phone', v."phone"
        ) AS "vendor"`;
  }

  /**
   * Builds the address (customer address) JSON column.
   * @returns The address JSON SQL fragment
   */
  private buildAddressJson(): string {
    return `json_build_object(
          'id', ca."id",
          'label', ca."label",
          'address', ca."address",
          'pincode', ca."pincode",
          'isDefault', ca."isDefault",
          'is_active', ca."is_active",
          'isServiceable', ca."isServiceable",
          'location', json_build_object(
            'id', l."id",
            'name', l."name",
            'state', l."state",
            'country', l."country"
          )
        ) AS "address"`;
  }

  /**
   * Builds the rider JSON column (nullable).
   * @returns The rider JSON SQL fragment
   */
  private buildRiderJson(): string {
    return `CASE WHEN o."riderId" IS NOT NULL THEN
          json_build_object(
            'id', r."id",
            'name', r."name"
          )
        ELSE NULL END AS "rider"`;
  }

  /**
   * Builds the order items JSON column with subquery.
   * @returns The order items JSON SQL fragment
   */
  private buildOrderItemsJson(): string {
    return `COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', oi."id",
                'price', oi."price",
                'quantity', oi."quantity",
                'product', json_build_object(
                  'id', p."id",
                  'name', p."name",
                  'categoryId', p."categoryId"
                )
              )
            )
            FROM "OrderItem" oi
            JOIN "Product" p ON oi."productId" = p."id"
            WHERE oi."orderId" = o."id"
          ),
          '[]'::json
        ) AS "orderItems"`;
  }

  /**
   * Builds the payment JSON column (nullable).
   * @returns The payment JSON SQL fragment
   */
  private buildPaymentJson(): string {
    return `CASE WHEN o."paymentId" IS NOT NULL THEN
          json_build_object(
            'id', pay."id",
            'status', pay."status"
          )
        ELSE NULL END AS "payment"`;
  }

  /**
   * Builds the FROM clause with all required joins.
   * @returns The FROM clause SQL fragment
   */
  private buildFromClause(): string {
    return `FROM "Order" o
      JOIN "Customer" c ON o."customerId" = c."id"
      JOIN "Vendor" v ON o."vendorId" = v."id"
      JOIN "CustomerAddress" ca ON o."addressId" = ca."id"
      LEFT JOIN "Location" l ON ca."locationId" = l."id"
      LEFT JOIN "VendorAddress" va ON v."id" = va."vendorId"
      LEFT JOIN "Rider" r ON o."riderId" = r."id"
      LEFT JOIN "Payment" pay ON o."paymentId" = pay."id"`;
  }

  /**
   * Builds the WHERE clause for filtering orders.
   * @returns The WHERE clause SQL fragment
   */
  private buildWhereClause(): string {
    return `WHERE o."vendorId" = $1
        AND NOT (o."payment_mode" = 'ONLINE' AND o."payment_status" = 'PENDING')`;
  }

  /**
   * Builds the ORDER BY clause.
   * @returns The ORDER BY clause SQL fragment
   */
  private buildOrderByClause(): string {
    return 'ORDER BY o."created_at" DESC';
  }

  /**
   * Builds the LIMIT and OFFSET clause.
   * @returns The LIMIT/OFFSET clause SQL fragment
   */
  private buildLimitOffsetClause(): string {
    return 'LIMIT $2 OFFSET $3';
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
      this.logger.error(
        `Failed to mark order as out for delivery: ${errorMessage}`,
      );
      throw new InternalServerErrorException(
        'Failed to mark order as out for delivery',
      );
    }

    // Log successful operation
    this.logger.log(
      `Order ${orderId} marked as out for delivery by vendor ${user.id}`,
    );

    // Send notifications asynchronously (outside transaction)
    void this.notificationOrchestrator
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
        // Fetch order with order items for fee calculation and payment relation
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
            payment: true,
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
        const now = new Date();
        if (order.payment_mode === 'COD') {
          updateData.payment_status = 'PAID';

          // Update payment's completed_at timestamp if payment record exists
          if (order.paymentId && order.payment) {
            await tx.payment.update({
              where: { id: order.paymentId },
              data: { status: 'PAID', completed_at: now },
            });
          }
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

    // Publish OrderDeliveredEvent for ledger processing
    // This triggers the OnOrderDeliveredLedgerHandler to create fee entries
    const deliveredOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (deliveredOrder && deliveredOrder.orderItems.length > 0) {
      this.eventBus.publish(
        new OrderDeliveredEvent(
          deliveredOrder.id,
          deliveredOrder.orderNo,
          deliveredOrder.vendorId,
          deliveredOrder.orderItems.map((item) => ({
            id: item.id,
            price: item.price,
            quantity: item.quantity,
            product: { categoryId: item.product.categoryId },
          })),
          deliveredOrder.payment_mode,
          new Date(), // Delivery timestamp
        ),
      );
      this.logger.log(
        `Published OrderDeliveredEvent for order ${deliveredOrder.orderNo}`,
      );
    }

    return { success: true };
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

    const now = new Date();
    let refundAmount: number | undefined;

    try {
      // Use Prisma transaction for atomicity
      await this.prisma.$transaction(async (tx) => {
        // Update order status to CANCELLED
        await tx.order.update({
          where: { id: orderId },
          data: {
            cancellation_origin: CancellationOrigin.VENDOR,
            delivery_status: 'CANCELLED',
            cancelledAt: now,
            cancelReason: trimmedReason,
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
          // await this.createRefundFeeReversalEntries(
          //   tx as any,
          //   orderId,
          //   order.vendorId,
          //   order.payment_mode,
          //   order.orderItems,
          // );

          refundAmount = orderAmount;
        }
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to cancel order ${orderId}: ${errorMessage}`);
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
   * Assigns one or more orders to a rider for delivery.
   *
   * Business Logic:
   * - Supports both single and bulk order assignment
   * - Validates all orders belong to the requesting vendor
   * - Validates all orders are in an assignable state (PENDING, CONFIRMED)
   * - Validates the rider exists
   * - Updates all orders atomically within a single transaction
   * - Sends push and WhatsApp notifications to the assigned rider
   *
   * @param dto - The assignment data containing order IDs and rider ID
   * @param user - The authenticated vendor user
   * @returns BulkAssignmentResponseDto with assignment results
   * @throws BadRequestException - For invalid input format
   * @throws NotFoundException - If orders or rider not found
   * @throws ForbiddenException - If orders don't belong to vendor
   * @throws UnprocessableEntityException - If orders are not in assignable state
   * @throws InternalServerErrorException - If database operation fails
   */
  async assignOrders(
    dto: AssignOrdersDto,
    user: User,
  ): Promise<{ success: boolean }> {
    const correlationId = `assign-orders-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `Starting bulk order assignment: ${dto.orderIds.length} orders to rider ${dto.riderId}`,
      {
        correlationId,
        orderCount: dto.orderIds.length,
        riderId: dto.riderId,
        vendorId: user.id,
      },
    );

    // Validate rider exists
    const rider = await this.validateRiderExists(dto.riderId);

    // Validate all orders exist, belong to vendor, and are assignable
    const validationResult = await this.validateOrdersForAssignment(
      dto.orderIds,
      user.id,
      correlationId,
    );

    // If any orders failed validation, return partial success
    if (validationResult.failedOrders.length > 0) {
      this.logger.warn(`Order assignment failed for some orders`, {
        correlationId,
        failedOrders: validationResult.failedOrders,
      });
    }

    if (validationResult.validOrderIds.length <= 0) {
      return { success: true };
    }

    try {
      // Update all orders in a single transaction
      await this.prisma.order.updateMany({
        where: {
          id: { in: validationResult.validOrderIds },
        },
        data: {
          riderId: dto.riderId,
          delivery_status: 'OUT_FOR_DELIVERY' as const,
        },
      });

      this.logger.log(
        `Successfully assigned ${dto.orderIds.length} orders to rider ${dto.riderId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to assign orders to rider ${dto.riderId}: ${errorMessage}`,
        { correlationId, error: errorMessage },
      );
      throw new InternalServerErrorException(
        'Failed to assign orders. Please try again.',
      );
    }

    // Send notifications asynchronously (outside transaction)
    void this.sendAssignmentNotifications(
      dto.orderIds,
      dto.riderId,
      rider,
      correlationId,
    );

    return { success: true };
  }

  /**
   * Validates that the rider exists.
   *
   * @param riderId - The rider ID to validate
   * @returns The rider record if found
   * @throws NotFoundException - If rider not found
   */
  private async validateRiderExists(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: {
        id: true,
        name: true,
        phone: true,
        vendorId: true,
      },
    });

    if (!rider) {
      this.logger.warn(`Rider not found: ${riderId}`);
      throw new NotFoundException(`Rider with ID ${riderId} not found`);
    }

    return rider;
  }

  /**
   * Validates orders for assignment.
   * Checks that:
   * - All orders exist
   * - All orders belong to the vendor
   * - All orders are in an assignable state
   *
   * @param orderIds - Array of order IDs to validate
   * @param vendorId - The vendor ID to check ownership
   * @param correlationId - Correlation ID for logging
   * @returns Validation result with success and failure arrays
   */
  private async validateOrdersForAssignment(
    orderIds: string[],
    vendorId: string,
    correlationId: string,
  ): Promise<{
    validOrderIds: string[];
    failedOrders: Array<{ orderId: string; reason: string }>;
  }> {
    const failedOrders: Array<{ orderId: string; reason: string }> = [];

    // Fetch all orders in a single query
    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: {
        id: true,
        orderNo: true,
        vendorId: true,
        delivery_status: true,
        riderId: true,
        payment_mode: true,
        payment_status: true,
      },
    });

    // Create a map for quick lookup
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    // Check each order ID
    for (const orderId of orderIds) {
      const order = orderMap.get(orderId);

      // Check if order exists
      if (!order) {
        failedOrders.push({
          orderId,
          reason: 'Order not found',
        });
        this.logger.warn(`Order not found: ${orderId}`, { correlationId });
        continue;
      }

      // Check if order belongs to vendor
      if (order.vendorId !== vendorId) {
        failedOrders.push({
          orderId: order.id,
          reason: 'Order does not belong to this vendor',
        });
        this.logger.warn(
          `Order ${orderId} does not belong to vendor ${vendorId}`,
          { correlationId, orderVendorId: order.vendorId },
        );
        continue;
      }

      // Check if order is already assigned to another rider
      if (order.riderId !== null) {
        failedOrders.push({
          orderId: order.id,
          reason: `Order is already assigned to another rider`,
        });
        this.logger.warn(
          `Order ${orderId} is already assigned to rider ${order.riderId}`,
          { correlationId },
        );
        continue;
      }

      // Check if order is in an assignable state
      if (!ASSIGNABLE_ORDER_STATUSES.includes(order.delivery_status)) {
        const reason = this.getOrderNotAssignableReason(order.delivery_status);
        failedOrders.push({
          orderId: order.id,
          reason,
        });
        this.logger.warn(
          `Order ${orderId} is not in assignable state: ${order.delivery_status}`,
          { correlationId },
        );
        continue;
      }

      // Validate payment status for ONLINE orders with PENDING delivery status
      // Allow assignment only if payment_status not equal to "PENDING" or "FAILED"
      if (
        order.payment_mode === PaymentMode.ONLINE &&
        order.delivery_status === OrderStatus.PENDING
      ) {
        const isPaymentNotValid =
          order.payment_status === PaymentStatus.PENDING ||
          order.payment_status === PaymentStatus.FAILED;

        if (isPaymentNotValid) {
          failedOrders.push({
            orderId: order.id,
            reason: 'Order payment status does not allow assignment',
          });
          this.logger.warn(
            `Order ${order.id} has invalid payment status for assignment: ${order.payment_status}`,
            {
              correlationId,
              orderId: order.id,
              paymentStatus: order.payment_status,
              paymentMode: order.payment_mode,
              deliveryStatus: order.delivery_status,
            },
          );
          continue;
        }
      }
    }

    const validOrderIds = orderIds.filter(
      (id) => !failedOrders.some((f) => f.orderId === id),
    );

    return { validOrderIds, failedOrders };
  }

  /**
   * Gets a human-readable reason for why an order is not assignable.
   *
   * @param status - The current order status
   * @returns Human-readable reason
   */
  private getOrderNotAssignableReason(status: OrderStatus): string {
    switch (status) {
      case 'OUT_FOR_DELIVERY':
        return 'Order is already out for delivery';
      case 'DELIVERED':
        return 'Order has already been delivered';
      case 'CANCELLED':
        return 'Order has been cancelled';
      default:
        return `Order is not in an assignable state: ${status}`;
    }
  }

  /**
   * Sends notifications to the rider about new order assignments.
   * Sends both push notification and WhatsApp message.
   *
   * @param orderIds - Array of assigned order IDs
   * @param riderId - The rider ID
   * @param rider - The rider record with contact info
   * @param correlationId - Correlation ID for logging
   */
  private async sendAssignmentNotifications(
    orderIds: string[],
    riderId: string,
    rider: { id: string; name: string; phone: string },
    correlationId: string,
  ): Promise<void> {
    try {
      // Send push notification
      await this.notificationOrchestrator
        .sendBulkOrderAssignmentNotification(orderIds, riderId)
        .catch((error) => {
          this.logger.error(
            `Failed to send push notification to rider ${riderId}: ${error.message}`,
            { correlationId },
          );
        });

      // Send WhatsApp notification
      if (rider.phone) {
        await this.notificationOrchestrator
          .sendRiderAssignmentWhatsApp(orderIds, rider, correlationId)
          .catch((error) => {
            this.logger.error(
              `Failed to send WhatsApp to rider ${riderId}: ${error.message}`,
              { correlationId },
            );
          });
      }
    } catch (error) {
      // Log but don't throw - notifications should not affect the assignment result
      this.logger.error(
        `Unexpected error sending notifications to rider ${riderId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { correlationId },
      );
    }
  }

  /**
   * Reverts rider assignment from an order.
   *
   * Business Logic:
   * - Only orders with an assigned rider can be reverted
   * - Order must not be already delivered
   * - Clears riderId and resets delivery status to CONFIRMED/PENDING
   * - Sends push notification and WhatsApp message to the affected rider
   *
   * @param orderId - The unique identifier of the order (UUID format)
   * @param dto - The revert request containing reason
   * @param user - The authenticated vendor user
   * @returns Revert result with success status
   * @throws BadRequestException - For invalid UUID format or no rider assigned
   * @throws ForbiddenException - If vendor doesn't own the order
   * @throws NotFoundException - If order not found
   * @throws ConflictException - If order is already delivered
   * @throws InternalServerErrorException - If database operation fails
   */
  async revertRiderAssignment(
    orderId: string,
    user: User,
  ): Promise<{ success: boolean }> {
    const correlationId = `revert-rider-${orderId}-${Date.now()}`;

    if (!this.isValidUuid(orderId)) {
      throw new BadRequestException(
        'Invalid order ID format. Expected UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)',
      );
    }

    // Fetch order with rider info
    let order;
    try {
      order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          rider: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch order ${orderId} for rider revert: ${errorMessage}`,
        { correlationId },
      );
      throw new NotFoundException('Order not found');
    }

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Verify order belongs to vendor
    if (order.vendorId !== user.id) {
      this.logger.warn(
        `Vendor ${user.id} attempted to revert rider on order ${orderId} owned by vendor ${order.vendorId}`,
        { correlationId },
      );
      throw new ForbiddenException(
        'You do not have permission to revert rider assignment for this order',
      );
    }

    // Check if order is already delivered
    if (order.delivery_status === 'DELIVERED') {
      this.logger.warn(
        `Rider revert rejected - order ${orderId} is already delivered`,
        { correlationId },
      );
      throw new ConflictException(
        'Cannot revert rider assignment for an order that has already been delivered',
      );
    }

    // Verify rider is assigned
    if (!order.riderId) {
      throw new BadRequestException(
        'No rider is currently assigned to this order',
      );
    }

    // Store rider info before clearing
    const revertedRider = order.rider;

    // Update order within transaction
    try {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          riderId: null,
          delivery_status: OrderStatus.PENDING,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to revert rider assignment for order ${orderId}: ${errorMessage}`,
        { correlationId },
      );
      throw new InternalServerErrorException(
        'Failed to revert rider assignment. Please try again.',
      );
    }

    // Log successful revert
    this.logger.log(
      `Rider assignment reverted for order ${orderId} (${order.orderNo}) by vendor ${user.id}.`,
      { correlationId },
    );

    // Send notifications asynchronously (outside transaction)
    void this.sendRiderRevertNotifications(orderId, revertedRider, correlationId);

    return { success: true };
  }

  /**
   * Sends notifications to the rider about their assignment being reverted.
   * Sends both push notification and WhatsApp message.
   *
   * @param orderId - The order ID
   * @param orderNo - The order number for display
   * @param rider - The rider record with contact info
   * @param reason - The reason for revert
   * @param correlationId - Correlation ID for logging
   */
  private async sendRiderRevertNotifications(
    orderId: string,
    rider: { id: string; name: string; phone: string } | null,
    correlationId: string,
  ): Promise<void> {
    if (!rider) {
      this.logger.warn(
        `No rider found to send revert notifications for order ${orderId}`,
        { correlationId },
      );
      return;
    }

    try {
      // Send push notification
      await this.notificationOrchestrator
        .sendRiderAssignmentRevertedNotification(orderId, rider.id)
        .catch((error) => {
          this.logger.error(
            `Failed to send revert push notification to rider ${rider.id}: ${error.message}`,
            { correlationId },
          );
        });

      // Send WhatsApp notification
      if (rider.phone) {
        await this.notificationOrchestrator
          .sendRiderRevertedWhatsApp(orderId, rider, correlationId)
          .catch((error) => {
            this.logger.error(
              `Failed to send revert WhatsApp to rider ${rider.id}: ${error.message}`,
              { correlationId },
            );
          });
      }
    } catch (error) {
      // Log but don't throw - notifications should not affect the revert result
      this.logger.error(
        `Unexpected error sending revert notifications to rider ${rider.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { correlationId },
      );
    }
  }
}
