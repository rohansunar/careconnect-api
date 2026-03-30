import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @ApiProperty({
    description: 'User phone number',
    example: '9832012345',
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
    description: 'Authentication Token for Vendor/User',
  })
  token: string;

  @ApiProperty({
    description: 'Vendor or User Details',
  })
  data: any;

  expiresIn: number;
}
