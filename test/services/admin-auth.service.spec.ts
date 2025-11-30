import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuthService } from '../../src/auth/services/admin-auth.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

/**
 * Comprehensive unit tests for AdminAuthService.
 *
 * Rationale for comprehensive testing:
 * - Ensures reliability: By mocking dependencies (PrismaService, JwtService, bcrypt), we isolate the service logic and verify correct interactions without external dependencies.
 * - Covers key methods: Tests for login method ensure all critical paths are validated, including successful authentication and error handling.
 * - Error handling scenarios: Includes tests for invalid password and admin not found to guarantee robust error handling and prevent runtime issues.
 * - Maintainability: Detailed assertions on method calls and return values make it easy to identify regressions during future code changes, promoting long-term code health.
 * - Successful and failed cases: Balances positive and negative test cases to confirm expected behavior under various conditions, enhancing confidence in the authentication flow.
 */

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let mockPrismaService: any;
  let mockJwtService: any;
  let mockBcryptCompare: jest.Mock;

  beforeEach(async () => {
    mockPrismaService = {
      admin: {
        findUnique: jest.fn(),
      },
    };

    mockJwtService = {
      sign: jest.fn(),
    };

    const bcrypt = require('bcrypt') as { compare: jest.Mock };
    mockBcryptCompare = bcrypt.compare;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AdminAuthService>(AdminAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const email = 'admin@example.com';
    const password = 'password123';
    const mockAdmin = {
      id: 1,
      email,
      password: 'hashedpassword',
    };

    it('should login successfully and return token and expiresIn', async () => {
      const token = 'jwt-token';
      const expectedResponse = {
        token,
        admin: mockAdmin,
        expiresIn: 36000,
      };

      mockPrismaService.admin.findUnique.mockResolvedValue(mockAdmin);
      mockBcryptCompare.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.login(email, password);

      expect(result).toEqual(expectedResponse);
      expect(mockPrismaService.admin.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockBcryptCompare).toHaveBeenCalledWith(
        password,
        mockAdmin.password,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      });
    });

    it('should throw BadRequestException for invalid password', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(mockAdmin);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(service.login(email, password)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.admin.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockBcryptCompare).toHaveBeenCalledWith(
        password,
        mockAdmin.password,
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when admin not found', async () => {
      const error = new Error('Admin not found');
      mockPrismaService.admin.findUnique.mockRejectedValue(error);

      await expect(service.login(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrismaService.admin.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockBcryptCompare).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });
});
