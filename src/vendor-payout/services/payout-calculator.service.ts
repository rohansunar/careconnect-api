import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Payout calculation result
 */
export interface PayoutCalculationResult {
  vendorId: string;
  vendorName: string;
  totalSales: Decimal;
  netPayout: Decimal;
  shouldProcess: boolean;
  skipReason?: string;
}

/**
 * Payout calculator service for computing net payout amounts
 *
 * Calculation Formula:
 * Net Payout = Total Sales Revenue - Platform Fees - Refunds
 *
 * Business Rules:
 * - If NetPayout <= 0: Skip payout (log as zero-balance)
 * - If NetPayout > 0 AND NetPayout < MinimumPayoutThreshold: Hold until threshold met
 * - If NetPayout >= MinimumPayoutThreshold: Process payout
 */
@Injectable()
export class PayoutCalculatorService {
  private readonly logger = new Logger(PayoutCalculatorService.name);

  // Minimum payout threshold (configurable via environment)
  private readonly MINIMUM_PAYOUT_AMOUNT: number;

  constructor(private readonly configService: ConfigService) {
    this.MINIMUM_PAYOUT_AMOUNT = this.configService.get<number>(
      'PAYOUT_MINIMUM_AMOUNT',
      10.0,
    );
  }

  /**
   * Calculate net payout for a vendor based on ledger entries
   *
   * @param vendorId - The vendor ID
   * @param vendorName - The vendor name (for logging)
   * @param totalSales - Total sales amount from ledger entries
   * @param platformFees - Total platform fees from ledger entries
   * @param refunds - Total refunds from ledger entries
   * @returns Payout calculation result
   */
  calculatePayout(
    vendorId: string,
    vendorName: string | null,
    totalSales: number,
  ): PayoutCalculationResult {
    // Convert to Decimal for precision
    const salesDecimal = new Decimal(totalSales);

    this.logger.debug({
      event: 'PAYOUT_CALCULATION',
      vendorId,
      vendorName,
      totalSales: totalSales.toString(),
      message: 'Calculated net payout for vendor',
    });

    // Apply business rules
    if (salesDecimal.lte(0)) {
      this.logger.log({
        event: 'VENDOR_SKIPPED',
        vendorId,
        vendorName,
        reason: 'Zero or negative balance',
        netPayout: salesDecimal.toString(),
        message: 'Vendor skipped - zero or negative balance',
      });

      return {
        vendorId,
        vendorName: vendorName || 'Unknown',
        totalSales: salesDecimal,
        netPayout: new Decimal(0),
        shouldProcess: false,
        skipReason: 'Zero or negative balance',
      };
    }

    if (salesDecimal.lt(this.MINIMUM_PAYOUT_AMOUNT)) {
      this.logger.log({
        event: 'VENDOR_HELD',
        vendorId,
        vendorName,
        reason: 'Below minimum payout threshold',
        netPayout: salesDecimal.toString(),
        threshold: this.MINIMUM_PAYOUT_AMOUNT,
        message: 'Vendor payout held - below minimum threshold',
      });

      return {
        vendorId,
        vendorName: vendorName || 'Unknown',
        totalSales: salesDecimal,
        netPayout:salesDecimal,
        shouldProcess: false,
        skipReason: `Below minimum payout threshold (${this.MINIMUM_PAYOUT_AMOUNT})`,
      };
    }

    // Payout should be processed
    this.logger.log({
      event: 'PAYOUT_CALCULATED',
      vendorId,
      vendorName,
      netPayout: salesDecimal.toString(),
      message: 'Vendor payout calculated successfully',
    });

    return {
      vendorId,
      vendorName: vendorName || 'Unknown',
      totalSales: salesDecimal,
      netPayout:salesDecimal,
      shouldProcess: true,
    };
  }

  /**
   * Format amount for display (with currency symbol)
   *
   * @param amount - Amount to format
   * @returns Formatted string
   */
  formatAmount(amount: number | Decimal): string {
    const numAmount = amount instanceof Decimal ? amount.toNumber() : amount;
    return `₹${numAmount.toFixed(2)}`;
  }
}
