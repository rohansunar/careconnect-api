import {
  IsString,
  IsOptional,
  IsInt,
  IsNotEmpty,
  IsObject,
} from 'class-validator';

export class UpdateAddressDto {
  @IsNotEmpty()
  @IsString()
  street?: string;

  @IsNotEmpty()
  @IsString()
  cityId?: string;

  @IsNotEmpty()
  @IsString()
  state?: string;

  @IsNotEmpty()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsObject()
  location?: { lat: string; lng: string };

  @IsNotEmpty()
  address?: any;

  @IsNotEmpty()
  @IsInt()
  service_radius_m?: number;

  @IsOptional()
  @IsString()
  delivery_time_msg?: string;
}
