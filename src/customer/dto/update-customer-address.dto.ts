import {
  IsString,
  IsOptional,
  Length,
  IsNotEmpty,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AddressLabel {
  Home = 'Home',
  Office = 'Office',
  Restaurant = 'Restaurant',
  Shop = 'Shop',
  Institution = 'Institution',
}

export class UpdateCustomerAddressDto {
   @ApiPropertyOptional({
     enum: AddressLabel,
     description: 'Label for the address (e.g., Home, Office)',
   })
   @IsOptional()
   @IsEnum(AddressLabel)
   label?: AddressLabel;

   @ApiPropertyOptional({
     description: 'Detailed address string',
     example: '123 Main Street, Apartment 4B',
   })
   @IsNotEmpty()
   @IsString()
   address: string;

   @ApiPropertyOptional({
     description: 'ID of the location',
     example: '550e8400-e29b-41d4-a716-446655440000',
   })
   @IsNotEmpty()
   @IsString()
   locationId?: string;

   @ApiPropertyOptional({
     description: 'Pincode of the address',
     example: '110001',
   })
   @IsNotEmpty()
   @IsString()
   @Length(6, 6, { message: 'Pincode must be exactly 6 digits' })
   pincode?: string;

   @ApiPropertyOptional({
     description: 'Longitude coordinate',
     example: 77.209,
   })
   @IsNotEmpty()
   @IsNumber()
   lng: number;

   @ApiPropertyOptional({
     description: 'Latitude coordinate',
     example: 28.6139,
   })
   @IsNotEmpty()
   @IsNumber()
   lat: number;
}
