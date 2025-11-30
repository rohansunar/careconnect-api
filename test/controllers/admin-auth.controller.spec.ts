import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  AdminAuthController,
  AdminLoginDto,
} from '../../src/auth/controllers/admin-auth.controller';
import { AdminAuthService } from '../../src/auth/services/admin-auth.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

/**
 * Unit tests for AdminAuthController.
 *
 * Rationale for controller testing:
 * - Ensures API reliability: Unit tests validate that controller methods correctly handle HTTP requests, delegate to services, and return appropriate responses, ensuring the API behaves as specified.
 * - Isolates controller logic: By mocking the AdminAuthService, we test the controller's responsibility of routing and response handling without external dependencies.
 * - Covers critical endpoints: Tests for the login endpoint verify successful authentication, error handling (e.g., bad request for invalid credentials, unauthorized for authentication failures), and proper service method invocations.
 * - Validates HTTP status codes: Error scenarios test that appropriate exceptions (e.g., BadRequestException for 400, UnauthorizedException for 401) are thrown, which map to correct HTTP status codes in the framework.
 * - Maintains code quality: Comprehensive tests with comments promote maintainability, allowing future changes to be validated against expected behavior, adhering to clean code and SOLID principles.
 */

describe('AdminAuthController', () => {
  let app: INestApplication;
  let mockAdminAuthService: jest.Mocked<AdminAuthService>;

  beforeEach(async () => {
    const mockService = {
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        {
          provide: AdminAuthService,
          useValue: mockService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    mockAdminAuthService = module.get(AdminAuthService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /auth/admin/login', () => {
    it('should login successfully and return token', async () => {
      // Rationale: Tests the happy path for admin login, ensuring the controller delegates to the service and returns the expected response structure with JWT token.
      const dto: AdminLoginDto = {
        email: 'admin@example.com',
        password: 'securepassword123',
      };
      const expectedResponse = {
        token: 'jwt-token',
        admin: { id: 'admin-uuid', email: 'admin@example.com' },
        expiresIn: 36000,
      };

      mockAdminAuthService.login.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/admin/login')
        .send(dto)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockAdminAuthService.login).toHaveBeenCalledWith(
        dto.email,
        dto.password,
      );
      expect(mockAdminAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid credentials', async () => {
      // Rationale: Validates error handling for invalid credentials, such as wrong email or password, ensuring the controller propagates service exceptions correctly to return 400 status.
      const dto: AdminLoginDto = {
        email: 'admin@example.com',
        password: 'wrongpassword',
      };
      const error = new BadRequestException('Invalid credentials');

      mockAdminAuthService.login.mockRejectedValue(error);

      await request(app.getHttpServer())
        .post('/auth/admin/login')
        .send(dto)
        .expect(400);

      expect(mockAdminAuthService.login).toHaveBeenCalledWith(
        dto.email,
        dto.password,
      );
    });

    it('should throw UnauthorizedException for unauthorized access', async () => {
      // Rationale: Ensures authentication failures, such as unauthorized attempts, are handled with appropriate 401 responses, maintaining security and proper error propagation.
      const dto: AdminLoginDto = {
        email: 'admin@example.com',
        password: 'password',
      };
      const error = new UnauthorizedException('Unauthorized');

      mockAdminAuthService.login.mockRejectedValue(error);

      await request(app.getHttpServer())
        .post('/auth/admin/login')
        .send(dto)
        .expect(401);

      expect(mockAdminAuthService.login).toHaveBeenCalledWith(
        dto.email,
        dto.password,
      );
    });
  });
});
