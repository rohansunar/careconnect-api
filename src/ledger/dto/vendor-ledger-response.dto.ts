import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Transaction type enumeration for API responses.
 */
export enum TransactionType {
  SALE = 'SALE',
  FEE = 'FEE',
  REFUND = 'REFUND',
  PAYOUT = 'PAYOUT',
}

/**
 * Individual transaction in the ledger response.
 */
export class TransactionDto {
  @ApiProperty({
    description: 'Date of the transaction in YYYY-MM-DD format',
    example: '2026-02-10',
  })
  date: string;

  @ApiProperty({
    description: 'Type of transaction',
    enum: TransactionType,
    example: 'SALE',
  })
  type: TransactionType;

  @ApiProperty({
    description: 'Amount (positive for credits, negative for debits)',
    example: 2450,
  })
  amount: number;

  @ApiPropertyOptional({
    description: 'Payout ID for PAYOUT type transactions',
    example: 'P123',
  })
  payoutId?: string;
}

/**
 * Summary of ledger transactions including balance.
 */
export class LedgerSummaryDto {
  @ApiProperty({
    description: 'Current balance (sum of all transactions)',
    example: 221270,
  })
  balance: number;
}

/**
 * Complete vendor ledger response containing transactions and summary.
 */
export class VendorLedgerResponseDto {
  @ApiProperty({
    description: 'List of transactions sorted by date (newest first)',
    type: [TransactionDto],
  })
  transactions: TransactionDto[];

  @ApiProperty({
    description: 'Summary including current balance',
    type: LedgerSummaryDto,
  })
  summary: LedgerSummaryDto;
}
