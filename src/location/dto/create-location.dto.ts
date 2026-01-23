import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({
    description: 'Location name (city name)',
    example: 'Mumbai',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Latitude of the location',
    example: 19.076,
  })
  @IsNumber()
  lat: number;

  @ApiProperty({
    description: 'Longitude of the location',
    example: 72.8777,
  })
  @IsNumber()
  lng: number;

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
