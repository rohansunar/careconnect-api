import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { OtpService } from '../../otp/services/otp.service';
import { OtpPurpose } from '@prisma/client';
import { VerifyOtpDto, VerifyOtpResponseDto } from '../dtos/verify-otp.dto';
import { OtpResponseDto } from '../dtos/request-otp.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VendorAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Requests an OTP for vendor login authentication.
   * @param phone - The phone number to send the OTP to.
   * @returns A response indicating success and OTP expiration time.
   */
  async requestOtp(phone: string): Promise<OtpResponseDto> {
    const otp = await this.otpService.generateOtp(
      phone,
      OtpPurpose.VENDOR_LOGIN,
    );
    console.log(`SMS to ${phone}: Your OTP code is ${otp}`);
    return { success: true, message: 'OTP sent successfully', expiresIn: 30 };
  }

  // Constants for better maintainability
  private readonly VENDOR_JWT_EXPIRES_IN = 36000; // 10 hours in seconds
  private readonly VENDOR_NUMBER_PREFIX = 'V';
  private readonly VENDOR_NUMBER_PADDING = 6;

  /**
   * Verifies the OTP and creates or updates the vendor record, then generates a JWT token.
   * This function handles vendor authentication by validating the OTP, ensuring atomic vendor creation or update,
   * and issuing a secure JWT token for subsequent requests.
   *
   * @param dto - The data transfer object containing phone and OTP code.
   * @returns A response with the JWT token, vendor details, and expiration time.
   * @throws BadRequestException if OTP verification fails, input validation fails, or vendor creation/update encounters issues.
   */
  async verifyOtpAndCreateVendor(
    dto: VerifyOtpDto,
  ): Promise<VerifyOtpResponseDto> {
    try {
      // Validate input parameters
      this.validateVerifyOtpDto(dto);
      const { phone, code } = dto;

      // Step 1: Verify the OTP code for vendor login
      // This ensures the user has received and entered the correct OTP, preventing unauthorized access.
      await this.otpService.verifyOtp(phone, code, OtpPurpose.VENDOR_LOGIN);

      // Step 2: Handle vendor creation or update atomically
      // Using a transaction ensures data consistency and prevents partial updates.
      const vendor = await this.handleVendorCreationOrUpdate(phone);

      // Step 3: Generate JWT token with vendor information
      // The token includes essential vendor details for authentication and authorization.
      const payload = {
        sub: vendor.id.toString(),
        phone: vendor.phone,
        role: 'vendor',
        businessName: vendor.name,
      };

      const token = this.jwtService.sign(payload, {
        secret: this.config.get<string>('VENDOR_JWT_SECRET'),
      });

      return {
        token,
        data: vendor,
        expiresIn: this.VENDOR_JWT_EXPIRES_IN,
      };
    } catch (error) {
      // Log the error for debugging (assuming a logger is available, but using console for simplicity)
      console.error('Error in verifyOtpAndCreateVendor:', error);

      // Re-throw with a user-friendly message if it's a known error, or a generic one
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to verify OTP and create vendor. Please try again.',
      );
    }
  }

  /**
   * Validates the VerifyOtpDto input.
   * Ensures phone and code are provided and in expected formats.
   * @param dto - The DTO to validate.
   * @throws BadRequestException if validation fails.
   */
  private validateVerifyOtpDto(dto: VerifyOtpDto): void {
    if (!dto.phone || !dto.code) {
      throw new BadRequestException('Phone and OTP code are required.');
    }
    // Additional validation: Ensure phone is a valid format (basic check)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    if (!phoneRegex.test(dto.phone.replace('-', ''))) {
      throw new BadRequestException('Invalid phone number format.');
    }
    // Ensure code is numeric and of expected length (assuming 6 digits)
    if (!/^\d{6}$/.test(dto.code)) {
      throw new BadRequestException('OTP code must be a 6-digit number.');
    }
  }

  /**
   * Handles the creation of a new vendor or updates an existing one.
   * This method encapsulates the logic for vendor management to improve modularity and testability.
   * @param phone - The phone number of the vendor.
   * @returns The created or updated vendor.
   */
  private async handleVendorCreationOrUpdate(phone: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Check if vendor already exists
      const existingVendor = await tx.vendor.findUnique({
        where: { phone },
      });

      if (existingVendor) {
        // For existing vendors, update the last login timestamp
        return await tx.vendor.update({
          where: { phone },
          data: { updated_at: new Date() },
        });
      } else {
        // For new vendors, generate a unique vendor number
        const vendorNumber = await this.generateVendorNumber(tx);

        // Create the new vendor record
        return await tx.vendor.create({
          data: {
            phone,
            name: '', // Default empty name; can be updated later
            vendorNo: vendorNumber,
            is_active: true,
          },
        });
      }
    });
  }

  /**
   * Generates a unique vendor number using a counter.
   * Ensures uniqueness by incrementing a global counter.
   * @param tx - The Prisma transaction client.
   * @returns The generated vendor number as a string.
   */
  private async generateVendorNumber(tx: any): Promise<string> {
    const counter = await tx.counter.upsert({
      where: { type: 'vendor' },
      update: { lastNumber: { increment: 1 } },
      create: { type: 'vendor', lastNumber: 1 },
    });

    return (
      this.VENDOR_NUMBER_PREFIX +
      counter.lastNumber.toString().padStart(this.VENDOR_NUMBER_PADDING, '0')
    );
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
