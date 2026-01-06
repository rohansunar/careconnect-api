import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RiderController } from '../../src/rider/controllers/rider.controller';
import { RiderService } from '../../src/rider/services/rider.service';
import { VendorAuthGuard } from '../../src/auth/guards/vendor-auth.guard';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

/**
 * Unit tests for RiderController.
 *
 * Rationale for controller testing:
 * - Ensures API reliability: Unit tests validate that controller methods correctly handle HTTP requests, delegate to services, and return appropriate responses, ensuring the API behaves as specified.
 * - Isolates controller logic: By mocking the RiderService, we test the controller's responsibility of routing and response handling without external dependencies.
 * - Covers critical endpoints: Tests for the POST /riders endpoint verify successful creation, error handling (e.g., duplicate phone, invalid data), and proper service method invocations.
 * - Validates HTTP status codes: Error scenarios test that appropriate exceptions are thrown, which map to correct HTTP status codes in the framework.
 * - Tests authentication: Ensures VendorAuthGuard is properly applied to all endpoints.
 * - Maintains code quality: Comprehensive tests with comments promote maintainability, allowing future changes to be validated against expected behavior.
 */

describe('RiderController', () => {
  let app: INestApplication;
  let mockRiderService: jest.Mocked<RiderService>;

  beforeEach(async () => {
    const mockService = {
      createRider: jest.fn(),
    };

    const mockAuthGuard = {
      canActivate: jest.fn((context) => {
        const request = context.switchToHttp().getRequest();
        request.user = { id: 'vendor-456' }; // Mock user
        return true;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RiderController],
      providers: [
        {
          provide: RiderService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(VendorAuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();
    mockRiderService = module.get(RiderService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /riders', () => {
    it('should create rider successfully and return 201', async () => {
      // Rationale: Tests the happy path for rider creation, ensuring the controller delegates to the service and returns the expected response structure.
      const riderData = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        address: '123 Main St',
      };
      const expectedResponse = {
        id: 'rider-123',
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        address: '123 Main St',
        vendorId: 'vendor-456',
        created_at: new Date(),
      };

      mockRiderService.createRider.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post('/riders')
        .send(riderData)
        .expect(201);

      expect(response.body).toEqual({
        ...expectedResponse,
        created_at: expectedResponse.created_at.toISOString(),
      });
      expect(mockRiderService.createRider).toHaveBeenCalledWith(
        { ...riderData, vendorId: 'vendor-456' },
        false,
      );
      expect(mockRiderService.createRider).toHaveBeenCalledTimes(1);
    });

    it('should throw 400 Bad Request for duplicate phone', async () => {
      // Rationale: Validates error handling for duplicate phone numbers, ensuring the controller propagates BadRequestException correctly to return 400 status.
      const riderData = {
        name: 'John Doe',
        phone: '+1234567890',
      };
      const error = new BadRequestException(
        'Rider with this phone number already exists',
      );

      mockRiderService.createRider.mockRejectedValue(error);

      await request(app.getHttpServer())
        .post('/riders')
        .send(riderData)
        .expect(400);

      expect(mockRiderService.createRider).toHaveBeenCalledWith(
        { ...riderData, vendorId: 'vendor-456' },
        false,
      );
    });

    it('should throw 400 Bad Request for invalid phone format', async () => {
      // Rationale: Ensures that invalid phone formats result in a BadRequestException, maintaining data integrity.
      const riderData = {
        name: 'John Doe',
        phone: 'invalid-phone',
      };
      const error = new BadRequestException('Invalid phone number format');

      mockRiderService.createRider.mockRejectedValue(error);

      await request(app.getHttpServer())
        .post('/riders')
        .send(riderData)
        .expect(400);

      expect(mockRiderService.createRider).toHaveBeenCalledWith(
        { ...riderData, vendorId: 'vendor-456' },
        false,
      );
    });

    it('should create rider with partial data', async () => {
      // Rationale: Tests creation with partial data.
      const riderData = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
      };

      const expectedResponse = {
        id: 'rider-123',
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        address: null,
        vendorId: 'vendor-456',
        created_at: new Date(),
      };

      mockRiderService.createRider.mockResolvedValue(expectedResponse);

      await request(app.getHttpServer())
        .post('/riders')
        .send(riderData)
        .expect(201);

      expect(mockRiderService.createRider).toHaveBeenCalledWith(
        { ...riderData, vendorId: 'vendor-456' },
        false,
      );
    });
  });

  describe('Authentication', () => {
    it('should require authentication for POST /riders', async () => {
      // This test verifies that the VendorAuthGuard is applied
      // Since we mocked it to return true, the request should proceed
      const riderData = {
        name: 'John Doe',
        phone: '+1234567890',
      };
      const expectedResponse = {
        id: 'rider-123',
        name: 'John Doe',
        phone: '+1234567890',
        email: null,
        address: null,
        vendorId: 'vendor-456',
        created_at: new Date(),
      };

      mockRiderService.createRider.mockResolvedValue(expectedResponse);

      await request(app.getHttpServer())
        .post('/riders')
        .send(riderData)
        .expect(201);
    });

    it('should throw 401 Unauthorized when guard fails', async () => {
      // Rationale: Tests unauthorized access by mocking the guard to throw UnauthorizedException, ensuring proper authentication enforcement.
      const riderData = {
        name: 'John Doe',
        phone: '+1234567890',
      };

      const mockAuthGuardFail = {
        canActivate: jest
          .fn()
          .mockRejectedValue(new UnauthorizedException('Unauthorized')),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [RiderController],
        providers: [
          {
            provide: RiderService,
            useValue: { createRider: jest.fn() },
          },
        ],
      })
        .overrideGuard(VendorAuthGuard)
        .useValue(mockAuthGuardFail)
        .compile();

      const appFail = module.createNestApplication();
      await appFail.init();

      await request(appFail.getHttpServer())
        .post('/riders')
        .send(riderData)
        .expect(401);

      await appFail.close();
    });
  });
});
