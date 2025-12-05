import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateCustomerAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Pincode must be exactly 6 digits' })
  pincode?: string;
}
