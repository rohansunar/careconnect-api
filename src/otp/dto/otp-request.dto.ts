import { IsString, IsEnum } from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class OtpRequestDto {
  @IsString()
  phone: string;

  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
