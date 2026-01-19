import {
  IsString,
  IsNotEmpty,
  Length,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AddressLabel {
  Home = 'Home',
  Office = 'Office',
  Restaurant = 'Restaurant',
  Shop = 'Shop',
  Institution = 'Institution',
}

export class CreateCustomerAddressDto {
   @ApiPropertyOptional({
     enum: AddressLabel,
     description: 'Label for the address (e.g., Home, Office)',
   })
   @IsNotEmpty()
   @IsEnum(AddressLabel)
   label?: AddressLabel;

   @ApiProperty({
     description: 'Detailed address string',
     example: '123 Main Street, Apartment 4B',
   })
   @IsString()
   @IsNotEmpty()
   address: string;

   @ApiProperty({
     description: 'ID of the location',
     example: '550e8400-e29b-41d4-a716-446655440000',
   })
   @IsString()
   @IsNotEmpty()
   locationId: string;

   @ApiPropertyOptional({
     description: 'Pincode of the address',
     example: '110001',
   })
   @IsNotEmpty()
   @IsString()
   @Length(6, 6, { message: 'Pincode must be exactly 6 digits' })
   pincode?: string;

   @ApiProperty({
     description: 'Longitude coordinate',
     example: 77.209,
   })
   @IsNotEmpty()
   @IsNumber()
   lng: number;

   @ApiProperty({
     description: 'Latitude coordinate',
     example: 28.6139,
   })
   @IsNotEmpty()
   @IsNumber()
   lat: number;
}
