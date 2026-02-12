import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import type { User } from '../../common/interfaces/user.interface';

@Injectable()
export class VendorOrderService extends OrderService {
  constructor(
    protected prisma: PrismaService,
    protected cartService: CartService,
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
   * Updates an order, ensuring it belongs to the vendor.
   * @param id - The unique identifier of the order
   * @param dto - The update data
   * @param user - The authenticated vendor user
   * @returns The updated order with relations
   */
  async updateMyOrder(id: string, dto: any, user: User) {
    const order = await super.findOne(id);
    if (order.vendorId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return super.update(id, dto);
  }

  /**
   * Marks an order as OUT_FOR_DELIVERY and generates a 4-digit OTP.
   * @param orderId - The unique identifier of the order
   * @param user - The authenticated vendor user
   * @returns The updated order with delivery OTP
   */
  async markOutForDelivery(orderId: string, user: User) {
    const order = await super.findOne(orderId);
    if (order.vendorId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    if (order.delivery_status === 'OUT_FOR_DELIVERY' || order.delivery_status === 'DELIVERED') {
      throw new BadRequestException('Order is already out for delivery or delivered');
    }
    
    // Generate 4-digit numeric OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        delivery_status: 'OUT_FOR_DELIVERY',
        delivery_otp: otp,
        otp_generated_at: new Date(),
      }
    });

    return { success: true, otp };
  }

  /**
   * Verifies delivery OTP and updates order status to DELIVERED.
   * If payment mode is COD, also updates payment_status to PAID.
   * @param orderId - The unique identifier of the order
   * @param otp - The 4-digit OTP code
   * @param user - The authenticated vendor user
   * @returns The updated order with verification status
   */
  async verifyDeliveryOtp(orderId: string, otp: string, user: User) {
    const order = await super.findOne(orderId);
    
    // Verify order belongs to vendor
    if (order.vendorId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    // Check order status
    if (order.delivery_status === 'PENDING') {
      throw new BadRequestException('Order has not been marked for delivery yet');
    }

    if (order.delivery_status === 'DELIVERED') {
      throw new BadRequestException('Order has already been delivered');
    }

    // Verify OTP
    if (order.delivery_otp !== otp) {
      throw new BadRequestException('Invalid OTP');
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

    await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    return { success: true };
  }
}
