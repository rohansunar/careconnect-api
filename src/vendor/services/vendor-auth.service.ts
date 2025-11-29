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
}
