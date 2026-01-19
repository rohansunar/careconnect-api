import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
   @ApiProperty({
     description: 'ID of the location',
     example: '550e8400-e29b-41d4-a716-446655440000',
   })
   @IsString()
   @IsNotEmpty()
   locationId: string;

   @ApiProperty({
     description: 'State of the address',
     example: 'Maharashtra',
   })
   @IsString()
   @IsNotEmpty()
   state: string;

   @ApiProperty({
     description: 'Pincode of the address',
     example: '400001',
   })
   @IsString()
   @IsNotEmpty()
   pincode: string;

   @ApiPropertyOptional({
     description: 'Longitude coordinate',
     example: 72.8777,
   })
   @IsNotEmpty()
   @IsNumber()
   lng?: number;

   @ApiPropertyOptional({
     description: 'Latitude coordinate',
     example: 19.076,
   })
   @IsNotEmpty()
   @IsNumber()
   lat?: number;

   @ApiProperty({
     description: 'Detailed address string',
     example: '123 Main Street, Building A',
   })
   @IsNotEmpty()
   address: any;
}
