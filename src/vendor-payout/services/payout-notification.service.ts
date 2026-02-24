import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import {
  EmailChannelService,
  SmsChannelService,
} from '../../notification/services/channels';

/**
 * Notification types for payout events
 */
export enum PayoutNotificationType {
  PAYOUT_INITIATED = 'PAYOUT_INITIATED',
  PAYOUT_PROCESSED = 'PAYOUT_PROCESSED',
  PAYOUT_FAILED = 'PAYOUT_FAILED',
  PAYOUT_BATCH_STARTED = 'PAYOUT_BATCH_STARTED',
  PAYOUT_BATCH_COMPLETED = 'PAYOUT_BATCH_COMPLETED',
  PAYOUT_BATCH_FAILED = 'PAYOUT_BATCH_FAILED',
  HIGH_FAILURE_RATE = 'HIGH_FAILURE_RATE',
}

/**
 * Payout notification service for sending alerts and status updates
 *
 * Notification Triggers:
 * - Admin notifications:
 *   - Payout batch started
 *   - Payout batch completed
 *   - Payout batch failed
 *   - High failure rate (>5%)
 *
 * - Vendor notifications:
 *   - Payout initiated
 *   - Payout processed
 *   - Payout failed
 */
@Injectable()
export class PayoutNotificationService {
  private readonly logger = new Logger(PayoutNotificationService.name);

  // Alert thresholds
  private readonly failureRateThreshold: number;
  private readonly adminEmail: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailChannelService: EmailChannelService,
    private readonly smsChannelService: SmsChannelService,
    private readonly configService: ConfigService,
  ) {
    this.failureRateThreshold = this.configService.get<number>(
      'PAYOUT_FAILURE_RATE_THRESHOLD',
      5.0, // 5%
    );
    this.adminEmail = this.configService.get<string>(
      'ADMIN_EMAIL',
      'admin@example.com',
    );
  }

  /**
   * Send payout initiated notification to vendor
   *
   * @param vendorId - The vendor ID
   * @param amount - Payout amount
   * @param periodStart - Period start date
   * @param periodEnd - Period end date
   */
  async sendPayoutInitiatedNotification(
    vendorId: string,
    amount: number,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      this.logger.warn({
        event: 'VENDOR_NOT_FOUND',
        vendorId,
        message: 'Cannot send payout initiated notification - vendor not found',
      });
      return;
    }

    const formattedAmount = this.formatAmount(amount);
    const periodStr = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
    const html = `
      <h2>Payout Initiated</h2>
      <p>Dear ${vendor.name || vendor.vendorNo},</p>
      <p>Your payout of <strong>${formattedAmount}</strong> has been initiated.</p>
      <p>Period: ${periodStr}</p>
      <p>Best regards,<br/>The Team</p>
    `;

    // Send email notification
    if (vendor.email) {
      try {
        await this.emailChannelService.sendEmail(
          vendor.email,
          `Payout Initiated - ${formattedAmount}`,
          html,
        );
      } catch (error: any) {
        this.logger.error({
          event: 'EMAIL_SEND_FAILED',
          vendorId,
          error: error.message,
          message: 'Failed to send payout initiated email',
        });
      }
    }

    this.logger.log({
      event: 'PAYOUT_INITIATED_NOTIFICATION_SENT',
      vendorId,
      amount: formattedAmount,
      message: 'Payout initiated notification sent',
    });
  }

  /**
   * Send payout processed notification to vendor
   *
   * @param vendorId - The vendor ID
   * @param amount - Payout amount
   * @param reference - Bank reference ID
   */
  async sendPayoutProcessedNotification(
    vendorId: string,
    amount: number,
    reference?: string,
  ): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      this.logger.warn({
        event: 'VENDOR_NOT_FOUND',
        vendorId,
        message: 'Cannot send payout processed notification - vendor not found',
      });
      return;
    }

    const formattedAmount = this.formatAmount(amount);
    const html = `
      <h2>Payout Processed</h2>
      <p>Dear ${vendor.name || vendor.vendorNo},</p>
      <p>Your payout of <strong>${formattedAmount}</strong> has been processed.</p>
      <p>Reference: ${reference || 'N/A'}</p>
      <p>Best regards,<br/>The Team</p>
    `;

    // Send email notification
    if (vendor.email) {
      try {
        await this.emailChannelService.sendEmail(
          vendor.email,
          `Payout Processed - ${formattedAmount}`,
          html,
        );
      } catch (error: any) {
        this.logger.error({
          event: 'EMAIL_SEND_FAILED',
          vendorId,
          error: error.message,
          message: 'Failed to send payout processed email',
        });
      }
    }

    this.logger.log({
      event: 'PAYOUT_PROCESSED_NOTIFICATION_SENT',
      vendorId,
      amount: formattedAmount,
      message: 'Payout processed notification sent',
    });
  }

  /**
   * Send payout failed notification to vendor
   *
   * @param vendorId - The vendor ID
   * @param amount - Payout amount
   * @param reason - Failure reason
   */
  async sendPayoutFailedNotification(
    vendorId: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      this.logger.warn({
        event: 'VENDOR_NOT_FOUND',
        vendorId,
        message: 'Cannot send payout failed notification - vendor not found',
      });
      return;
    }

    const formattedAmount = this.formatAmount(amount);
    const html = `
      <h2 style="color: red;">URGENT: Payout Failed</h2>
      <p>Dear ${vendor.name || vendor.vendorNo},</p>
      <p>Your payout of <strong>${formattedAmount}</strong> has failed.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please update your bank details to resolve this issue.</p>
      <p>Best regards,<br/>The Team</p>
    `;

    // Send email notification (high priority)
    if (vendor.email) {
      try {
        await this.emailChannelService.sendEmail(
          vendor.email,
          `URGENT: Payout Failed - ${formattedAmount}`,
          html,
        );
      } catch (error: any) {
        this.logger.error({
          event: 'EMAIL_SEND_FAILED',
          vendorId,
          error: error.message,
          message: 'Failed to send payout failed email',
        });
      }
    }

    // Send SMS notification (critical for failed payouts)
    // Note: Phone number should be in E.164 format (+91XXXXXXXXXX)
    if (vendor.phone) {
      const phoneWithCountryCode = vendor.phone.startsWith('+')
        ? vendor.phone
        : `+91${vendor.phone}`;
      try {
        await this.smsChannelService.sendSms(
          phoneWithCountryCode,
          `URGENT: Your payout of ${formattedAmount} failed. Reason: ${reason}. Please update your bank details.`,
        );
      } catch (error: any) {
        this.logger.error({
          event: 'SMS_SEND_FAILED',
          vendorId,
          error: error.message,
          message: 'Failed to send payout failed SMS',
        });
      }
    }

    this.logger.log({
      event: 'PAYOUT_FAILED_NOTIFICATION_SENT',
      vendorId,
      amount: formattedAmount,
      reason,
      message: 'Payout failed notification sent',
    });
  }

  /**
   * Send payout batch started notification to admin
   *
   * @param periodStart - Period start date
   * @param periodEnd - Period end date
   * @param vendorCount - Expected vendor count
   */
  async sendBatchStartedNotification(
    periodStart: Date,
    periodEnd: Date,
    vendorCount: number,
  ): Promise<void> {
    const periodStr = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
    const html = `
      <h2>Weekly Payout Process Started</h2>
      <p>The weekly payout process has been initiated.</p>
      <ul>
        <li><strong>Period:</strong> ${periodStr}</li>
        <li><strong>Expected Vendors:</strong> ${vendorCount}</li>
        <li><strong>Start Time:</strong> ${new Date().toLocaleString()}</li>
      </ul>
    `;

    try {
      await this.emailChannelService.sendEmail(
        this.adminEmail,
        'Weekly Payout Process Started',
        html,
      );
    } catch (error: any) {
      this.logger.error({
        event: 'ADMIN_EMAIL_FAILED',
        error: error.message,
        message: 'Failed to send batch started email to admin',
      });
    }

    this.logger.log({
      event: 'BATCH_STARTED_NOTIFICATION_SENT',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      vendorCount,
      message: 'Batch started notification sent to admin',
    });
  }

  /**
   * Send payout batch completed notification to admin
   *
   * @param periodStart - Period start date
   * @param periodEnd - Period end date
   * @param totalAmount - Total payout amount
   * @param vendorCount - Number of vendors processed
   * @param failedCount - Number of failed payouts
   */
  async sendBatchCompletedNotification(
    periodStart: Date,
    periodEnd: Date,
    totalAmount: number,
    vendorCount: number,
    failedCount: number,
  ): Promise<void> {
    const periodStr = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
    const formattedAmount = this.formatAmount(totalAmount);
    const successRate =
      vendorCount > 0
        ? (((vendorCount - failedCount) / vendorCount) * 100).toFixed(1)
        : '0';

    const html = `
      <h2>Weekly Payout Completed</h2>
      <p>The weekly payout process has been completed successfully.</p>
      <ul>
        <li><strong>Period:</strong> ${periodStr}</li>
        <li><strong>Total Amount:</strong> ${formattedAmount}</li>
        <li><strong>Vendors Processed:</strong> ${vendorCount}</li>
        <li><strong>Failed:</strong> ${failedCount}</li>
        <li><strong>Success Rate:</strong> ${successRate}%</li>
        <li><strong>Completion Time:</strong> ${new Date().toLocaleString()}</li>
      </ul>
    `;

    try {
      await this.emailChannelService.sendEmail(
        this.adminEmail,
        `Weekly Payout Completed - ${formattedAmount}`,
        html,
      );
    } catch (error: any) {
      this.logger.error({
        event: 'ADMIN_EMAIL_FAILED',
        error: error.message,
        message: 'Failed to send batch completed email to admin',
      });
    }

    this.logger.log({
      event: 'BATCH_COMPLETED_NOTIFICATION_SENT',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalAmount: formattedAmount,
      vendorCount,
      failedCount,
      message: 'Batch completed notification sent to admin',
    });
  }

  /**
   * Send payout batch failed notification to admin (critical)
   *
   * @param error - Error message
   */
  async sendBatchFailedNotification(error: string): Promise<void> {
    const html = `
      <h2 style="color: red;">CRITICAL: Weekly Payout Failed</h2>
      <p>The weekly payout process has failed.</p>
      <p><strong>Error:</strong> ${error}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p>Manual intervention is required.</p>
    `;

    try {
      await this.emailChannelService.sendEmail(
        this.adminEmail,
        'CRITICAL: Weekly Payout Failed',
        html,
      );
    } catch (err: any) {
      this.logger.error({
        event: 'CRITICAL_NOTIFICATION_FAILED',
        error: err.message,
        message: 'Failed to send critical batch failure notification',
      });
    }

    this.logger.error({
      event: 'BATCH_FAILED_NOTIFICATION_SENT',
      error,
      message: 'Critical batch failure notification sent to admin',
    });
  }

  /**
   * Send high failure rate alert to admin
   *
   * @param failureRate - Current failure rate percentage
   * @param failedCount - Number of failed payouts
   * @param totalCount - Total number of payouts
   */
  async sendHighFailureRateAlert(
    failureRate: number,
    failedCount: number,
    totalCount: number,
  ): Promise<void> {
    if (failureRate <= this.failureRateThreshold) {
      return;
    }

    const html = `
      <h2 style="color: orange;">WARNING: High Payout Failure Rate</h2>
      <ul>
        <li><strong>Failure Rate:</strong> ${failureRate.toFixed(1)}%</li>
        <li><strong>Threshold:</strong> ${this.failureRateThreshold}%</li>
        <li><strong>Failed:</strong> ${failedCount} out of ${totalCount}</li>
        <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
      </ul>
    `;

    try {
      await this.emailChannelService.sendEmail(
        this.adminEmail,
        `WARNING: High Payout Failure Rate - ${failureRate.toFixed(1)}%`,
        html,
      );
    } catch (error: any) {
      this.logger.error({
        event: 'HIGH_FAILURE_ALERT_FAILED',
        error: error.message,
        message: 'Failed to send high failure rate alert',
      });
    }

    this.logger.warn({
      event: 'HIGH_FAILURE_RATE_ALERT',
      failureRate,
      failedCount,
      totalCount,
      threshold: this.failureRateThreshold,
      message: 'High failure rate alert sent to admin',
    });
  }

  /**
   * Format amount for display
   *
   * @param amount - Amount to format
   * @returns Formatted string
   */
  private formatAmount(amount: number): string {
    return `₹${amount.toFixed(2)}`;
  }
}
