import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from '../../src/otp/services/otp.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import { UnauthorizedException } from '@nestjs/common';

describe('OtpService', () => {
  let service: OtpService;
  let mockPrismaService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockPrismaService = {
      otpCode: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('test-salt'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    mockConfigService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOtp', () => {
    it('should generate OTP successfully', async () => {
      process.env.NODE_ENV = 'development';
      const phone = '1234567890';
      const purpose = OtpPurpose.VENDOR_LOGIN;
      const mockUpsert = mockPrismaService.otpCode.upsert;

      mockUpsert.mockResolvedValue({
        phone,
        purpose,
        code: '26c2a4d5615d61d26ff7a5a0246fe4a32344a1c7f070fc39994ab28ea269deee',
        expiresAt: new Date(),
        attempts: 0,
        isUsed: false,
        createdAt: new Date(),
        usedAt: null,
      });

      const result = await service.generateOtp(phone, purpose);

      expect(result).toBe('123456'); // Development mode
      expect(mockUpsert).toHaveBeenCalledWith({
        where: {
          phone_purpose: {
            phone,
            purpose,
          },
        },
        update: expect.objectContaining({
          code: expect.any(String),
          expiresAt: expect.any(Date),
          attempts: 0,
          isUsed: false,
          createdAt: expect.any(Date),
          usedAt: null,
        }),
        create: expect.objectContaining({
          phone,
          code: expect.any(String),
          purpose,
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should return fixed OTP in development mode', async () => {
      process.env.NODE_ENV = 'development';
      const phone = '1234567890';
      const purpose = OtpPurpose.VENDOR_REGISTRATION;

      mockPrismaService.otpCode.upsert.mockResolvedValue({
        phone,
        purpose,
        code: 'hashed-123456',
        expiresAt: new Date(),
        attempts: 0,
        isUsed: false,
        createdAt: new Date(),
        usedAt: null,
      });

      const result = await service.generateOtp(phone, purpose);

      expect(result).toBe('123456');
      delete process.env.NODE_ENV;
    });

    it('should generate random OTP in production mode', async () => {
      process.env.NODE_ENV = 'production';
      const phone = '1234567890';
      const purpose = OtpPurpose.VENDOR_REGISTRATION;

      mockPrismaService.otpCode.upsert.mockResolvedValue({
        phone,
        purpose,
        code: 'hashed-random',
        expiresAt: new Date(),
        attempts: 0,
        isUsed: false,
        createdAt: new Date(),
        usedAt: null,
      });

      const result = await service.generateOtp(phone, purpose);

      expect(result).toMatch(/^\d{6}$/);
      expect(result).not.toBe('123456');
      delete process.env.NODE_ENV;
    });

    it('should hash the OTP code', async () => {
      const phone = '1234567890';
      const purpose = OtpPurpose.VENDOR_LOGIN;

      process.env.NODE_ENV = 'development';
      mockPrismaService.otpCode.upsert.mockResolvedValue({
        phone,
        purpose,
        code: '26c2a4d5615d61d26ff7a5a0246fe4a32344a1c7f070fc39994ab28ea269deee',
        expiresAt: new Date(),
        attempts: 0,
        isUsed: false,
        createdAt: new Date(),
        usedAt: null,
      });

      await service.generateOtp(phone, purpose);

      const upsertCall = mockPrismaService.otpCode.upsert.mock.calls[0][0];
      expect(upsertCall.update.code).toBe(
        '26c2a4d5615d61d26ff7a5a0246fe4a32344a1c7f070fc39994ab28ea269deee',
      );
      expect(upsertCall.create.code).toBe(
        '26c2a4d5615d61d26ff7a5a0246fe4a32344a1c7f070fc39994ab28ea269deee',
      );
      delete process.env.NODE_ENV;
    });

    it('should upsert OTP record in database', async () => {
      const phone = '1234567890';
      const purpose = OtpPurpose.VENDOR_LOGIN;

      await service.generateOtp(phone, purpose);

      expect(mockPrismaService.otpCode.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully', async () => {
      const phone = '1234567890';
      const code = '123456';
      const purpose = OtpPurpose.VENDOR_LOGIN;
      const hashedCode =
        '26c2a4d5615d61d26ff7a5a0246fe4a32344a1c7f070fc39994ab28ea269deee';

      mockPrismaService.otpCode.findUnique.mockResolvedValue({
        phone,
        purpose,
        code: hashedCode,
        expiresAt: new Date(Date.now() + 10000), // Future
        attempts: 0,
        isUsed: false,
        createdAt: new Date(),
        usedAt: null,
      });

      const result = await service.verifyOtp(phone, code, purpose);

      expect(result).toBe(true);
      expect(mockPrismaService.otpCode.update).toHaveBeenCalledWith({
        where: {
          phone_purpose: {
            phone,
            purpose,
          },
        },
        data: {
          isUsed: true,
          usedAt: expect.any(Date),
        },
      });
    });

    it('should throw UnauthorizedException for invalid OTP', async () => {
      const phone = '1234567890';
      const code = '123456';
      const purpose = OtpPurpose.VENDOR_REGISTRATION;

      mockPrismaService.otpCode.findUnique.mockResolvedValue({
        phone,
        purpose,
        code: 'different-hash',
        expiresAt: new Date(Date.now() + 10000),
        attempts: 0,
        isUsed: false,
        createdAt: new Date(),
        usedAt: null,
      });

      await expect(service.verifyOtp(phone, code, purpose)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrismaService.otpCode.update).toHaveBeenCalledWith({
        where: {
          phone_purpose: {
            phone,
            purpose,
          },
        },
        data: {
          attempts: 1,
        },
      });
    });

    it('should throw UnauthorizedException for expired OTP', async () => {
      const phone = '1234567890';
      const code = '123456';
      const purpose = OtpPurpose.VENDOR_REGISTRATION;

      mockPrismaService.otpCode.findUnique.mockResolvedValue({
        phone,
        purpose,
        code: 'hashed-123456',
        expiresAt: new Date(Date.now() - 10000), // Past
        attempts: 0,
        isUsed: false,
        createdAt: new Date(),
        usedAt: null,
      });

      await expect(service.verifyOtp(phone, code, purpose)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrismaService.otpCode.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for used OTP', async () => {
      const phone = '1234567890';
      const code = '123456';
      const purpose = OtpPurpose.VENDOR_REGISTRATION;

      mockPrismaService.otpCode.findUnique.mockResolvedValue({
        phone,
        purpose,
        code: 'hashed-123456',
        expiresAt: new Date(Date.now() + 10000),
        attempts: 0,
        isUsed: true,
        createdAt: new Date(),
        usedAt: new Date(),
      });

      await expect(service.verifyOtp(phone, code, purpose)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrismaService.otpCode.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for too many attempts', async () => {
      const phone = '1234567890';
      const code = '123456';
      const purpose = OtpPurpose.VENDOR_REGISTRATION;

      mockPrismaService.otpCode.findUnique.mockResolvedValue({
        phone,
        purpose,
        code: 'hashed-123456',
        expiresAt: new Date(Date.now() + 10000),
        attempts: 3,
        isUsed: false,
        createdAt: new Date(),
        usedAt: null,
      });

      await expect(service.verifyOtp(phone, code, purpose)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrismaService.otpCode.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if OTP not found', async () => {
      const phone = '1234567890';
      const code = '123456';
      const purpose = OtpPurpose.VENDOR_REGISTRATION;

      mockPrismaService.otpCode.findUnique.mockResolvedValue(null);

      await expect(service.verifyOtp(phone, code, purpose)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('cleanupExpiredOtps', () => {
    it('should remove expired and used OTP records', async () => {
      mockPrismaService.otpCode.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.cleanupExpiredOtps();

      expect(result).toBe(5);
      expect(mockPrismaService.otpCode.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [{ expiresAt: { lt: expect.any(Date) } }, { isUsed: true }],
        },
      });
    });
  });

  describe('getOtpStats', () => {
    it('should return correct OTP statistics', async () => {
      mockPrismaService.otpCode.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // active
        .mockResolvedValueOnce(2) // expired
        .mockResolvedValueOnce(3); // used

      const result = await service.getOtpStats();

      expect(result).toEqual({
        total: 10,
        active: 5,
        expired: 2,
        used: 3,
      });

      expect(mockPrismaService.otpCode.count).toHaveBeenCalledTimes(4);
    });
  });
});
