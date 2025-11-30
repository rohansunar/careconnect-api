import { Test, TestingModule } from '@nestjs/testing';
import { VendorAuthService } from '../../src/vendor/services/vendor-auth.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { OtpService } from '../../src/otp/services/otp.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { VerifyOtpDto, VerifyOtpResponseDto } from '../../src/auth/dtos/verify-otp.dto';
import { OtpResponseDto } from '../../src/auth/dtos/request-otp.dto';

describe('VendorAuthService', () => {
  let service: VendorAuthService;
  let mockPrismaService: any;
  let mockOtpService: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockPrismaService = {
      vendor: {
        upsert: jest.fn(),
      },
    };

    mockOtpService = {
      generateOtp: jest.fn(),
      verifyOtp: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorAuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OtpService,
          useValue: mockOtpService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<VendorAuthService>(VendorAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestOtp', () => {
    it('should request OTP successfully and return response', async () => {
      const phone = '+1234567890';
      const expectedResponse: OtpResponseDto = {
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 30,
      };

      mockOtpService.generateOtp.mockResolvedValue('123456');

      const result = await service.requestOtp(phone);

      expect(result).toEqual(expectedResponse);
      expect(mockOtpService.generateOtp).toHaveBeenCalledWith(phone, OtpPurpose.VENDOR_LOGIN);
      expect(mockOtpService.generateOtp).toHaveBeenCalledTimes(1);
    });

    it('should handle OTP generation failure', async () => {
      const phone = '+1234567890';
      const error = new Error('SMS service unavailable');

      mockOtpService.generateOtp.mockRejectedValue(error);

      await expect(service.requestOtp(phone)).rejects.toThrow(error);
      expect(mockOtpService.generateOtp).toHaveBeenCalledWith(phone, OtpPurpose.VENDOR_LOGIN);
    });
  });

  describe('verifyOtpAndCreateVendor', () => {
    const dto: VerifyOtpDto = {
      phone: '+1234567890',
      code: '123456',
    };

    const mockVendor = {
      id: 1,
      phone: '+1234567890',
      name: '',
      is_active: true,
    };

    it('should verify OTP, create/update vendor, and return JWT token successfully', async () => {
      const token = 'jwt-token';
      const expectedResponse: VerifyOtpResponseDto = {
        token,
        vendor: mockVendor,
        expiresIn: 36000,
      };

      mockOtpService.verifyOtp.mockResolvedValue(true);
      mockPrismaService.vendor.upsert.mockResolvedValue(mockVendor);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.verifyOtpAndCreateVendor(dto);

      expect(result).toEqual(expectedResponse);
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(dto.phone, dto.code, OtpPurpose.VENDOR_LOGIN);
      expect(mockPrismaService.vendor.upsert).toHaveBeenCalledWith({
        where: { phone: dto.phone },
        update: {
          updated_at: expect.any(Date),
        },
        create: {
          phone: dto.phone,
          name: '',
          is_active: true,
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockVendor.id.toString(),
        phone: mockVendor.phone,
        role: 'vendor',
        businessName: mockVendor.name,
      });
    });

    it('should throw UnauthorizedException if OTP verification fails', async () => {
      const error = new UnauthorizedException('Invalid OTP');

      mockOtpService.verifyOtp.mockRejectedValue(error);

      await expect(service.verifyOtpAndCreateVendor(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(dto.phone, dto.code, OtpPurpose.VENDOR_LOGIN);
      expect(mockPrismaService.vendor.upsert).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw error if vendor upsert fails', async () => {
      const error = new Error('Database connection failed');

      mockOtpService.verifyOtp.mockResolvedValue(true);
      mockPrismaService.vendor.upsert.mockRejectedValue(error);

      await expect(service.verifyOtpAndCreateVendor(dto)).rejects.toThrow(error);
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(dto.phone, dto.code, OtpPurpose.VENDOR_LOGIN);
      expect(mockPrismaService.vendor.upsert).toHaveBeenCalledWith({
        where: { phone: dto.phone },
        update: {
          updated_at: expect.any(Date),
        },
        create: {
          phone: dto.phone,
          name: '',
          is_active: true,
        },
      });
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should handle JWT signing failure', async () => {
      const error = new Error('JWT signing failed');

      mockOtpService.verifyOtp.mockResolvedValue(true);
      mockPrismaService.vendor.upsert.mockResolvedValue(mockVendor);
      mockJwtService.sign.mockImplementation(() => {
        throw error;
      });

      await expect(service.verifyOtpAndCreateVendor(dto)).rejects.toThrow(error);
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(dto.phone, dto.code, OtpPurpose.VENDOR_LOGIN);
      expect(mockPrismaService.vendor.upsert).toHaveBeenCalledWith({
        where: { phone: dto.phone },
        update: {
          updated_at: expect.any(Date),
        },
        create: {
          phone: dto.phone,
          name: '',
          is_active: true,
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockVendor.id.toString(),
        phone: mockVendor.phone,
        role: 'vendor',
        businessName: mockVendor.name,
      });
    });

    it('should create new vendor if not exists', async () => {
      const newVendor = {
        id: 2,
        phone: '+0987654321',
        name: '',
        is_active: true,
      };
      const newDto: VerifyOtpDto = {
        phone: '+0987654321',
        code: '654321',
      };
      const token = 'new-jwt-token';

      mockOtpService.verifyOtp.mockResolvedValue(true);
      mockPrismaService.vendor.upsert.mockResolvedValue(newVendor);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.verifyOtpAndCreateVendor(newDto);

      expect(result.vendor).toEqual(newVendor);
      expect(mockPrismaService.vendor.upsert).toHaveBeenCalledWith({
        where: { phone: newDto.phone },
        update: {
          updated_at: expect.any(Date),
        },
        create: {
          phone: newDto.phone,
          name: '',
          is_active: true,
        },
      });
    });
  });
});