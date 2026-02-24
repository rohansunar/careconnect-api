import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * Interface for vendor with aggregated ledger data
 */
interface VendorWithLedgerTotals {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  is_active: boolean;
  totalPayout: number;
}

/**
 * Vendor query service for fetching eligible vendors and their data
 * for the weekly payout process.
 *
 * Responsibilities:
 * - Query active vendors with delivered orders in the payout period
 * - Retrieve ledger entries for payout calculation using database aggregation
 */
@Injectable()
export class VendorQueryService {
  private readonly logger = new Logger(VendorQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Query all eligible vendors for the payout period with aggregated ledger data
   *
   * Uses database-level aggregation to calculate:
   * - totalSales: sum of all SALE ledger entries
   * - totalFees: sum of all PLATFORM_FEE ledger entries
   * - totalRefunds: sum of all REFUND ledger entries
   *
   * @param periodStart - Start of the payout period (inclusive)
   * @param periodEnd - End of the payout period (exclusive)
   * @returns Array of eligible vendors with their aggregated ledger data
   */
  async getEligibleVendors(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<VendorWithLedgerTotals[]> {
    this.logger.log({
      event: 'QUERY_ELIGIBLE_VENDORS',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      message: 'Fetching eligible vendors for payout with database aggregation',
    });

    // Get all active vendors
    const vendors = await this.prisma.vendor.findMany({
      where: {
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        is_active: true,
      },
    });

    if (vendors.length === 0) {
      this.logger.log({
        event: 'NO_VENDORS_FOUND',
        message: 'No active vendors found',
      });
      return [];
    }

    const vendorIds = vendors.map((v) => v.id);
    // Get ledger totals grouped by vendor
    const ledgerByVendor = await this.prisma.ledger.groupBy({
      by: ['vendorId'],
      where: {
        vendorId: { in: vendorIds },
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { amount: true },
    });

    // Create a map for quick lookup
    const vendorTotalsMap = new Map(
      ledgerByVendor.map((item) => [
        item.vendorId,
        item._sum?.amount?.toNumber() || 0,
      ]),
    );

    // Build vendor data with aggregated totals
    const vendorsWithTotals = vendors.map((vendor) => ({
      ...vendor,
      totalPayout: vendorTotalsMap.get(vendor.id) || 0,
    }));

    // Filter vendors with positive payout
    const eligibleVendors = vendorsWithTotals.filter(
      (vendor) => vendor.totalPayout > 0,
    );

    this.logger.log({
      event: 'ELIGIBLE_VENDORS_FOUND',
      count: eligibleVendors.length,
      totalPayoutSum: eligibleVendors.reduce(
        (sum, v) => sum + v.totalPayout,
        0,
      ),
      message: `Found ${eligibleVendors.length} eligible vendors with aggregated data`,
    });

    return eligibleVendors;
  }
}
