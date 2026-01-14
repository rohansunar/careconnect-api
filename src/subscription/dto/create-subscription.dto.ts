import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, IsDateString, IsOptional, IsArray, IsEnum } from 'class-validator';

enum SubscriptionFrequency {
  DAILY = 'DAILY',
  ALTERNATIVE_DAYS = 'ALTERNATIVE_DAYS',
  CUSTOM_DAYS = 'CUSTOM_DAYS',
}

enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'ID of the product' })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Quantity of the product' })
  @IsNotEmpty()
  @IsInt()
  quantity: number;

  @ApiProperty({ description: 'Frequency of the subscription', enum: SubscriptionFrequency })
  @IsNotEmpty()
  @IsEnum(SubscriptionFrequency)
  frequency: SubscriptionFrequency;

  @ApiProperty({ description: 'Start date of the subscription' })
  @IsNotEmpty()
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'Custom days for delivery (required if frequency is CUSTOM_DAYS)' })
  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  custom_days?: DayOfWeek[];
}