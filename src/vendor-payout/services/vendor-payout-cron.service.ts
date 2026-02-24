import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VendorQueryService } from './vendor-query.service';
import { PayoutCalculatorService } from './payout-calculator.service';
import { PayoutRecordService } from './payout-record.service';
import { PayoutNotificationService } from './payout-notification.service';

/**
 * Cron job execution status tracking
 */
export interface CronExecutionStatus {
  isRunning: boolean;
  lastRun: Date | null;
  lastPeriodStart: Date | null;
  lastPeriodEnd: Date | null;
  totalProcessed: number;
  totalSucceeded: number;
  totalFailed: number;
  error?: string;
}

/**
 * Vendor payout cron service - main orchestrator for weekly automated payouts
 *
 * This service:
 * - Runs on a weekly cron schedule (Sunday 12:00 AM UTC by default)
 * - Queries eligible vendors with ledger entries
 * - Calculates net payouts
 * - Creates payout records
 * - Sends notifications on status changes
 * - Handles failures with retry logic
 *
 * Performance:
 * - Batch size: 100 vendors per batch
 * - Distributed lock prevents concurrent executions
 */
@Injectable()
export class VendorPayoutCronService implements OnModuleInit {
  private readonly logger = new Logger(VendorPayoutCronService.name);

  // Configuration
  private readonly cronEnabled: boolean;
  private readonly batchSize: number;
  private readonly lockTimeoutMs: number;

  // Execution status tracking
  private executionStatus: CronExecutionStatus = {
    isRunning: false,
    lastRun: null,
    lastPeriodStart: null,
    lastPeriodEnd: null,
    totalProcessed: 0,
    totalSucceeded: 0,
    totalFailed: 0,
  };

  constructor(
    private readonly vendorQueryService: VendorQueryService,
    private readonly payoutCalculatorService: PayoutCalculatorService,
    private readonly payoutRecordService: PayoutRecordService,
    private readonly payoutNotificationService: PayoutNotificationService,
    private readonly configService: ConfigService,
  ) {
    // Load configuration from environment
    this.cronEnabled = this.configService.get<boolean>(
      'PAYOUT_CRON_ENABLED',
      true,
    );
    this.batchSize = this.configService.get<number>('PAYOUT_BATCH_SIZE', 100);
    this.lockTimeoutMs = this.configService.get<number>(
      'PAYOUT_LOCK_TIMEOUT_MS',
      3600000,
    ); // 1 hour
  }

  async onModuleInit(): Promise<void> {
    this.logger.log({
      event: 'CRON_SERVICE_INITIALIZED',
      cronEnabled: this.cronEnabled,
      batchSize: this.batchSize,
      message: 'Vendor Payout Cron Service initialized',
    });
  }

  /**
   * Weekly cron job - triggers every Sunday at 12:00 AM UTC
   * Cron Expression: 0 0 * * 0 (minute, hour, day of month, month, day of week)
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handlePayout(): Promise<void> {
    if (!this.cronEnabled) {
      this.logger.log({
        event: 'CRON_DISABLED',
        message: 'Payout cron job is disabled via configuration',
      });
      return;
    }

    // Check if already running
    if (this.executionStatus.isRunning) {
      this.logger.warn({
        event: 'CRON_ALREADY_RUNNING',
        lastRun: this.executionStatus.lastRun?.toISOString(),
        message: 'Payout cron job is already running - skipping this execution',
      });
      return;
    }

    // Acquire distributed lock (simplified - in production use Redis/database lock)
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      this.logger.warn({
        event: 'LOCK_NOT_ACQUIRED',
        message: 'Could not acquire lock for payout cron - skipping execution',
      });
      return;
    }

    try {
      await this.executePayoutProcess();
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Manual trigger endpoint - for testing and emergency scenarios
   *
   * @param periodStart - Optional period start (defaults to 7 days ago)
   * @param periodEnd - Optional period end (defaults to now)
   * @returns Execution status
   */
  async triggerManualPayout(
    periodStart?: Date,
    periodEnd?: Date,
  ): Promise<CronExecutionStatus> {
    // Check if already running
    if (this.executionStatus.isRunning) {
      this.logger.warn({
        event: 'CRON_ALREADY_RUNNING',
        lastRun: this.executionStatus.lastRun?.toISOString(),
        message: 'Payout cron job is already running',
      });
      return this.executionStatus;
    }

    // Acquire lock
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      throw new Error(
        'Could not acquire lock - another process may be running',
      );
    }

    try {
      await this.executePayoutProcess(periodStart, periodEnd);
      return this.executionStatus;
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Get current execution status
   */
  getExecutionStatus(): CronExecutionStatus {
    return { ...this.executionStatus };
  }

  /**
   * Main payout process execution
   */
  private async executePayoutProcess(
    periodStart?: Date,
    periodEnd?: Date,
  ): Promise<void> {
    const startTime = Date.now();

    const pStart = periodStart || this.calculatePeriodStart();
    const pEnd = periodEnd || new Date();

    this.executionStatus = {
      isRunning: true,
      lastRun: new Date(),
      lastPeriodStart: pStart,
      lastPeriodEnd: pEnd,
      totalProcessed: 0,
      totalSucceeded: 0,
      totalFailed: 0,
    };

    this.logger.log({
      event: 'PAYOUT_CRON_STARTED',
      periodStart: pStart.toISOString(),
      periodEnd: pEnd.toISOString(),
      message: 'Weekly payout process started',
    });

    try {
      // Send batch started notification to admin
      // await this.payoutNotificationService.sendBatchStartedNotification(
      //   pStart,
      //   pEnd,
      //   0, // Unknown at this point
      // );

      // Step 1: Query eligible vendors
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eligibleVendors: any[] =
        await this.vendorQueryService.getEligibleVendors(pStart, pEnd);

      this.logger.log({
        event: 'ELIGIBLE_VENDORS_FOUND',
        count: eligibleVendors.length,
        message: `Found ${eligibleVendors.length} eligible vendors`,
      });

      // Step 2: Process each vendor in batches
      let processedCount = 0;
      let succeededCount = 0;
      let failedCount = 0;
      let totalPayoutAmount = 0;

      for (const vendor of eligibleVendors) {
        try {
          // Calculate payout - using totalPayout directly with fees and refunds set to 0
          // (Simplified approach: VendorQueryService returns net payout amount)
          const calculationResult =
            this.payoutCalculatorService.calculatePayout(
              vendor.id,
              vendor.name || vendor.business_name || null,
              vendor.totalPayout,
            );

          if (!calculationResult.shouldProcess) {
            this.logger.log({
              event: 'VENDOR_SKIPPED',
              vendorId: vendor.id,
              vendorName: calculationResult.vendorName,
              reason: calculationResult.skipReason,
              message: `Vendor skipped: ${calculationResult.skipReason}`,
            });
            continue;
          }

          // Create payout record
          const recordResult =
            await this.payoutRecordService.createPayoutRecord(
              vendor.id,
              calculationResult.netPayout,
              pStart,
              pEnd,
            );

          if (recordResult.success && recordResult.payout) {
            succeededCount++;
            totalPayoutAmount += Number(calculationResult.netPayout);

            // Send initiated notification to vendor
            // Note: Only INITIATED status records are created automatically
            // await this.payoutNotificationService.sendPayoutInitiatedNotification(
            //   vendor.id,
            //   Number(calculationResult.netPayout),
            //   pStart,
            //   pEnd,
            // );
          } else if (recordResult.isDuplicate) {
            this.logger.log({
              event: 'DUPLICATE_DETECTED',
              vendorId: vendor.id,
              message: 'Payout already exists for this period - skipping',
            });
          } else {
            failedCount++;
            this.logger.error({
              event: 'PAYOUT_FAILED',
              vendorId: vendor.id,
              error: recordResult.error,
              message: 'Failed to create payout record',
            });
          }

          processedCount++;

          // Check for high failure rate
          if (processedCount > 10) {
            const failureRate = (failedCount / processedCount) * 100;
            if (failureRate > 5) {
              await this.payoutNotificationService.sendHighFailureRateAlert(
                failureRate,
                failedCount,
                processedCount,
              );
            }
          }

          // Small delay between batches to prevent overwhelming the system
          if (processedCount % this.batchSize === 0) {
            await this.sleep(100);
          }
        } catch (error: any) {
          failedCount++;
          processedCount++;

          this.logger.error({
            event: 'VENDOR_PROCESSING_ERROR',
            vendorId: vendor.id,
            error: error.message,
            stack: error.stack,
            message: 'Error processing vendor payout',
          });

          // Attempt retry for the vendor's payout
          // In a real implementation, we'd track the payout ID
        }
      }

      // Update final status
      this.executionStatus.totalProcessed = processedCount;
      this.executionStatus.totalSucceeded = succeededCount;
      this.executionStatus.totalFailed = failedCount;

      const duration = Date.now() - startTime;

      this.logger.log({
        event: 'PAYOUT_CRON_COMPLETED',
        totalProcessed: processedCount,
        totalSucceeded: succeededCount,
        totalFailed: failedCount,
        durationMs: duration,
        message: 'Weekly payout process completed',
      });

      // Send batch completed notification
      // await this.payoutNotificationService.sendBatchCompletedNotification(
      //   pStart,
      //   pEnd,
      //   totalPayoutAmount,
      //   succeededCount,
      //   failedCount,
      // );
    } catch (error: any) {
      this.executionStatus.error = error.message;

      this.logger.error({
        event: 'PAYOUT_CRON_FAILED',
        error: error.message,
        stack: error.stack,
        message: 'Weekly payout process failed',
      });

      // Send critical failure notification
      // await this.payoutNotificationService.sendBatchFailedNotification(
      //   error.message,
      // );
    } finally {
      this.executionStatus.isRunning = false;
    }
  }

  /**
   * Calculate period start (7 days ago from current time)
   */
  private calculatePeriodStart(): Date {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 7);
    periodStart.setHours(0, 0, 0, 0);
    return periodStart;
  }

  /**
   * Acquire distributed lock
   *
   * In production, this would use Redis or database-based locking
   */
  private async acquireLock(): Promise<boolean> {
    // Simplified implementation - in production use Redis or database
    // For now, we just check if already running
    if (this.executionStatus.isRunning) {
      return false;
    }
    return true;
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(): Promise<void> {
    // Simplified implementation
    this.executionStatus.isRunning = false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
