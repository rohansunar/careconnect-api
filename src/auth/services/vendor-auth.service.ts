import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { OtpService } from '../../otp/services/otp.service';
import { OtpPurpose } from '@prisma/client';
import { VerifyOtpDto, VerifyOtpResponseDto } from '../dtos/verify-otp.dto';
import { OtpResponseDto } from '../dtos/request-otp.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class VendorAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Requests an OTP for vendor login authentication.
   * @param phone - The phone number to send the OTP to.
   * @returns A response indicating success and OTP expiration time.
   */
  async requestOtp(phone: string): Promise<OtpResponseDto> {
    await this.otpService.generateOtp(phone, OtpPurpose.VENDOR_LOGIN);
    return { success: true, message: 'OTP sent successfully', expiresIn: 30 };
  }

  /**
   * Verifies the OTP and creates or updates the vendor record, then generates a JWT token.
   * @param dto - The data transfer object containing phone and OTP code.
   * @returns A response with the JWT token, vendor details, and expiration time.
   */
  async verifyOtpAndCreateVendor(
    dto: VerifyOtpDto,
  ): Promise<VerifyOtpResponseDto> {
    const { phone, code } = dto;

    // Verify the OTP code for vendor login
    await this.otpService.verifyOtp(phone, code, OtpPurpose.VENDOR_LOGIN);

    // Create or update the vendor record (upsert: update if exists, create if not)
    const vendor = await this.prisma.vendor.upsert({
      where: { phone },
      update: {
        updated_at: new Date(),
      },
      create: {
        phone,
        name: ``,
        is_active: true,
      },
    });

    // Generate JWT token with vendor information
    const payload = {
      sub: vendor.id.toString(),
      phone: vendor.phone,
      role: 'vendor',
      businessName: vendor.name,
    };

    const token = this.jwtService.sign(payload);
    const expiresIn = 36000; // 10 hours

    return {
      token,
      vendor: vendor,
      expiresIn,
    };
  }

  // async refreshTokens(userId: number, refreshToken: string) {
  //   const user = await this.prisma.vendor.findFirst(userId);
  //   if (!user || !user.currentHashedRefreshToken) {
  //     throw new UnauthorizedException('No refresh token stored. Please login again.');
  //   }

  //   const isMatch = await bcrypt.compare(refreshToken, user.currentHashedRefreshToken);
  //   if (!isMatch) {
  //     // token mismatch -> possible reuse -> revoke
  //     await this.usersService.removeRefreshToken(userId);
  //     throw new UnauthorizedException('Refresh token invalid');
  //   }

  //   // rotate: issue new tokens and replace stored hashed refresh token
  //   const tokens = await this.getTokens(user.id, user.email);
  //   const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
  //   await this.usersService.setCurrentRefreshToken(user.id, hashedRefresh);

  //   return tokens;
  // }
}
