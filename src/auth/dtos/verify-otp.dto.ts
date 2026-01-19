import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsPhoneNumber,
} from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @ApiProperty({
    description: 'Vendor/Customer phone number',
    example: '+91-9832012345',
  })
  @IsPhoneNumber('IN', { message: 'Invalid phone number' })
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'OTP code received',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class VerifyOtpResponseDto {
  @ApiProperty({
    description: 'Authentication Token for Vendor/Customer',
  })
  token: string;

  @ApiProperty({
    description: 'Vendor or Customer Details',
  })
  data: any;

  expiresIn: number;
}
