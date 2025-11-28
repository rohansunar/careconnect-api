import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('Products CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up products table before each test
    await prisma.product.deleteMany();
  });

  describe('Create', () => {
    it('should create a product with valid data', async () => {
      const productData = {
        name: 'Test Product',
        type: 'Beverage',
        image_url: 'http://example.com/image.jpg',
        description: 'A test product',
      };

      const product = await prisma.product.create({ data: productData });

      expect(product).toHaveProperty('id');
      expect(product.name).toBe('Test Product');
      expect(product.type).toBe('Beverage');
      expect(product.image_url).toBe('http://example.com/image.jpg');
      expect(product.description).toBe('A test product');
      expect(product.created_at).toBeInstanceOf(Date);
    });

    it('should create a product with minimal data', async () => {
      const productData = {
        name: 'Minimal Product',
      };

      const product = await prisma.product.create({ data: productData });

      expect(product).toHaveProperty('id');
      expect(product.name).toBe('Minimal Product');
      expect(product.type).toBeNull();
      expect(product.image_url).toBeNull();
      expect(product.description).toBeNull();
      expect(product.created_at).toBeInstanceOf(Date);
    });

    it('should throw error for null name', async () => {
      const productData = {
        name: null as any,
      };

      await expect(
        prisma.product.create({ data: productData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Read', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          type: 'Beverage',
        },
      });
      productId = product.id;
    });

    it('should find many products', async () => {
      const products = await prisma.product.findMany();

      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Test Product');
    });

    it('should find unique product by id', async () => {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      expect(product).toBeTruthy();
      expect(product?.name).toBe('Test Product');
    });
  });

  describe('Update', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Update Product',
          type: 'Beverage',
        },
      });
      productId = product.id;
    });

    it('should update product name', async () => {
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: { name: 'Updated Product' },
      });

      expect(updatedProduct.name).toBe('Updated Product');
    });

    it('should update optional fields', async () => {
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: { type: 'Updated Type', description: 'Updated description' },
      });

      expect(updatedProduct.type).toBe('Updated Type');
      expect(updatedProduct.description).toBe('Updated description');
    });

    it('should throw error for null name on update', async () => {
      await expect(
        prisma.product.update({
          where: { id: productId },
          data: { name: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Delete Product',
        },
      });
      productId = product.id;
    });

    it('should delete product', async () => {
      const deletedProduct = await prisma.product.delete({
        where: { id: productId },
      });

      expect(deletedProduct.name).toBe('Delete Product');

      const products = await prisma.product.findMany();
      expect(products).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.product.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
