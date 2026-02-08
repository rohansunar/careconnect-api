import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsArray,
  IsEnum,
  ArrayMaxSize,
  IsNumber,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OrderStatus } from '../../common/constants/order-status.constants';
import { PaymentMode } from './create-order-from-cart.dto';
import { PaymentStatus } from '@prisma/client';

/**
 * Data Transfer Object for getMyOrders query parameters.
 * Validates delivery_status, payment_mode, payment_status filters and pagination parameters.
 */
export class GetMyOrdersQueryDto {
  /**
   * Filter by delivery status(es).
   * Can be a single status or comma-separated string of statuses.
   */
  @ApiProperty({
    name: 'delivery_status',
    required: false,
    description:
      'Filter by order delivery status(es). Can be a single status or comma-separated string.',
    example: ['PENDING', 'OUT_FOR_DELIVERY'],
    enum: OrderStatus,
    isArray: true,
  })
  @IsOptional()
  @IsArray({
    message: 'delivery_status must be an array of valid order statuses',
  })
  @ArrayMaxSize(10, { message: 'Maximum 10 delivery statuses allowed' })
  @IsEnum(OrderStatus, {
    each: true,
    message:
      'Invalid delivery_status value. Valid values are: PENDING, CONFIRMED, PROCESSING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((s) => s.trim());
    }
    return value;
  })
  delivery_status?: OrderStatus[];

  /**
   * Page number for pagination.
   */
  @ApiProperty({
    name: 'page',
    required: false,
    description: 'Page number for pagination (default: 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: string;

  /**
   * Number of items per page.
   */
  @ApiProperty({
    name: 'limit',
    required: false,
    description: 'Number of items per page (default: 10)',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: string;
}
