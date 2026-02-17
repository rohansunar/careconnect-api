import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import {
  TransactionDto,
  VendorLedgerResponseDto,
  LedgerSummaryDto,
  TransactionType,
} from '../dto/vendor-ledger-response.dto';
import { LedgerType, VendorPayout } from '@prisma/client';

/**
 * Service for handling vendor ledger transaction operations.
 * Provides methods to fetch ledger entries and payouts for vendors.
 */
@Injectable()
export class VendorLedgerService {
  private readonly logger = new Logger(VendorLedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches all transactions (ledger entries + payouts) for a vendor.
   * Supports optional date range filtering.
   *
   * @param vendorId - The vendor's unique identifier
   * @param startDate - Optional start date for filtering
   * @param endDate - Optional end date for filtering
   * @returns VendorLedgerResponseDto containing transactions and summary
   * @throws BadRequestException if date range is invalid
   */
  async getTransactions(
    vendorId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<VendorLedgerResponseDto> {
    // Validate date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        throw new BadRequestException(
          'startDate must be before or equal to endDate',
        );
      }
    }

    // Parse dates for Prisma queries
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : undefined;

    try {
      const balanceResult = await this.prisma.ledger.aggregate({
        where: { vendorId },
        _sum: { amount: true },
      });

      // Extract the sum value, defaulting to 0 if null
      // Prisma returns Decimal type, so we need to convert to number
      const balance = Number(balanceResult._sum.amount ?? 0);

      return {
        transactions: [await this.getLedgerTransactions(vendorId, start, end)],
        summary: { balance },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch ledger transactions for vendor ${vendorId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Fetches ledger entries (sales, fees, refunds) for a vendor.
   */
  // TransactionDto[]
  private async getLedgerTransactions(
    vendorId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: Record<string, unknown> = { vendorId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = startDate;
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = endDate;
      }
    }

    return await this.prisma.ledger.groupBy({
      by: ['type', 'feeType'],
      where,
      _sum: {
        amount: true,
      },
    });
  }

  /**
   * Fetches payout records for a vendor.
   */
  private async getPayoutTransactions(
    vendorId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TransactionDto[]> {
    const where: Record<string, unknown> = { vendorId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = startDate;
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = endDate;
      }
    }

    const payouts = await this.prisma.vendorPayout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return payouts.map((payout) => ({
      date: payout.createdAt.toISOString().split('T')[0],
      type: TransactionType.PAYOUT,
      amount: -Number(payout.amount), // Negative because it's a debit to vendor
      payoutId: payout.id,
    }));
  }
}
