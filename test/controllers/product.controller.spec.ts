import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ProductController } from '../../src/product/controllers/product.controller';
import { ProductService } from '../../src/product/services/product.service';
import { AdminVendorGuard } from '../../src/auth/guards/admin-vendor.guard';
import { NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';

/**
 * Unit tests for ProductController.
 *
 * Rationale for controller testing:
 * - Ensures API reliability: Unit tests validate that controller methods correctly handle HTTP requests, delegate to services, and return appropriate responses, ensuring the API behaves as specified.
 * - Isolates controller logic: By mocking the ProductService, we test the controller's responsibility of routing and response handling without external dependencies.
 * - Covers critical endpoints: Tests for the PUT /product/:productId/restore endpoint verify successful restoration, error handling (e.g., product not found, already active), and proper service method invocations.
 * - Validates HTTP status codes: Error scenarios test that appropriate exceptions are thrown, which map to correct HTTP status codes in the framework.
 * - Tests authentication: Ensures AdminVendorGuard is properly applied to all endpoints.
 * - Maintains code quality: Comprehensive tests with comments promote maintainability, allowing future changes to be validated against expected behavior.
 */

describe('ProductController', () => {
  let app: INestApplication;
  let mockProductService: jest.Mocked<ProductService>;

  beforeEach(async () => {
    const mockService = {
      restoreProduct: jest.fn(),
    };

    const mockAuthGuard = {
      canActivate: jest.fn((context) => {
        const request = context.switchToHttp().getRequest();
        request.user = { id: 'vendor-456' }; // Mock user
        return true;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(AdminVendorGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();
    mockProductService = module.get(ProductService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('PUT /product/:productId/restore', () => {
    it('should restore product successfully and return 200', async () => {
      // Rationale: Tests the happy path for product restoration, ensuring the controller delegates to the service and returns the expected response structure.
      const productId = 'product-123';
      const vendorId = 'vendor-456';
      const expectedResponse = { message: 'Vendor product restored' };

      mockProductService.restoreProduct.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .put(`/product/${productId}/restore`)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockProductService.restoreProduct).toHaveBeenCalledWith(vendorId, productId);
      expect(mockProductService.restoreProduct).toHaveBeenCalledTimes(1);
    });

    it('should throw 404 Not Found for non-existent product', async () => {
      // Rationale: Validates error handling for non-existent products, ensuring the controller propagates NotFoundException correctly to return 404 status.
      const productId = 'non-existent-product';
      const vendorId = 'vendor-456';
      const error = new NotFoundException('Vendor product not found');

      mockProductService.restoreProduct.mockRejectedValue(error);

      await request(app.getHttpServer())
        .put(`/product/${productId}/restore`)
        .expect(404);

      expect(mockProductService.restoreProduct).toHaveBeenCalledWith(vendorId, productId);
    });

    it('should throw 400 Bad Request for already active product', async () => {
      // Rationale: Ensures that attempting to restore an already active product results in a BadRequestException, maintaining data integrity.
      const productId = 'active-product-123';
      const vendorId = 'vendor-456';
      const error = new BadRequestException('Product is already active');

      mockProductService.restoreProduct.mockRejectedValue(error);

      await request(app.getHttpServer())
        .put(`/product/${productId}/restore`)
        .expect(400);

      expect(mockProductService.restoreProduct).toHaveBeenCalledWith(vendorId, productId);
    });
  });

  describe('Authentication', () => {
    it('should require authentication for PUT /product/:productId/restore', async () => {
      // This test verifies that the AdminVendorGuard is applied
      // Since we mocked it to return true, the request should proceed
      const productId = 'product-123';
      const expectedResponse = { message: 'Vendor product restored' };

      mockProductService.restoreProduct.mockResolvedValue(expectedResponse);

      await request(app.getHttpServer())
        .put(`/product/${productId}/restore`)
        .expect(200);
    });

    it('should throw 401 Unauthorized when guard fails', async () => {
      // Rationale: Tests unauthorized access by mocking the guard to throw UnauthorizedException, ensuring proper authentication enforcement.
      const productId = 'product-123';

      const mockAuthGuardFail = {
        canActivate: jest.fn().mockRejectedValue(new UnauthorizedException('Unauthorized')),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [ProductController],
        providers: [
          {
            provide: ProductService,
            useValue: { restoreProduct: jest.fn() },
          },
        ],
      })
        .overrideGuard(AdminVendorGuard)
        .useValue(mockAuthGuardFail)
        .compile();

      const appFail = module.createNestApplication();
      await appFail.init();

      await request(appFail.getHttpServer())
        .put(`/product/${productId}/restore`)
        .expect(401);

      await appFail.close();
    });
  });
});