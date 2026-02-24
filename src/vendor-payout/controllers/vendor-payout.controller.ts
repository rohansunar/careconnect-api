import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  VendorPayoutCronService,
  CronExecutionStatus,
} from '../services/vendor-payout-cron.service';

/**
 * DTO for manual trigger payout request
 */
export class TriggerPayoutDto {
  /**
   * Start date of the payout period (ISO 8601 format)
   * Defaults to 7 days ago if not provided
   */
  periodStart?: string;

  /**
   * End date of the payout period (ISO 8601 format)
   * Defaults to current time if not provided
   */
  periodEnd?: string;
}

/**
 * Vendor payout controller for manual trigger and status endpoints
 *
 * Endpoints:
 * - POST /admin/payouts/cron/trigger - Manually trigger the weekly payout process
 * - GET /admin/payouts/cron/status - Get status of last/current payout run
 */
@Controller('admin/payouts/cron')
export class VendorPayoutController {
  constructor(private readonly payoutCronService: VendorPayoutCronService) {}

  /**
   * Manually trigger the weekly payout process
   *
   * This endpoint allows admins to manually trigger the payout process
   * for testing or emergency scenarios.
   *
   * @param dto - Optional period dates
   * @returns Execution status
   */
  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  async triggerPayout(
    @Body() dto: TriggerPayoutDto,
  ): Promise<CronExecutionStatus> {
    const periodStart = dto.periodStart ? new Date(dto.periodStart) : undefined;
    const periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : undefined;

    return this.payoutCronService.triggerManualPayout(periodStart, periodEnd);
  }

  /**
   * Get status of last/current payout run
   *
   * @returns Current execution status
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getStatus(): Promise<CronExecutionStatus> {
    return this.payoutCronService.getExecutionStatus();
  }
}
