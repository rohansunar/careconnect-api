import { Test, TestingModule } from '@nestjs/testing';
import { CustomerAuthService } from '../../src/auth/services/customer-auth.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { OtpService } from '../../src/otp/services/otp.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import {
  VerifyOtpDto,
  VerifyOtpResponseDto,
} from '../../src/auth/dtos/verify-otp.dto';
import { OtpResponseDto } from '../../src/auth/dtos/request-otp.dto';

/**
 * Comprehensive unit tests for CustomerAuthService.
 *
 * Rationale for comprehensive testing:
 * - Ensures reliability: By mocking dependencies (PrismaService, OtpService, JwtService), we isolate the service logic and verify correct interactions without external dependencies.
 * - Covers key methods: Tests for requestOtp (OTP initiation) and verifyOtpAndCreateCustomer (OTP verification and customer creation) ensure all critical paths are validated.
 * - Error handling scenarios: Includes tests for invalid OTP, database failures, and JWT signing errors to guarantee robust error handling and prevent runtime issues.
 * - Maintainability: Detailed assertions on method calls and return values make it easy to identify regressions during future code changes, promoting long-term code health.
 * - Successful and failed cases: Balances positive and negative test cases to confirm expected behavior under various conditions, enhancing confidence in the authentication flow.
 */

describe('CustomerAuthService', () => {
  let service: CustomerAuthService;
  let mockPrismaService: any;
  let mockOtpService: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockPrismaService = {
      customer: {
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
        CustomerAuthService,
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

    service = module.get<CustomerAuthService>(CustomerAuthService);
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
      expect(mockOtpService.generateOtp).toHaveBeenCalledWith(
        phone,
        OtpPurpose.CUSTOMER_LOGIN,
      );
      expect(mockOtpService.generateOtp).toHaveBeenCalledTimes(1);
    });

    it('should handle OTP generation failure', async () => {
      const phone = '+1234567890';
      const error = new Error('SMS service unavailable');

      mockOtpService.generateOtp.mockRejectedValue(error);

      await expect(service.requestOtp(phone)).rejects.toThrow(error);
      expect(mockOtpService.generateOtp).toHaveBeenCalledWith(
        phone,
        OtpPurpose.CUSTOMER_LOGIN,
      );
    });
  });

  describe('verifyOtpAndCreateCustomer', () => {
    const dto: VerifyOtpDto = {
      phone: '+1234567890',
      code: '123456',
    };

    const mockCustomer = {
      id: 1,
      phone: '+1234567890',
      name: '',
    };

    it('should verify OTP, create/update customer, and return JWT token successfully', async () => {
      const token = 'jwt-token';
      const expectedResponse: VerifyOtpResponseDto = {
        token,
        vendor: mockCustomer,
        expiresIn: 36000,
      };

      mockOtpService.verifyOtp.mockResolvedValue(true);
      mockPrismaService.customer.upsert.mockResolvedValue(mockCustomer);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.verifyOtpAndCreateCustomer(dto);

      expect(result).toEqual(expectedResponse);
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(
        dto.phone,
        dto.code,
        OtpPurpose.CUSTOMER_LOGIN,
      );
      expect(mockPrismaService.customer.upsert).toHaveBeenCalledWith({
        where: { phone: dto.phone },
        update: {
          updated_at: expect.any(Date),
        },
        create: {
          phone: dto.phone,
          name: '',
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockCustomer.id.toString(),
        phone: mockCustomer.phone,
        role: 'customer',
        name: mockCustomer.name,
      });
    });

    it('should throw UnauthorizedException if OTP verification fails', async () => {
      const error = new UnauthorizedException('Invalid OTP');

      mockOtpService.verifyOtp.mockRejectedValue(error);

      await expect(service.verifyOtpAndCreateCustomer(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(
        dto.phone,
        dto.code,
        OtpPurpose.CUSTOMER_LOGIN,
      );
      expect(mockPrismaService.customer.upsert).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw error if customer upsert fails', async () => {
      const error = new Error('Database connection failed');

      mockOtpService.verifyOtp.mockResolvedValue(true);
      mockPrismaService.customer.upsert.mockRejectedValue(error);

      await expect(service.verifyOtpAndCreateCustomer(dto)).rejects.toThrow(
        error,
      );
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(
        dto.phone,
        dto.code,
        OtpPurpose.CUSTOMER_LOGIN,
      );
      expect(mockPrismaService.customer.upsert).toHaveBeenCalledWith({
        where: { phone: dto.phone },
        update: {
          updated_at: expect.any(Date),
        },
        create: {
          phone: dto.phone,
          name: '',
        },
      });
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should handle JWT signing failure', async () => {
      const error = new Error('JWT signing failed');

      mockOtpService.verifyOtp.mockResolvedValue(true);
      mockPrismaService.customer.upsert.mockResolvedValue(mockCustomer);
      mockJwtService.sign.mockImplementation(() => {
        throw error;
      });

      await expect(service.verifyOtpAndCreateCustomer(dto)).rejects.toThrow(
        error,
      );
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(
        dto.phone,
        dto.code,
        OtpPurpose.CUSTOMER_LOGIN,
      );
      expect(mockPrismaService.customer.upsert).toHaveBeenCalledWith({
        where: { phone: dto.phone },
        update: {
          updated_at: expect.any(Date),
        },
        create: {
          phone: dto.phone,
          name: '',
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockCustomer.id.toString(),
        phone: mockCustomer.phone,
        role: 'customer',
        name: mockCustomer.name,
      });
    });

    it('should create new customer if not exists', async () => {
      const newCustomer = {
        id: 2,
        phone: '+0987654321',
        name: '',
      };
      const newDto: VerifyOtpDto = {
        phone: '+0987654321',
        code: '654321',
      };
      const token = 'new-jwt-token';

      mockOtpService.verifyOtp.mockResolvedValue(true);
      mockPrismaService.customer.upsert.mockResolvedValue(newCustomer);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.verifyOtpAndCreateCustomer(newDto);

      expect(result.vendor).toEqual(newCustomer);
      expect(mockPrismaService.customer.upsert).toHaveBeenCalledWith({
        where: { phone: newDto.phone },
        update: {
          updated_at: expect.any(Date),
        },
        create: {
          phone: newDto.phone,
          name: '',
        },
      });
    });
  });
});
