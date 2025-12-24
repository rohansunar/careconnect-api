import { IsString, IsOptional, IsInt } from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

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
