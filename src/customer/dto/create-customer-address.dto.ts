import {
  IsString,
  IsNotEmpty,
  Length,
  IsEnum,
  IsNumber,
} from 'class-validator';

export enum AddressLabel {
  Home = 'Home',
  Office = 'Office',
  Restaurant = 'Restaurant',
  Shop = 'Shop',
  Institution = 'Institution',
}

export class CreateCustomerAddressDto {
  @IsNotEmpty()
  @IsEnum(AddressLabel)
  label?: AddressLabel;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  cityId: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'Pincode must be exactly 6 digits' })
  pincode?: string;

  @IsNotEmpty()
  @IsNumber()
  lng: number;

  @IsNotEmpty()
  @IsNumber()
  lat: number;
}
