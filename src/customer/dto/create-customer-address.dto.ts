import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';

export class CreateCustomerAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  cityId: string;

  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Pincode must be exactly 6 digits' })
  pincode?: string;
}
