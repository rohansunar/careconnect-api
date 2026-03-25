import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Mineral Water 20L',
  })
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  categoryId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_schedulable?: boolean;

  @ApiProperty({
    description: 'Subscription price (required when is_schedulable is true)',
    example: 80.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  subscription_price?: number;
}
