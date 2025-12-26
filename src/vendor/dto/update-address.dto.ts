import { IsString, IsOptional, IsInt, IsNotEmpty } from 'class-validator';

export class UpdateAddressDto {
  @IsNotEmpty()
  @IsString()
  street?: string;

  @IsNotEmpty()
  @IsString()
  city?: string;

  @IsNotEmpty()
  @IsString()
  state?: string;

  @IsNotEmpty()
  @IsString()
  zipCode?: string;

  @IsNotEmpty()
  @IsString()
  location?: string;

  @IsNotEmpty()
  address?: any;

  @IsNotEmpty()
  @IsInt()
  service_radius_m?: number;

  @IsOptional()
  @IsString()
  delivery_time_msg?: string;
}
