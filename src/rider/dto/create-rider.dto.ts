import {
  IsString,
  IsPhoneNumber,
  IsEmail,
  IsOptional,
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
}