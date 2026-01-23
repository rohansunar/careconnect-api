import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLocationDto {
  @ApiProperty({
    description: 'Location name (city name)',
    example: 'Mumbai',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Latitude of the location',
    example: 19.076,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiProperty({
    description: 'Longitude of the location',
    example: 72.8777,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiProperty({
    description: 'State of the location',
    example: 'Maharashtra',
    required: false,
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({
    description: 'Country of the location',
    example: 'India',
    required: false,
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({
    description: 'Whether the location is serviceable',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isServiceable?: boolean;

  @ApiProperty({
    description: 'Service radius in kilometers',
    example: 50,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  serviceRadiusKm?: number;
}
