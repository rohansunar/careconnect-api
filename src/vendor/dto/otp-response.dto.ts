import { ApiProperty } from '@nestjs/swagger';

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
