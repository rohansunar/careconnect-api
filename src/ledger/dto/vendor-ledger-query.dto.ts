import { IsOptional, IsDateString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query parameters for fetching vendor ledger transactions.
 * Both startDate and endDate are optional, but if one is provided, the other should also be provided.
 */
export class VendorLedgerQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for filtering transactions (ISO 8601 format)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => o.endDate !== undefined)
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering transactions (ISO 8601 format)',
    example: '2026-02-14',
  })
  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => o.startDate !== undefined)
  endDate?: string;
}
