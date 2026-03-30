import {
  Injectable,
  BadRequestException,
  Logger,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { OtpService } from '../../otp/services/otp.service';
import { OtpPurpose } from '@prisma/client';
import { VerifyOtpDto, VerifyOtpResponseDto } from '../dtos/verify-otp.dto';
import { OtpResponseDto } from '../dtos/request-otp.dto';
import { JwtTokenService } from './jwt-token.service';

/**
 * UserAuthService handles authentication for users using OTP-based login.
 */
@Injectable()
export class UserAuthService {
  private readonly logger = new Logger(UserAuthService.name);

  private readonly USER_JWT_EXPIRES_IN = 36000;

  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Requests an OTP for user login authentication.
   * @param phone - The phone number to send the OTP to.
   * @returns A response indicating success and OTP expiration time.
   */
  async requestOtp(phone: string): Promise<OtpResponseDto> {
    this.logger.log(
      `OTP request initiated for phone: ${phone}, purpose: ${OtpPurpose.CUSTOMER_LOGIN}`,
    );
    await this.otpService.generateOtp(phone, OtpPurpose.CUSTOMER_LOGIN);
    this.logger.log(
      `OTP generated and sent to ${phone} for ${OtpPurpose.CUSTOMER_LOGIN}`,
    );
    return { success: true, message: 'OTP sent successfully', expiresIn: 30 };
  }

  /**
   * Verifies the OTP and creates or updates the user record, then generates a JWT token.
   * @param dto - The data transfer object containing phone and OTP code.
   * @returns A response with the JWT token, user details, and expiration time.
   */
  async verifyOtpAndCreateUser(
    dto: VerifyOtpDto,
  ): Promise<VerifyOtpResponseDto> {
    try {
      const { phone, code } = dto;

      this.logger.log(
        `OTP verification initiated for phone: ${phone}, purpose: ${OtpPurpose.CUSTOMER_LOGIN}`,
      );

      await this.otpService.verifyOtp({
        phone,
        code,
        purpose: OtpPurpose.CUSTOMER_LOGIN,
      });

      const user = await this.prisma.customer.upsert({
        where: { phone },
        update: {
          updated_at: new Date(),
        },
        create: {
          phone,
          name: ``,
        },
      });

      const existingWallet = await this.prisma.customerWallet.findUnique({
        where: { customerId: user.id },
      });

      if (!existingWallet) {
        await this.prisma.customerWallet.create({
          data: {
            customerId: user.id,
            balance: 0,
          },
        });
        this.logger.log(`Wallet created for user: ${user.id}`);
      }

      const payload = {
        sub: user.id.toString(),
        phone: user.phone,
        name: user.name,
      };

      const token = this.jwtTokenService.generateToken(payload, 'customer');

      return {
        token,
        data: user,
        expiresIn: this.USER_JWT_EXPIRES_IN,
      };
    } catch (error) {
      this.logger.error('Error in verifyOtpAndCreateUser:', error);

      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to verify OTP and create user. Please try again.',
      );
    }
  }
}
