import { IsString, IsNotEmpty, IsOptional, IsInt, IsObject } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  cityId: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @IsOptional()
  @IsObject()
  location?: {lat:string,lng:string};

  @IsOptional()
  address?: any;

  @IsOptional()
  @IsInt()
  service_radius_m?: number;

  @IsOptional()
  @IsString()
  delivery_time_msg?: string;
}
