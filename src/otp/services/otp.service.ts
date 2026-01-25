import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import { OtpPurpose } from '@prisma/client';
import { createHash } from 'crypto';
import { OtpVerificationDto } from '../dto/otp-verification.dto';

@Injectable()
export class OtpService {
  private readonly salt: string;
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.salt =
      this.config.get<string>('OTP_SALT') ||
      'default-salt-change-in-production';
  }

  async generateOtp(phone: string, purpose: OtpPurpose): Promise<string> {
    // const code = this.generateRandomCode();
    const code = '123456';
    const hashedCode = this.hashCode(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.prisma.otpCode.upsert({
      where: {
        phone_purpose: {
          phone,
          purpose,
        },
      },
      update: {
        code: hashedCode,
        expiresAt,
        attempts: 0,
        isUsed: false,
        createdAt: new Date(),
        usedAt: null,
      },
      create: {
        phone,
        code: hashedCode,
        purpose,
        expiresAt,
      },
    });

    this.logger.log(
      `Your OTP code is ${code} for ${phone} and Purpose ${purpose}`,
    );

    return code; // Return plain code for sending via SMS/email
  }

  async verifyOtp(dto: OtpVerificationDto): Promise<boolean> {
    try {
      const otpRecord = await this.prisma.otpCode.findUnique({
        where: {
          phone_purpose: {
            phone: dto.phone,
            purpose: dto.purpose,
          },
        },
      });

      if (!otpRecord) {
        throw new UnauthorizedException('OTP not found');
      }

      if (otpRecord.isUsed) {
        throw new UnauthorizedException('OTP already used');
      }

      if (otpRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('OTP expired');
      }

      if (otpRecord.attempts >= 3) {
        throw new UnauthorizedException('Too many attempts');
      }

      const hashedCode = this.hashCode(dto.code);
      if (otpRecord.code !== hashedCode) {
        await this.prisma.otpCode.update({
          where: {
            phone_purpose: {
              phone: dto.phone,
              purpose: dto.purpose,
            },
          },
          data: {
            attempts: otpRecord.attempts + 1,
          },
        });
        throw new UnauthorizedException('Invalid OTP');
      }

      await this.prisma.otpCode.update({
        where: {
          phone_purpose: {
            phone: dto.phone,
            purpose: dto.purpose,
          },
        },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      // Log the error with contextual details
      this.logger.error(
        `OTP verification failed for phone: ${dto.phone}, purpose: ${dto.purpose}`,
        error.stack,
      );

      // Re-throw the error
      throw error;
    }
  }

  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.prisma.otpCode.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isUsed: true }],
      },
    });
    return result.count;
  }

  async getOtpStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    used: number;
  }> {
    const [total, active, expired, used] = await Promise.all([
      this.prisma.otpCode.count(),
      this.prisma.otpCode.count({
        where: {
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.otpCode.count({
        where: {
          expiresAt: { lt: new Date() },
          isUsed: false,
        },
      }),
      this.prisma.otpCode.count({
        where: {
          isUsed: true,
        },
      }),
    ]);

    return { total, active, expired, used };
  }

  private generateRandomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashCode(code: string): string {
    return createHash('sha256')
      .update(code + this.salt)
      .digest('hex');
  }
}
