import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import type {
  TodayStats,
  EarningsStats,
  PayoutStats,
  ProductStats,
  VendorDashboardResponse,
} from '../dashboard/dashboard.types';
import { OrderStatus, PaymentMode, PaymentStatus } from '@prisma/client';
const timeZone = process.env.TIMEZONE;
/**
 * Service for fetching vendor dashboard data.
 *
 * This service handles the business logic for retrieving
 * dashboard statistics including orders, earnings, and payouts.
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the complete dashboard data for a vendor.
   *
   * @param vendorId - The unique identifier of the vendor
   * @returns Promise containing the dashboard response with today stats, earnings, and payouts
   */
  async getDashboardData(vendorId: string): Promise<VendorDashboardResponse> {
    try {
      const today = await this.getTodayStats(vendorId);
      const earnings = await this.getEarningsStats(vendorId);
      const payouts = await this.getPayoutStats(vendorId);
      const products = await this.getProductStats(vendorId);

      return { today, earnings, payouts, products };
    } catch (error) {
      this.logger.error(
        `Failed to fetch dashboard data for vendor ${vendorId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Retrieves today's order statistics for the vendor.
   *
   * @param vendorId - The unique identifier of the vendor
   * @returns Promise containing today's statistics
   */
  private async getTodayStats(vendorId: string): Promise<TodayStats> {
    try {
      // Calculate today's date range in Asia/Calcutta timezone (UTC+5:30)
      const now = new Date();

      // Get start of today in local timezone
      const todayStart = new Date(now.toLocaleString('en-US', { timeZone }));
      todayStart.setHours(0, 0, 0, 0);

      // Get start of tomorrow in local timezone
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      // Fetch today's orders for the vendor
      const orders = await this.prisma.order.findMany({
        where: {
          vendorId,
          OR:[{
          AND: [
            { payment_mode: { in: [PaymentMode.ONLINE] } },
            {
              payment_status: {
                in: [PaymentStatus.PAID],
              },
            },
            {
              delivery_status: {
                in: [OrderStatus.PENDING, OrderStatus.CANCELLED],
              },
            },
          ],
        },
      {
      AND: [
        { payment_mode: { in: [PaymentMode.COD] } },
      ]
      }],
          created_at: {
            gte: todayStart,
            lt: tomorrowStart,
          },
        },
      });

      // Calculate stats from orders
      return {
        totalOrders: orders.length,
        pending: orders.filter((o) => o.delivery_status === 'PENDING').length,
        outForDelivery: orders.filter(
          (o) => o.delivery_status === 'OUT_FOR_DELIVERY',
        ).length,
        delivered: orders.filter((o) => o.delivery_status === 'DELIVERED')
          .length,
        online: orders.filter((o) => o.payment_mode === 'ONLINE').length,
        cod: orders.filter((o) => o.payment_mode === 'COD').length,
        cancelled: orders.filter((o) => o.delivery_status === 'CANCELLED')
          .length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch today stats for vendor ${vendorId}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Return zeros on error to maintain dashboard functionality
      return {
        totalOrders: 0,
        pending: 0,
        outForDelivery: 0,
        delivered: 0,
        online: 0,
        cod: 0,
        cancelled: 0,
      };
    }
  }

  /**
   * Retrieves earnings statistics for the vendor.
   * Calculates from delivered orders from the start of the current month.
   *
   * @param vendorId - The unique identifier of the vendor
   * @returns Promise containing earnings statistics
   */
  private async getEarningsStats(vendorId: string): Promise<EarningsStats> {
    try {
      // Calculate month start date in Asia/Calcutta timezone (UTC+5:30)
      const now = new Date();

      // Get start of current month in local timezone
      const monthStart = new Date(now.toLocaleString('en-US', { timeZone }));
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      // Fetch delivered orders from the start of current month
      const todayLedger = await this.prisma.ledger.aggregate({
        where: {
          vendorId,
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const monthlyLedger = await this.prisma.ledger.aggregate({
        where: {
          vendorId,
          createdAt: {
            gte: monthStart,
            lte: endOfToday,
          },
        },
        _sum: {
          amount: true,
        },
      });

      return {
        todaySales: todayLedger._sum.amount?.toNumber() ?? 0,
        monthlySales: monthlyLedger._sum.amount?.toNumber() ?? 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch earnings stats for vendor ${vendorId}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Return zeros on error to maintain dashboard functionality
      return {
        todaySales: 0,
        monthlySales: 0,
      };
    }
  }

  /**
   * Retrieves payout statistics for the vendor.
   * Queries VendorPayout table for next and last payouts.
   *
   * @param vendorId - The unique identifier of the vendor
   * @returns Promise containing payout statistics
   */
  private async getPayoutStats(vendorId: string): Promise<PayoutStats> {
    try {
      // Find next payout (INITIATED or PROCESSING status)
      const nextPayout = await this.prisma.vendorPayout.findFirst({
        where: {
          vendorId,
          status: { in: ['INITIATED', 'PROCESSING'] },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Find last payout (PAID status)
      const lastPayout = await this.prisma.vendorPayout.findFirst({
        where: {
          vendorId,
          status: 'PAID',
        },
        orderBy: { createdAt: 'desc' },
      });

      // Determine status based on payout state
      let status: 'PROCESSING' | 'PAID' | 'NONE';
      if (nextPayout) {
        status = 'PROCESSING';
      } else if (lastPayout) {
        status = 'PAID';
      } else {
        status = 'NONE';
      }

      return {
        nextPayoutAmount: nextPayout?.amount?.toNumber() ?? 0,
        nextPayoutDate: nextPayout?.periodEnd?.toISOString() ?? null,
        lastPayoutAmount: lastPayout?.amount?.toNumber() ?? null,
        lastPayoutDate: lastPayout?.createdAt?.toISOString() ?? null,
        status,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch payout stats for vendor ${vendorId}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Return defaults on error to maintain dashboard functionality
      return {
        nextPayoutAmount: 0,
        nextPayoutDate: null,
        lastPayoutAmount: null,
        lastPayoutDate: null,
        status: 'NONE',
      };
    }
  }

  /**
   * Retrieves product statistics for the vendor.
   *
   * Uses efficient aggregation queries to count products by status
   * and subscription availability.
   *
   * @param vendorId - The unique identifier of the vendor
   * @returns Promise containing product statistics
   */
  private async getProductStats(vendorId: string): Promise<ProductStats> {
    try {
      // Use aggregation for efficient counting
      const [totalResult, approvedResult, pendingResult, subscriptionResult] =
        await Promise.all([
          this.prisma.product.count({
            where: { vendorId },
          }),
          this.prisma.product.count({
            where: { vendorId, approval_status: 'APPROVED' },
          }),
          this.prisma.product.count({
            where: { vendorId, approval_status: 'PENDING' },
          }),
          this.prisma.product.count({
            where: {
              vendorId,
              approval_status: 'APPROVED',
              is_schedulable: true,
            },
          }),
        ]);

      return {
        totalListedProducts: totalResult,
        approvedProducts: approvedResult,
        pendingProducts: pendingResult,
        subscriptionAvailableProducts: subscriptionResult,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch product stats for vendor ${vendorId}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Return zeros on error to maintain dashboard functionality
      return {
        totalListedProducts: 0,
        approvedProducts: 0,
        pendingProducts: 0,
        subscriptionAvailableProducts: 0,
      };
    }
  }
}
