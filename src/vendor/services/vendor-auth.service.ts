import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { OtpService } from '../../otp/services/otp.service';
import { OtpPurpose } from '@prisma/client';
import { VerifyOtpDto } from '../dto/verify-otp.dto';

@Injectable()
export class VendorAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  async requestOtp(phone: string): Promise<{ message: string }> {
    await this.otpService.generateOtp(phone, OtpPurpose.VENDOR_LOGIN);
    return { message: 'OTP sent successfully' };
  }

  async verifyOtpAndCreateVendor(
    dto: VerifyOtpDto,
  ): Promise<{ message: string; vendor?: any }> {
    await this.otpService.verifyOtp(
      dto.phone,
      dto.code,
      OtpPurpose.VENDOR_LOGIN,
    );

    // Ensure phone uniqueness
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { phone: dto.phone },
    });
    if (existingVendor) {
      throw new BadRequestException(
        'Vendor with this phone number already exists',
      );
    }

    const vendor = await this.prisma.vendor.create({
      data: {
        name: "",
        phone: dto.phone,
        email: "",
        address: "",
      },
    });

    return { message: 'Vendor created successfully', vendor };
  }
}
