import { IsOptional, IsString, IsPhoneNumber, IsEmail } from 'class-validator';

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
  business_name?: string;
}
