import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  IsObject,
  IsEnum,
} from 'class-validator';

export enum AddressLabel {
  Home = 'Home',
  Office = 'Office',
  Restaurant = 'Restaurant',
  Shop = 'Shop',
  Institution = 'Institution',
}

export class CreateCustomerAddressDto {
  @IsOptional()
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
  @IsObject()
  location: object;
}
