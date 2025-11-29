import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { OtpService } from '../../otp/services/otp.service';
import { OtpPurpose } from '@prisma/client';
import { VerifyOtpDto, VerifyOtpResponseDto } from '../dto/verify-otp.dto';
import { OtpResponseDto } from '../dto/request-otp.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class VendorAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  async requestOtp(phone: string): Promise<OtpResponseDto> {
    await this.otpService.generateOtp(phone, OtpPurpose.VENDOR_LOGIN);
    return { success: true, message: 'OTP sent successfully', expiresIn: 30 };
  }

  async verifyOtpAndCreateVendor(
    dto: VerifyOtpDto,
  ): Promise<VerifyOtpResponseDto> {
    const { phone, code } = dto;

    await this.otpService.verifyOtp(phone, code, OtpPurpose.VENDOR_LOGIN);

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

    // Generate JWT token
    const payload = {
      sub: vendor.id.toString(),
      phone: vendor.phone,
      role: 'vendor',
      businessName: vendor.name,
    };

    const token = this.jwtService.sign(payload);
    const expiresIn = 36000; // 10 hour

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
