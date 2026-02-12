import {
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for assigning orders to a rider
 *
 * Supports both single and bulk order assignment through a single API call.
 * All orders will be assigned to the specified rider.
 */
export class AssignOrdersDto {
  @ApiProperty({
    description: 'Array of order IDs to assign to the rider',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
    ],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one order ID must be provided' })
  @IsUUID('4', { each: true, message: 'Each order ID must be a valid UUID' })
  orderIds: string[];

  @ApiProperty({
    description: 'Unique identifier of the rider to assign orders to',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'Rider ID is required' })
  @IsUUID('4', { message: 'Rider ID must be a valid UUID' })
  riderId: string;
}

/**
 * Response DTO for successful order assignment
 */
export class AssignedOrderResult {
  orderId: string;
  orderNo: string;
}

/**
 * Response DTO for failed order assignment
 */
export class FailedOrderResult {
  orderId: string;
  reason: string;
}