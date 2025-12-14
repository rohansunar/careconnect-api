import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { OtpService } from '../../otp/services/otp.service';
import { OtpPurpose } from '@prisma/client';
import { VerifyOtpDto, VerifyOtpResponseDto } from '../dtos/verify-otp.dto';
import { OtpResponseDto } from '../dtos/request-otp.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * CustomerAuthService handles authentication for customers using OTP-based login.
 *
 * Design Rationale:
 * - Separate files for scalability: By maintaining distinct service files for vendors and customers,
 *   we ensure modularity and allow for independent scaling, testing, and maintenance of authentication logic.
 * - OTP for security: OTP (One-Time Password) provides an additional layer of security beyond traditional passwords,
 *   reducing risks associated with credential theft and enabling secure, passwordless authentication.
 * - Mirroring vendor auth for consistency: Replicating the vendor authentication structure promotes code consistency,
 *   reduces duplication, and simplifies maintenance across different user types in the system.
 */
@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Requests an OTP for customer login authentication.
   * @param phone - The phone number to send the OTP to.
   * @returns A response indicating success and OTP expiration time.
   */
  async requestOtp(phone: string): Promise<OtpResponseDto> {
    const otp = await this.otpService.generateOtp(phone, OtpPurpose.CUSTOMER_LOGIN);
    console.log(`SMS to ${phone}: Your OTP code is ${otp}`);
    return { success: true, message: 'OTP sent successfully', expiresIn: 30 };
  }

  /**
   * Verifies the OTP and creates or updates the customer record, then generates a JWT token.
   * @param dto - The data transfer object containing phone and OTP code.
   * @returns A response with the JWT token, customer details, and expiration time.
   */
  async verifyOtpAndCreateCustomer(
    dto: VerifyOtpDto,
  ): Promise<VerifyOtpResponseDto> {
    const { phone, code } = dto;

    // Verify the OTP code for customer login
    await this.otpService.verifyOtp(phone, code, OtpPurpose.CUSTOMER_LOGIN);

    // Create or update the customer record (upsert: update if exists, create if not)
    const customer = await this.prisma.customer.upsert({
      where: { phone },
      update: {
        updated_at: new Date(),
      },
      create: {
        phone,
        name: ``,
      },
    });

    // Generate JWT token with customer information
    const payload = {
      sub: customer.id.toString(),
      phone: customer.phone,
      role: 'customer',
      name: customer.name,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.config.get('CUSTOMER_JWT_SECRET'),
    });
    const expiresIn = 36000; // 10 hours

    return {
      token,
      vendor: customer,
      expiresIn,
    };
  }

  // async refreshTokens(userId: number, refreshToken: string) {
  //   const user = await this.prisma.customer.findFirst(userId);
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
