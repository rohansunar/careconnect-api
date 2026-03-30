import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @ApiProperty({
    description: 'User phone number',
    example: '9832012345',
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
