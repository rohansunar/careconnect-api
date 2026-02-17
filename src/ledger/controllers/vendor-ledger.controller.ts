import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { VendorLedgerService } from '../services/vendor-ledger.service';
import { VendorLedgerQueryDto } from '../dto/vendor-ledger-query.dto';
import {
  VendorLedgerResponseDto,
  TransactionDto,
  LedgerSummaryDto,
} from '../dto/vendor-ledger-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../common/interfaces/user.interface';

@ApiTags('Vendor Ledger')
@Controller('vendor/ledger')
@Roles('vendor')
@ApiBearerAuth()
export class VendorLedgerController {
  constructor(private readonly vendorLedgerService: VendorLedgerService) {}

  /**
   * Fetches ledger transactions for the authenticated vendor.
   * Supports optional date range filtering.
   *
   * Business logic: Provides vendors with their complete transaction history
   * including sales, fees, refunds, and payouts.
   *
   * Security: Only accessible to authenticated vendors via JWT.
   */
  @Get('transactions')
  @ApiOperation({
    summary: 'Get vendor ledger transactions',
    description:
      'Retrieve all ledger transactions (sales, fees, refunds, payouts) for the authenticated vendor. Supports optional date range filtering.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for filtering (ISO 8601 format: YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for filtering (ISO 8601 format: YYYY-MM-DD)',
    example: '2026-02-14',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    type: VendorLedgerResponseDto,
    schema: {
      example: {
        transactions: [
          {
            date: '2026-02-10',
            type: 'SALE',
            amount: 2450,
          },
          {
            date: '2026-02-10',
            type: 'FEE',
            amount: -180,
          },
          {
            date: '2026-02-09',
            type: 'PAYOUT',
            amount: -48000,
            payoutId: 'P123',
          },
        ],
        summary: {
          balance: 221270,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid date format or range',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'startDate must be before or equal to endDate',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not a vendor',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Insufficient permissions' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  async getTransactions(
    @Query() query: VendorLedgerQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.vendorLedgerService.getTransactions(
      user.id,
      query.startDate,
      query.endDate,
    );
  }
}
