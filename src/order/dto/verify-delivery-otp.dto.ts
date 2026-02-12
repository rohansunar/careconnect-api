import { IsString, IsNotEmpty, Length } from 'class-validator';

/**
 * Data Transfer Object for verifying delivery OTP
 */
export class VerifyDeliveryOtpDto {
  /**
   * The 4-digit OTP code for delivery verification
   */
  @IsNotEmpty()
  @IsString()
  @Length(4, 4, { message: 'OTP must be exactly 4 digits' })
  otp: string;
}
