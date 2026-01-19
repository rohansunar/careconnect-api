import { IsString, IsOptional, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAddressDto {
  @ApiPropertyOptional({
    description: 'State of the address',
    example: 'Maharashtra',
  })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiPropertyOptional({
    description: 'City of the address',
    example: 'Mumbai',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({
    description: 'Pincode of the address',
    example: '400001',
  })
  @IsNotEmpty()
  @IsString()
  pincode: string;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: 72.8777,
  })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 19.076,
  })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({
    description: 'Detailed address string',
    example: '123 Main Street, Building A',
  })
  @IsNotEmpty()
  address: any;
}
