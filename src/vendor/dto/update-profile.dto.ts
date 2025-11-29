import {
  IsOptional,
  IsString,
  IsPhoneNumber,
  IsEmail,
  IsNumber,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsPhoneNumber('IN')
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  delivery_time_msg?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  service_radius_m?: number;
}
