import { IsString, IsEnum } from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class OtpVerificationDto {
  @IsString()
  phone: string;

  @IsString()
  code: string;

  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
