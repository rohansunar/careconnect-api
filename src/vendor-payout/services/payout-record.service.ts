import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import { VendorPayout, PayoutStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Payout record creation result
 */
export interface PayoutRecordResult {
  success: boolean;
  payout?: VendorPayout;
  error?: string;
  isDuplicate?: boolean;
}

/**
 * Payout record service for creating and managing payout records
 *
 * Responsibilities:
 * - Create payout records with idempotency checks
 * - Handle duplicate prevention
 * - Manage transaction atomicity
 * - Update payout status
 */
@Injectable()
export class PayoutRecordService {
  private readonly logger = new Logger(PayoutRecordService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new payout record with idempotency check
   *
   * @param vendorId - The vendor ID
   * @param amount - Net payout amount
   * @param periodStart - Start of payout period
   * @param periodEnd - End of payout period
   * @returns Result with payout or error
   */
  async createPayoutRecord(
    vendorId: string,
    amount: Decimal | number,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<PayoutRecordResult> {
    const amountDecimal =
      amount instanceof Decimal ? amount : new Decimal(amount);

    this.logger.log({
      event: 'PAYOUT_RECORD_CREATION',
      vendorId,
      amount: amountDecimal.toString(),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      message: 'Creating payout record',
    });

    try {
      // Idempotency check - check if payout already exists
      const existingPayout = await this.prisma.vendorPayout.findFirst({
        where: {
          vendorId,
          periodStart,
          periodEnd,
        },
      });

      if (existingPayout) {
        this.logger.warn({
          event: 'DUPLICATE_DETECTED',
          vendorId,
          existingPayoutId: existingPayout.id,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          message: 'Duplicate payout detected - skipping',
        });

        return {
          success: false,
          payout: existingPayout,
          error: 'Payout already exists for this period',
          isDuplicate: true,
        };
      }

      // Create payout record within transaction
      const payout = await this.prisma.$transaction(async (tx) => {
        // Insert payout record
        const newPayout = await tx.vendorPayout.create({
          data: {
            vendorId,
            amount: amountDecimal,
            status: PayoutStatus.INITIATED,
            periodStart,
            periodEnd,
          },
        });

        // Create ledger entry for audit trail
        await tx.ledger.create({
          data: {
            vendorId,
            type: 'PAYOUT' as any,
            feeType: 'WEEKLY_PAYOUT',
            amount: amountDecimal.mul(-1),
            description: `Weekly payout for period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
            paymentMode: 'ONLINE' as any,
            createdAt: new Date(),
          },
        });

        return newPayout;
      });

      this.logger.log({
        event: 'PAYOUT_CREATED',
        payoutId: payout.id,
        vendorId,
        amount: payout.amount.toString(),
        message: 'Payout record created successfully',
      });

      return {
        success: true,
        payout,
      };
    } catch (error: any) {
      // Check for unique constraint violation (race condition)
      if (error.code === 'P2002') {
        this.logger.warn({
          event: 'DUPLICATE_DETECTED',
          vendorId,
          message: 'Duplicate payout detected due to race condition',
        });

        return {
          success: false,
          error: 'Payout already exists (concurrent creation)',
          isDuplicate: true,
        };
      }

      this.logger.error({
        event: 'PAYOUT_CREATION_FAILED',
        vendorId,
        error: error.message,
        stack: error.stack,
        message: 'Failed to create payout record',
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }
}
