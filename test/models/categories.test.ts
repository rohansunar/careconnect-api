import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('Categories CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up categories table before each test
    await prisma.categories.deleteMany();
    // Clean up related tables
    await prisma.product.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.order.deleteMany();
  });

  describe('Create', () => {
    it('should create a category with valid data', async () => {
      const categoryData = {
        name: 'Test Category',
      };

      const category = await prisma.categories.create({ data: categoryData });

      expect(category).toHaveProperty('id');
      expect(category.name).toBe('Test Category');
      expect(category.created_at).toBeInstanceOf(Date);
      expect(category.updated_at).toBeInstanceOf(Date);
    });

    it('should create a category with minimal data', async () => {
      const categoryData = {
        name: 'Minimal Category',
      };

      const category = await prisma.categories.create({ data: categoryData });

      expect(category).toHaveProperty('id');
      expect(category.name).toBe('Minimal Category');
      expect(category.created_at).toBeInstanceOf(Date);
      expect(category.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for null name', async () => {
      const categoryData = {
        name: null as any,
      };

      await expect(
        prisma.categories.create({ data: categoryData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Read', () => {
    let categoryId: string;

    beforeEach(async () => {
      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });
      categoryId = category.id;
    });

    it('should find many categories', async () => {
      const categories = await prisma.categories.findMany();

      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('Test Category');
    });

    it('should find unique category by id', async () => {
      const category = await prisma.categories.findUnique({
        where: { id: categoryId },
      });

      expect(category).toBeTruthy();
      expect(category?.name).toBe('Test Category');
    });
  });

  describe('Update', () => {
    let categoryId: string;

    beforeEach(async () => {
      const category = await prisma.categories.create({
        data: {
          name: 'Update Category',
        },
      });
      categoryId = category.id;
    });

    it('should update category name', async () => {
      const updatedCategory = await prisma.categories.update({
        where: { id: categoryId },
        data: { name: 'Updated Category' },
      });

      expect(updatedCategory.name).toBe('Updated Category');
    });

    it('should throw error for null name on update', async () => {
      await expect(
        prisma.categories.update({
          where: { id: categoryId },
          data: { name: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let categoryId: string;

    beforeEach(async () => {
      const category = await prisma.categories.create({
        data: {
          name: 'Delete Category',
        },
      });
      categoryId = category.id;
    });

    it('should delete category', async () => {
      const deletedCategory = await prisma.categories.delete({
        where: { id: categoryId },
      });

      expect(deletedCategory.name).toBe('Delete Category');

      const categories = await prisma.categories.findMany();
      expect(categories).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.categories.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('id', () => {
    it('should be UUID', async () => {
      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });
      expect(category.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('name', () => {
    it('should be string', async () => {
      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });
      expect(typeof category.name).toBe('string');
      expect(category.name).toBe('Test Category');
    });
  });

  describe('created_at', () => {
    it('should be Date', async () => {
      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });
      expect(category.created_at).toBeInstanceOf(Date);
    });
  });

  describe('updated_at', () => {
    it('should be Date', async () => {
      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });
      expect(category.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('products relation', () => {
    it('should include products', async () => {
      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          vendor_id: vendor.id,
          price: 10.00,
          category_id: category.id,
        },
      });
      const categoryWithProducts = await prisma.categories.findUnique({
        where: { id: category.id },
        include: { products: true },
      });
      expect(categoryWithProducts?.products).toHaveLength(1);
      expect(categoryWithProducts?.products[0].name).toBe('Test Product');
    });
  });
});