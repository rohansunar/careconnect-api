import { Test, TestingModule } from '@nestjs/testing';
import { CustomerAuthService } from '../../src/auth/services/customer-auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../src/common/database/prisma.service';
import { OtpService } from '../../src/otp/services/otp.service';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';

describe('CustomerAuthService', () => {
  let service: CustomerAuthService;
  let jwtService: JwtService;
  let prisma: PrismaService;
  let otpService: OtpService;
  let config: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerAuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            customer: {
              upsert: jest.fn(),
            },
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

    service = module.get<CustomerAuthService>(CustomerAuthService);
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

      expect(otpService.generateOtp).toHaveBeenCalledWith(phone, OtpPurpose.CUSTOMER_LOGIN);
      expect(result).toEqual({
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 30,
      });
    });
  });

  describe('verifyOtpAndCreateCustomer', () => {
    it('should verify OTP and create customer', async () => {
      const dto = { phone: '+1234567890', code: '123456' };
      const mockCustomer = { id: 1, phone: dto.phone, name: '', updated_at: new Date() };

      jest.spyOn(prisma.customer, 'upsert').mockResolvedValue(mockCustomer as any);

      const result = await service.verifyOtpAndCreateCustomer(dto);

      expect(otpService.verifyOtp).toHaveBeenCalledWith({ phone: dto.phone, code: dto.code, purpose: OtpPurpose.CUSTOMER_LOGIN });
      expect(prisma.customer.upsert).toHaveBeenCalledWith({
        where: { phone: dto.phone },
        update: { updated_at: expect.any(Date) },
        create: { phone: dto.phone, name: '' },
      });
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('token');
      expect(result.data).toEqual(mockCustomer);
    });
  });
});