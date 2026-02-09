/**
 * Type definitions for the Vendor Dashboard API responses.
 */

/**
 * Statistics for today's orders and status.
 */
export interface TodayStats {
  totalOrders: number;
  pending: number;
  outForDelivery: number;
  delivered: number;
  online: number;
  cod: number;
  cancelled: number;
}

/**
 * Earnings statistics for the vendor.
 */
export interface EarningsStats {
  todaySales: number;
  monthlySales: number;
}

/**
 * Status of the next payout.
 */
export type PayoutStatus = 'PROCESSING' | 'PAID' | 'NONE';

/**
 * Payout statistics for the vendor.
 */
export interface PayoutStats {
  nextPayoutAmount: number;
  nextPayoutDate: string | null;
  lastPayoutAmount: number | null;
  lastPayoutDate: string | null;
  status: PayoutStatus;
}

/**
 * Statistics for vendor's product listings.
 */
export interface ProductStats {
  totalListedProducts: number;
  approvedProducts: number;
  pendingProducts: number;
  subscriptionAvailableProducts: number;
}

/**
 * Complete dashboard response structure.
 */
export interface VendorDashboardResponse {
  today: TodayStats;
  earnings: EarningsStats;
  payouts: PayoutStats;
  products: ProductStats;
}
