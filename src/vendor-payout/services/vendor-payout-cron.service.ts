import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/database/prisma.service';
import { EmailChannelService } from '../../notification/services/channels/email-channel.service';

/**
 * Vendor Payout Detection Service
 *
 * This service runs a weekly cron job to detect vendors with available balance > 100
 * and sends an email notification to the admin with the total transfer amount.
 *
 * Functionality:
 * - Runs weekly via cron job
 * - Queries VendorBalance model for vendors with availableBalance > 100
 * - Calculates sum of all eligible vendor balances
 * - Sends email notification to admin with total amount
 */
@Injectable()
export class VendorPayoutCronService {
  private readonly logger = new Logger(VendorPayoutCronService.name);

  // Minimum balance threshold for payout detection
  private readonly minBalanceThreshold = 10;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailChannelService: EmailChannelService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Weekly cron job - runs every Sunday at midnight
   * Uses CronExpression.EVERY_WEEK for weekly scheduling
   */
  @Cron(CronExpression.EVERY_WEEKEND)
  async handleWeeklyPayoutDetection(): Promise<void> {
    this.logger.log({
      event: 'WEEKLY_CRON_STARTED',
      message: 'Weekly vendor payout detection cron job started',
    });

    try {
      // Step 1: Query all vendors with availableBalance > 100
      const eligibleVendors = await this.prismaService.vendorBalance.findMany({
        where: {
          availableBalance: {
            gt: this.minBalanceThreshold,
          },
        },
        select: {
          vendorId: true,
          availableBalance: true,
          vendor: {
            select: {
              vendorNo: true,
              name: true,
              business_name: true,
              email: true,
            },
          },
        },
      });

      this.logger.log({
        event: 'VENDORS_QUERIED',
        count: eligibleVendors.length,
        message: `Found ${eligibleVendors.length} vendors with available balance > ${this.minBalanceThreshold}`,
      });

      // Step 2: Calculate sum of all vendor available balances
      const totalTransferAmount = eligibleVendors.reduce(
        (sum, vendor) => sum + Number(vendor.availableBalance),
        0,
      );

      this.logger.log({
        event: 'TOTAL_CALCULATED',
        totalAmount: totalTransferAmount,
        message: `Total transfer amount: ${totalTransferAmount}`,
      });

      // Step 3: Send email notification to admin
      await this.sendAdminNotification(eligibleVendors, totalTransferAmount);

      this.logger.log({
        event: 'WEEKLY_CRON_COMPLETED',
        message:
          'Weekly vendor payout detection cron job completed successfully',
      });
    } catch (error) {
      this.logger.error({
        event: 'WEEKLY_CRON_FAILED',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        message: 'Weekly vendor payout detection cron job failed',
      });
      // @TODO - Send SMS on error
    }
  }

  /**
   * Sends email notification to admin with vendor payout summary
   *
   * @param eligibleVendors - List of vendors with eligible balances
   * @param totalAmount - Total sum of all eligible balances
   */
  private async sendAdminNotification(
    eligibleVendors: Array<{
      vendorId: string;
      availableBalance: Decimal;
      vendor: {
        vendorNo: string;
        name: string | null;
        business_name: string | null;
        email: string | null;
      };
    }>,
    totalAmount: number,
  ): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');

    if (!adminEmail) {
      this.logger.error({
        event: 'ADMIN_EMAIL_NOT_CONFIGURED',
        message: 'ADMIN_EMAIL is not configured - cannot send notification',
      });
      return;
    }

    // Build vendor details HTML
    const vendorDetailsHtml = eligibleVendors
      .map(
        (vendor) => `
        <tr>
          <td>${vendor.vendor.vendorNo}</td>
          <td>${vendor.vendor.name || vendor.vendor.business_name || 'N/A'}</td>
          <td>${vendor.vendorId}</td>
          <td>${Number(vendor.availableBalance).toFixed(2)}</td>
        </tr>
      `,
      )
      .join('');

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; font-size: 18px; color: #4CAF50; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Weekly Vendor Payout Detection</h1>
            </div>
            <div class="content">
              <p>This is a weekly notification regarding vendors with available balances exceeding the threshold.</p>
              
              <h2>Summary</h2>
              <p><strong>Minimum Balance Threshold:</strong> ${this.minBalanceThreshold.toFixed(2)}</p>
              <p><strong>Total Vendors Eligible:</strong> ${eligibleVendors.length}</p>
              <p class="total">Total Transfer Amount: ${totalAmount.toFixed(2)}</p>
              
              <h2>Eligible Vendors</h2>
              <table>
                <thead>
                  <tr>
                    <th>Vendor Name</th>
                    <th>Vendor ID</th>
                    <th>Available Balance</th>
                  </tr>
                </thead>
                <tbody>
                  ${vendorDetailsHtml || '<tr><td colspan="3">No eligible vendors found</td></tr>'}
                </tbody>
              </table>
            </div>
            <div class="footer">
              <p>This is an automated notification from the Vendor Payout System.</p>
              <p>Generated on: ${new Date().toISOString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await this.emailChannelService.sendEmail(
      adminEmail,
      `Weekly Vendor Payout Detection - Total: $${totalAmount.toFixed(2)}`,
      emailHtml,
    );

    if (result.success) {
      this.logger.log({
        event: 'ADMIN_NOTIFICATION_SENT',
        adminEmail,
        messageId: result.messageId,
        message: 'Admin notification email sent successfully',
      });
    } else {
      this.logger.error({
        event: 'ADMIN_NOTIFICATION_FAILED',
        adminEmail,
        error: result.error,
        message: 'Failed to send admin notification email',
      });
    }
  }
}
