import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CategoriesController } from '../../src/product/controllers/categories.controller';
import { CategoriesService } from '../../src/product/services/categories.service';
import { AdminVendorGuard } from '../../src/auth/guards/admin-vendor.guard';
import { NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';

/**
 * Unit tests for CategoriesController.
 *
 * Rationale for controller testing:
 * - Ensures API reliability: Unit tests validate that controller methods correctly handle HTTP requests, delegate to services, and return appropriate responses.
 * - Isolates controller logic: By mocking the CategoriesService, we test the controller's responsibility of routing and response handling without external dependencies.
 * - Covers critical endpoints: Tests for CRUD operations on categories.
 * - Validates HTTP status codes: Error scenarios test that appropriate exceptions are thrown.
 * - Tests authentication: Ensures AdminVendorGuard is properly applied.
 */

describe('CategoriesController', () => {
  let app: INestApplication;
  let mockCategoriesService: jest.Mocked<CategoriesService>;

  beforeEach(async () => {
    const mockService = {
      getCategories: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
    };

    const mockAuthGuard = {
      canActivate: jest.fn((context) => {
        const request = context.switchToHttp().getRequest();
        request.user = { id: 'user-123' }; // Mock user
        return true;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(AdminVendorGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();
    mockCategoriesService = module.get(CategoriesService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /categories', () => {
    it('should return all categories successfully', async () => {
      const expectedCategories = [
        { id: 'cat-1', name: 'Water Jars', created_at: '2025-12-12T19:14:10.744Z', updated_at: '2025-12-12T19:14:10.744Z' },
      ];

      mockCategoriesService.getCategories.mockResolvedValue(expectedCategories as any);

      const response = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      expect(response.body).toEqual(expectedCategories);
      expect(mockCategoriesService.getCategories).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /categories', () => {
    it('should create a category successfully', async () => {
      const dto = { name: 'New Category' };
      const expectedResponse = { id: 'cat-123', name: 'New Category', created_at: '2025-12-12T19:14:10.827Z', updated_at: '2025-12-12T19:14:10.827Z' };

      mockCategoriesService.createCategory.mockResolvedValue(expectedResponse as any);

      const response = await request(app.getHttpServer())
        .post('/categories')
        .send(dto)
        .expect(201);

      expect(response.body).toEqual(expectedResponse);
      expect(mockCategoriesService.createCategory).toHaveBeenCalledWith(dto);
    });

    it('should throw 400 for duplicate name', async () => {
      const dto = { name: 'Existing Category' };
      const error = new BadRequestException('Category with this name already exists');

      mockCategoriesService.createCategory.mockRejectedValue(error);

      await request(app.getHttpServer())
        .post('/categories')
        .send(dto)
        .expect(400);
    });
  });

  describe('PUT /categories/:id', () => {
    it('should update a category successfully', async () => {
      const categoryId = 'cat-123';
      const dto = { name: 'Updated Category' };
      const expectedResponse = { id: categoryId, name: 'Updated Category', created_at: '2025-12-12T19:14:10.885Z', updated_at: '2025-12-12T19:14:10.885Z' };

      mockCategoriesService.updateCategory.mockResolvedValue(expectedResponse as any);

      const response = await request(app.getHttpServer())
        .put(`/categories/${categoryId}`)
        .send(dto)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockCategoriesService.updateCategory).toHaveBeenCalledWith(categoryId, dto);
    });

    it('should throw 404 for non-existent category', async () => {
      const categoryId = 'non-existent';
      const dto = { name: 'Updated Name' };
      const error = new NotFoundException('Category not found');

      mockCategoriesService.updateCategory.mockRejectedValue(error);

      await request(app.getHttpServer())
        .put(`/categories/${categoryId}`)
        .send(dto)
        .expect(404);
    });
  });

  describe('DELETE /categories/:id', () => {
    it('should delete a category successfully', async () => {
      const categoryId = 'cat-123';
      const expectedResponse = { message: 'Category deleted successfully' };

      mockCategoriesService.deleteCategory.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockCategoriesService.deleteCategory).toHaveBeenCalledWith(categoryId);
    });

    it('should throw 400 if category has associated products', async () => {
      const categoryId = 'cat-123';
      const error = new BadRequestException('Cannot delete category as it is associated with existing products');

      mockCategoriesService.deleteCategory.mockRejectedValue(error);

      await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .expect(400);
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      const mockAuthGuardFail = {
        canActivate: jest.fn().mockRejectedValue(new UnauthorizedException('Unauthorized')),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [CategoriesController],
        providers: [
          {
            provide: CategoriesService,
            useValue: { getCategories: jest.fn() },
          },
        ],
      })
        .overrideGuard(AdminVendorGuard)
        .useValue(mockAuthGuardFail)
        .compile();

      const appFail = module.createNestApplication();
      await appFail.init();

      await request(appFail.getHttpServer())
        .get('/categories')
        .expect(401);

      await appFail.close();
    });
  });
});