import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber, IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @ApiProperty({
    description: 'Vendor phone number',
    example: '+1234567890',
  })
  @IsPhoneNumber('IN', { message: 'Invalid phone number' })
  @IsNotEmpty()
  phone: string;
}
