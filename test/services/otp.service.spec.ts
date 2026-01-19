import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { PrismaService } from '../../common/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('OtpService', () => {
  let service: OtpService;
  let prisma: PrismaService;
  let config: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: PrismaService,
          useValue: {
            otpCode: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              deleteMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-salt'),
          },
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    prisma = module.get<PrismaService>(PrismaService);
    config = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateOtp', () => {
    it('should generate and store OTP', async () => {
      const phone = '+1234567890';
      const purpose = OtpPurpose.CUSTOMER_LOGIN;

      jest.spyOn(prisma.otpCode, 'upsert').mockResolvedValue({} as any);

      const result = await service.generateOtp(phone, purpose);

      expect(result).toHaveLength(6);
      expect(prisma.otpCode.upsert).toHaveBeenCalledWith({
        where: {
          phone_purpose: { phone, purpose },
        },
        update: expect.any(Object),
        create: expect.any(Object),
      });
    });
  });

  describe('verifyOtp', () => {
    it('should verify valid OTP', async () => {
      const phone = '+1234567890';
      const code = '123456';
      const purpose = OtpPurpose.CUSTOMER_LOGIN;

      const mockOtpRecord = {
        code: service['hashCode'](code),
        isUsed: false,
        expiresAt: new Date(Date.now() + 10000),
        attempts: 0,
      };

      jest
        .spyOn(prisma.otpCode, 'findUnique')
        .mockResolvedValue(mockOtpRecord as any);
      jest.spyOn(prisma.otpCode, 'update').mockResolvedValue({} as any);

      const result = await service.verifyOtp({ phone, code, purpose });

      expect(result).toBe(true);
    });

    // Validation is now handled at DTO level, so these tests are removed.

    it('should throw UnauthorizedException for non-existent OTP', async () => {
      const phone = '+1234567890';
      const code = '123456';
      const purpose = OtpPurpose.CUSTOMER_LOGIN;

      jest.spyOn(prisma.otpCode, 'findUnique').mockResolvedValue(null);

      await expect(service.verifyOtp({ phone, code, purpose })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('cleanupExpiredOtps', () => {
    it('should delete expired OTPs', async () => {
      jest
        .spyOn(prisma.otpCode, 'deleteMany')
        .mockResolvedValue({ count: 5 } as any);

      const result = await service.cleanupExpiredOtps();

      expect(result).toBe(5);
    });
  });

  describe('getOtpStats', () => {
    it('should return OTP statistics', async () => {
      jest
        .spyOn(prisma.otpCode, 'count')
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3);

      const result = await service.getOtpStats();

      expect(result).toEqual({
        total: 10,
        active: 5,
        expired: 2,
        used: 3,
      });
    });
  });
});
