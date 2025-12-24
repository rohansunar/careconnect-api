import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for canceling an order
 */
export class CancelOrderDto {
  /**
   * Reason for canceling the order
   */
  @ApiProperty({
    description: 'Reason for canceling the order',
    example: 'Customer requested cancellation due to change of plans',
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  cancelReason: string;
}
