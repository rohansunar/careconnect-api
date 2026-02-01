import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { OtpService } from '../../otp/services/otp.service';
import { OtpPurpose } from '@prisma/client';
import { VerifyOtpDto, VerifyOtpResponseDto } from '../dtos/verify-otp.dto';
import { OtpResponseDto } from '../dtos/request-otp.dto';
import { JwtTokenService } from './jwt-token.service';

/**
 * RiderAuthService handles authentication for riders using OTP-based login.
 */
@Injectable()
export class RiderAuthService {
  private readonly logger = new Logger(RiderAuthService.name);

  // Token expiration time in seconds (10 hours)
  private readonly RIDER_JWT_EXPIRES_IN = 36000;

  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Requests an OTP for rider login authentication.
   * @param phone - The phone number to send the OTP to.
   * @returns A response indicating success and OTP expiration time.
   */
  async requestOtp(phone: string): Promise<OtpResponseDto> {
    this.logger.log(
      `OTP request initiated for phone: ${phone}, purpose: ${OtpPurpose.RIDER_LOGIN}`,
    );
    await this.otpService.generateOtp(phone, OtpPurpose.RIDER_LOGIN);
    this.logger.log(
      `OTP generated and sent to ${phone} for ${OtpPurpose.RIDER_LOGIN}`,
    );
    return { success: true, message: 'OTP sent successfully', expiresIn: 30 };
  }

  /**
   * Verifies the OTP and creates or updates the rider record, then generates a JWT token.
   * @param dto - The data transfer object containing phone and OTP code.
   * @returns A response with the JWT token, rider details, and expiration time.
   */
  async verifyOtpAndCreateRider(
    dto: VerifyOtpDto,
  ): Promise<VerifyOtpResponseDto> {
    try {
      const { phone, code } = dto;

      this.logger.log(
        `OTP verification initiated for phone: ${phone}, purpose: ${OtpPurpose.RIDER_LOGIN}`,
      );

      // Verify the OTP code for rider login
      await this.otpService.verifyOtp({
        phone,
        code,
        purpose: OtpPurpose.RIDER_LOGIN,
      });

      // Handle rider creation or update atomically
      const rider = await this.handleRiderCreationOrUpdate(phone);

      // Generate JWT token with rider information
      const payload = {
        sub: rider.id.toString(),
        phone: rider.phone,
        name: rider.name,
      };

      const token = this.jwtTokenService.generateToken(payload, 'rider');

      return {
        token,
        data: rider,
        expiresIn: this.RIDER_JWT_EXPIRES_IN,
      };
    } catch (error) {
      this.logger.error('Error in verifyOtpAndCreateRider:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to verify OTP and create rider. Please try again.',
      );
    }
  }

  /**
   * Handles the creation of a new rider or updates an existing one.
   * @param phone - The phone number of the rider.
   * @returns The created or updated rider.
   */
  private async handleRiderCreationOrUpdate(phone: string) {
    return await this.prisma.$transaction(async (tx) => {
      const existingRider = await tx.rider.findUnique({
        where: { phone },
      });

      if (existingRider) {
        return await tx.rider.update({
          where: { phone },
          data: { updated_at: new Date() },
        });
      }

      return await tx.rider.create({
        data: {
          phone,
          name: '',
        },
      });
    });
  }
}
