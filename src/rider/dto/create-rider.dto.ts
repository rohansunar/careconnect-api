import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsPhoneNumber,
  IsEmail,
  IsOptional,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';

export class CreateRiderDto {
  @IsString()
  name: string;

  @IsString()
  @ApiProperty({
    description: 'Rider phone number',
    example: '9832012345',
  })
  @IsPhoneNumber('IN', { message: 'Invalid phone number' })
  @IsNotEmpty()
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
