import { Test, TestingModule } from '@nestjs/testing';
import { CustomerAuthController } from '../src/auth/controllers/customer-auth.controller';
import { CustomerAuthService } from '../src/auth/services/customer-auth.service';
import {
  RequestOtpDto,
  OtpResponseDto,
} from '../src/auth/dtos/request-otp.dto';
import {
  VerifyOtpDto,
  VerifyOtpResponseDto,
} from '../src/auth/dtos/verify-otp.dto';
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Unit tests for CustomerAuthController.
 *
 * Rationale for controller testing:
 * - Ensures API reliability: Unit tests validate that controller methods correctly handle requests, delegate to services, and return appropriate responses, ensuring the API behaves as specified.
 * - Isolates controller logic: By mocking the CustomerAuthService, we test the controller's responsibility of routing and response handling without external dependencies.
 * - Covers critical endpoints: Tests for requestOtp and verifyOtp endpoints verify successful responses, error handling (e.g., bad request for invalid inputs, unauthorized for authentication failures), and proper service method invocations.
 * - Validates HTTP status codes implicitly: Error scenarios test that appropriate exceptions (e.g., BadRequestException for 400, UnauthorizedException for 401) are thrown, which map to correct HTTP status codes in the framework.
 * - Maintains code quality: Comprehensive tests with comments promote maintainability, allowing future changes to be validated against expected behavior, adhering to clean code and SOLID principles.
 */

describe('CustomerAuthController', () => {
  let controller: CustomerAuthController;
  let mockCustomerAuthService: jest.Mocked<CustomerAuthService>;

  beforeEach(async () => {
    const mockService = {
      requestOtp: jest.fn(),
      verifyOtpAndCreateCustomer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerAuthController],
      providers: [
        {
          provide: CustomerAuthService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CustomerAuthController>(CustomerAuthController);
    mockCustomerAuthService = module.get(CustomerAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestOtp', () => {
    const dto: RequestOtpDto = { phone: '+1234567890' };

    it('should request OTP successfully and return response', async () => {
      // Rationale: Tests the happy path for OTP request, ensuring the controller delegates to the service and returns the expected response structure.
      const expectedResponse: OtpResponseDto = {
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 30,
      };

      mockCustomerAuthService.requestOtp.mockResolvedValue(expectedResponse);

      const result = await controller.requestOtp(dto);

      expect(result).toEqual(expectedResponse);
      expect(mockCustomerAuthService.requestOtp).toHaveBeenCalledWith(
        dto.phone,
      );
      expect(mockCustomerAuthService.requestOtp).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid phone number or rate limit exceeded', async () => {
      // Rationale: Validates error handling for bad requests, such as invalid phone formats or rate limiting, ensuring the controller propagates service exceptions correctly.
      const error = new BadRequestException(
        'Too many OTP requests. Please try again later.',
      );

      mockCustomerAuthService.requestOtp.mockRejectedValue(error);

      await expect(controller.requestOtp(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCustomerAuthService.requestOtp).toHaveBeenCalledWith(
        dto.phone,
      );
    });

    it('should throw UnauthorizedException if customer not found', async () => {
      // Rationale: Ensures authentication failures, like non-existent customers, are handled with appropriate unauthorized responses.
      const error = new UnauthorizedException('Customer not found');

      mockCustomerAuthService.requestOtp.mockRejectedValue(error);

      await expect(controller.requestOtp(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockCustomerAuthService.requestOtp).toHaveBeenCalledWith(
        dto.phone,
      );
    });

    it('should throw ForbiddenException if account is inactive', async () => {
      // Rationale: Tests access control for inactive accounts, preventing unauthorized actions and maintaining security.
      const error = new ForbiddenException('Account is inactive');

      mockCustomerAuthService.requestOtp.mockRejectedValue(error);

      await expect(controller.requestOtp(dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockCustomerAuthService.requestOtp).toHaveBeenCalledWith(
        dto.phone,
      );
    });
  });

  describe('verifyOtp', () => {
    const dto: VerifyOtpDto = { phone: '+1234567890', code: '123456' };
    const mockCustomer = { id: 1, phone: '+1234567890', name: '' };

    it('should verify OTP successfully and return authentication response', async () => {
      // Rationale: Confirms successful OTP verification, customer creation/update, and token generation, validating the complete authentication flow.
      const expectedResponse: VerifyOtpResponseDto = {
        token: 'jwt-token',
        vendor: mockCustomer,
        expiresIn: 36000,
      };

      mockCustomerAuthService.verifyOtpAndCreateCustomer.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.verifyOtp(dto);

      expect(result).toEqual(expectedResponse);
      expect(
        mockCustomerAuthService.verifyOtpAndCreateCustomer,
      ).toHaveBeenCalledWith(dto);
      expect(
        mockCustomerAuthService.verifyOtpAndCreateCustomer,
      ).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid OTP format', async () => {
      // Rationale: Ensures input validation for OTP codes, rejecting malformed requests to maintain data integrity.
      const error = new BadRequestException('OTP must be exactly 6 digits');

      mockCustomerAuthService.verifyOtpAndCreateCustomer.mockRejectedValue(
        error,
      );

      await expect(controller.verifyOtp(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(
        mockCustomerAuthService.verifyOtpAndCreateCustomer,
      ).toHaveBeenCalledWith(dto);
    });

    it('should throw UnauthorizedException for invalid OTP or customer not found', async () => {
      // Rationale: Protects against invalid authentication attempts, ensuring only verified users can access the system.
      const error = new UnauthorizedException('Invalid OTP');

      mockCustomerAuthService.verifyOtpAndCreateCustomer.mockRejectedValue(
        error,
      );

      await expect(controller.verifyOtp(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(
        mockCustomerAuthService.verifyOtpAndCreateCustomer,
      ).toHaveBeenCalledWith(dto);
    });
  });
});
