import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum } from 'class-validator';
import { DayOfWeek, SubscriptionFrequency } from '../interfaces/delivery-frequency.interface';

export class UpdateSubscriptionDto {
  @ApiProperty({ description: 'Quantity of the product' })
  @IsOptional()
  @IsInt()
  quantity?: number;

  @ApiProperty({ description: 'Frequency of the subscription', enum: SubscriptionFrequency })
  @IsOptional()
  @IsEnum(SubscriptionFrequency)
  frequency?: SubscriptionFrequency;

  @ApiProperty({ description: 'Custom days for delivery (required if frequency is CUSTOM_DAYS)' })
  @IsOptional()
  @IsEnum(DayOfWeek, { each: true })
  custom_days?: DayOfWeek[];

  @ApiProperty({ description: 'Start date of the subscription' })
  @IsOptional()
  start_date?: Date;
}