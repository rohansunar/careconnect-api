import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiProperty({
    description: 'Search term for product name or description',
    required: false,
  })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiProperty({
    description: 'Filter by category ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    description: 'Filter by minimum price',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  minPrice?: number;

  @ApiProperty({
    description: 'Filter by maximum price',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @ApiProperty({
    description: 'Filter by availability (active products only)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  availableOnly?: boolean;

  @ApiProperty({
    description: 'Filter by vendor ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  vendorId?: string;

  @ApiProperty({
    description: 'Sort by field (name, price, created_at)',
    required: false,
    enum: ['name', 'price', 'created_at'],
  })
  @IsString()
  @IsOptional()
  sortBy?: 'name' | 'price' | 'created_at';

  @ApiProperty({
    description: 'Sort order (asc or desc)',
    required: false,
    enum: ['asc', 'desc'],
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page for pagination',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  limit?: number = 10;
}
