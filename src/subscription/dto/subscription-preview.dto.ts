import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsDateString,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  IsNumber,
} from 'class-validator';
import {
  DayOfWeek,
  SubscriptionFrequency,
} from '../interfaces/delivery-frequency.interface';

export class RecalculateSubscriptionPreviewDto {
  @ApiProperty({
    description: 'ID of the product to recalculate preview for',
  })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiPropertyOptional({
    description: 'Optional override for the subscription frequency.',
    enum: SubscriptionFrequency,
    example: SubscriptionFrequency.DAILY,
    default: SubscriptionFrequency.DAILY,
  })
  @IsOptional()
  @IsEnum(SubscriptionFrequency)
  frequency?: SubscriptionFrequency;

  @ApiPropertyOptional({
    description:
      'Optional override for the subscription start date in YYYY-MM-DD format.',
    example: '2026-03-28',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  unit?: number;

  @ApiPropertyOptional({
    description: 'Delivery weekdays. Required when frequency is CUSTOM_DAYS.',
    isArray: true,
    example: [1, 3, 5],
  })
  @ValidateIf(
    (object: RecalculateSubscriptionPreviewDto) =>
      object.frequency === SubscriptionFrequency.CUSTOM_DAYS ||
      object.custom_days !== undefined,
  )
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  custom_days?: DayOfWeek[];
}

export class RecalculateSubscriptionPreviewResponseDto {
  @ApiProperty({
    description: 'Product name',
    example: '20L Water Jar',
  })
  productName: string;

  @ApiPropertyOptional({
    description: 'Primary product image',
    example: 'https://example.com/products/water-jar.jpg',
    nullable: true,
  })
  productImage: string | null;

  @ApiProperty({
    description: 'Computed total amount for the preview period',
    example: 240,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Resolved unit quantity used for the preview',
    example: 1,
  })
  totalUnits: number;

  @ApiProperty({
    description: 'Per-unit subscription price',
    example: 80,
  })
  subscriptionPrice: number;

  @ApiProperty({
    description: 'Resolved subscription frequency',
    enum: SubscriptionFrequency,
    example: SubscriptionFrequency.DAILY,
  })
  frequency: SubscriptionFrequency;

  @ApiProperty({
    description: 'Resolved preview start date in YYYY-MM-DD format',
    example: '2026-03-28',
  })
  startDate: string;

  @ApiProperty({
    description: 'Next scheduled delivery date in YYYY-MM-DD format',
    example: '2026-03-28',
  })
  nextDeliveryDate: string;

  @ApiProperty({
    description: 'Month for which the preview total amount is calculated',
    example: 'March',
  })
  forMonth: string;

  @ApiProperty({
    description: 'Number of scheduled deliveries in the preview period',
    example: 3,
  })
  totalDeliveries: number;
}
