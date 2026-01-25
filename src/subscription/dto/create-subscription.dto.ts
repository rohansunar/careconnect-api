import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsDateString,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import {
  DayOfWeek,
  SubscriptionFrequency,
} from '../interfaces/delivery-frequency.interface';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'ID of the product' })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Quantity of the product' })
  @IsNotEmpty()
  @IsInt()
  quantity: number;

  @ApiProperty({
    description: 'Frequency of the subscription',
    enum: SubscriptionFrequency,
  })
  @IsNotEmpty()
  @IsEnum(SubscriptionFrequency)
  frequency: SubscriptionFrequency;

  @ApiProperty({ description: 'Start date of the subscription' })
  @IsNotEmpty()
  @IsDateString()
  start_date: string;

  @ApiProperty({
    description:
      'Custom days for delivery (required if frequency is CUSTOM_DAYS)',
  })
  @IsOptional()
  @IsArray()
  // @IsEnum(DayOfWeek, { each: true })
  custom_days?: DayOfWeek[];
}
