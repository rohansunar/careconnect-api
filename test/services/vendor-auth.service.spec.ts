import { Test, TestingModule } from '@nestjs/testing';
import { VendorAuthService } from '../../src/auth/services/vendor-auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../src/common/database/prisma.service';
import { OtpService } from '../../src/otp/services/otp.service';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';

describe('VendorAuthService', () => {
  let service: VendorAuthService;
  let jwtService: JwtService;
  let prisma: PrismaService;
  let otpService: OtpService;
  let config: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorAuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            vendor: {
              findUnique: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
            counter: {
              upsert: jest.fn().mockResolvedValue({ lastNumber: 1 }),
            },
            $transaction: jest
              .fn()
              .mockImplementation((callback) => callback(prisma)),
          },
        },
        {
          provide: OtpService,
          useValue: {
            generateOtp: jest.fn().mockResolvedValue('123456'),
            verifyOtp: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<VendorAuthService>(VendorAuthService);
    jwtService = module.get<JwtService>(JwtService);
    prisma = module.get<PrismaService>(PrismaService);
    otpService = module.get<OtpService>(OtpService);
    config = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestOtp', () => {
    it('should request OTP and return response', async () => {
      const phone = '+1234567890';

      const result = await service.requestOtp(phone);

      expect(otpService.generateOtp).toHaveBeenCalledWith(
        phone,
        OtpPurpose.VENDOR_LOGIN,
      );
      expect(result).toEqual({
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 30,
      });
    });
  });

  describe('verifyOtpAndCreateVendor', () => {
    it('should verify OTP and create vendor', async () => {
      const dto = { phone: '+1234567890', code: '123456' };
      const mockVendor = {
        id: 1,
        phone: dto.phone,
        name: '',
        vendorNo: 'V000001',
        is_active: true,
      };

      jest.spyOn(prisma.vendor, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.vendor, 'create').mockResolvedValue(mockVendor as any);

      const result = await service.verifyOtpAndCreateVendor(dto);

      expect(otpService.verifyOtp).toHaveBeenCalledWith({
        phone: dto.phone,
        code: dto.code,
        purpose: OtpPurpose.VENDOR_LOGIN,
      });
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('token');
      expect(result.data).toEqual(mockVendor);
    });
  });
});
