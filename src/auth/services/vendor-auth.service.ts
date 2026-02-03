import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { OtpService } from '../../otp/services/otp.service';
import { OtpPurpose, Vendor, Prisma } from '@prisma/client';
import { VerifyOtpDto, VerifyOtpResponseDto } from '../dtos/verify-otp.dto';
import { OtpResponseDto } from '../dtos/request-otp.dto';
import { JwtTokenService } from './jwt-token.service';

@Injectable()
export class VendorAuthService {
  private readonly logger = new Logger(VendorAuthService.name);

  // Token expiration time in seconds (10 hours)
  private readonly VENDOR_JWT_EXPIRES_IN = 36000;

  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Requests an OTP for vendor login authentication.
   * @param phone - The phone number to send the OTP to.
   * @returns A response indicating success and OTP expiration time.
   */
  async requestOtp(phone: string): Promise<OtpResponseDto> {
    this.logger.log(
      `OTP request initiated for phone: ${phone}, purpose: ${OtpPurpose.VENDOR_LOGIN}`,
    );
    await this.otpService.generateOtp(phone, OtpPurpose.VENDOR_LOGIN);
    this.logger.log(
      `OTP generated and sent to ${phone} for ${OtpPurpose.VENDOR_LOGIN}`,
    );
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
    try {
      const { phone, code } = dto;

      this.logger.log(
        `OTP verification initiated for phone: ${phone}, purpose: ${OtpPurpose.VENDOR_LOGIN}`,
      );

      // Verify the OTP code for vendor login
      await this.otpService.verifyOtp({
        phone,
        code,
        purpose: OtpPurpose.VENDOR_LOGIN,
      });

      // Handle vendor creation or update atomically
      const vendor = await this.handleVendorCreationOrUpdate(phone);

      // Generate JWT token with vendor information
      const payload = {
        sub: vendor.id.toString(),
        phone: vendor.phone,
        role: 'vendor',
        businessName: vendor.name,
      };

      const token = this.jwtTokenService.generateToken(payload, 'vendor');

      return {
        token,
        data: vendor,
        expiresIn: this.VENDOR_JWT_EXPIRES_IN,
      };
    } catch (error) {
      this.logger.error('Error in verifyOtpAndCreateVendor:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to verify OTP and create vendor. Please try again.',
      );
    }
  }

  /**
   * Handles the creation of a new vendor or updates an existing one.
   * @param phone - The phone number of the vendor.
   * @returns The created or updated vendor.
   */
  private async handleVendorCreationOrUpdate(phone: string): Promise<Vendor> {
    return await this.prisma.$transaction(async (tx) => {
      const existingVendor = await tx.vendor.findUnique({
        where: { phone },
      });

      if (existingVendor) {
        return await tx.vendor.update({
          where: { phone },
          data: { updated_at: new Date() },
        });
      }

      const vendorNumber = await this.generateVendorNumber(tx);

      return await tx.vendor.create({
        data: {
          phone,
          vendorNo: vendorNumber,
        },
      });
    });
  }

  /**
   * Generates a unique vendor number using a counter.
   * @param tx - The Prisma transaction client.
   * @returns The generated vendor number as a string.
   */
  private async generateVendorNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const counter = await tx.counter.upsert({
      where: { type: 'vendor' },
      update: { lastNumber: { increment: 1 } },
      create: { type: 'vendor', lastNumber: 1 },
    });

    const PREFIX = 'V';
    const PADDING = 6;

    return PREFIX + counter.lastNumber.toString().padStart(PADDING, '0');
  }
}
