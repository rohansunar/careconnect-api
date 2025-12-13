import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber, IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @ApiProperty({
    description: 'Vendor/Customer phone number',
    example: '+91-9832012345',
  })
  @IsPhoneNumber('IN', { message: 'Invalid phone number' })
  @IsNotEmpty()
  phone: string;
}

export class OtpResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'OTP sent successfully to your phone number',
  })
  message: string;

  @ApiProperty({
    description: 'OTP expiry time in minutes',
    example: 30,
  })
  expiresIn?: number;
}
