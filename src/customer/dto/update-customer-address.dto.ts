import {
  IsString,
  IsOptional,
  Length,
  IsNotEmpty,
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

export class UpdateCustomerAddressDto {
  @IsOptional()
  @IsEnum(AddressLabel)
  label?: AddressLabel;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  cityId?: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'Pincode must be exactly 6 digits' })
  pincode?: string;

  @IsNotEmpty()
  @IsObject()
  location: object;
}
