import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data transfer object for initializing a payment
 */
export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment amount in INR (minimum ₹10, maximum ₹1,00,000)',
    example: 500,
    minimum: 10,
    maximum: 100000,
  })
  @IsNumber()
  @Min(10, { message: 'Amount must be at least ₹10' })
  @Max(100000, { message: 'Amount cannot exceed ₹1,00,000' })
  amount: number;

  @ApiPropertyOptional({
    description: 'Optional notes for the payment',
    example: { wallet_topup: true },
  })
  @IsOptional()
  notes?: Record<string, string>;
}
