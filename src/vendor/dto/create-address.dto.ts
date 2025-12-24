import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  address?: any;

  @IsOptional()
  @IsInt()
  service_radius_m?: number;

  @IsOptional()
  @IsString()
  delivery_time_msg?: string;
}
