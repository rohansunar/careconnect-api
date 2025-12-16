import {
  IsString,
  IsPhoneNumber,
  IsEmail,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateRiderDto {
  @IsString()
  name: string;

  @IsPhoneNumber('IN')
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUUID()
  vendorId?: string;
}