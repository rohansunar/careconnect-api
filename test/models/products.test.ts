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
    // Clean up related tables
    await prisma.vendor.deleteMany();
    await prisma.order.deleteMany();
  });

  describe('Create', () => {
    it('should create a product with valid data', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const productData = {
        name: 'Test Product',
        category_id: category.id,
        image_url: 'http://example.com/image.jpg',
        description: 'A test product',
        vendor_id: vendor.id,
        price: 100.5,
        deposit: 10.0,
        is_active: true,
      };

      const product = await prisma.product.create({ data: productData });

      expect(product).toHaveProperty('id');
      expect(product.name).toBe('Test Product');
      expect(product.category_id).toBe(category.id);
      expect(product.image_url).toBe('http://example.com/image.jpg');
      expect(product.description).toBe('A test product');
      expect(product.vendor_id).toBe(vendor.id);
      expect(product.price).toBe(100.5);
      expect(product.deposit).toBe(10.0);
      expect(product.is_active).toBe(true);
      expect(product.created_at).toBeInstanceOf(Date);
      expect(product.updated_at).toBeInstanceOf(Date);
    });

    it('should create a product with minimal data', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const productData = {
        name: 'Minimal Product',
        vendor_id: vendor.id,
        price: 50.0,
      };

      const product = await prisma.product.create({ data: productData });

      expect(product).toHaveProperty('id');
      expect(product.name).toBe('Minimal Product');
      expect(product.category_id).toBeNull();
      expect(product.image_url).toBeNull();
      expect(product.description).toBeNull();
      expect(product.vendor_id).toBe(vendor.id);
      expect(product.price).toBe(50.0);
      expect(product.deposit).toBeNull();
      expect(product.is_active).toBe(true);
      expect(product.created_at).toBeInstanceOf(Date);
      expect(product.updated_at).toBeInstanceOf(Date);
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
          price: 25.0,
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
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });
      const product = await prisma.product.create({
        data: {
          name: 'Update Product',
          vendor_id: vendor.id,
          price: 30.0,
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
        data: {
          deposit: 15.0,
          description: 'Updated description',
          is_active: false,
        },
      });

      expect(updatedProduct.deposit).toBe(15.0);
      expect(updatedProduct.description).toBe('Updated description');
      expect(updatedProduct.is_active).toBe(false);
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
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });
      const product = await prisma.product.create({
        data: {
          name: 'Delete Product',
          vendor_id: vendor.id,
          price: 20.0,
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

  describe('vendor_id', () => {
    it('should create product with vendor_id', async () => {
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
          price: 10.0,
        },
      });
      expect(product.vendor_id).toBe(vendor.id);
    });

    it('should throw error for invalid vendor_id', async () => {
      await expect(
        prisma.product.create({
          data: {
            name: 'Test Product',
            vendor_id: 'invalid-vendor-id',
            price: 10.0,
          },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('price', () => {
    it('should have price', async () => {
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
          price: 10.5,
        },
      });
      expect(product.price).toBe(10.5);
    });
  });

  describe('deposit', () => {
    it('should have deposit when provided', async () => {
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
          price: 10.0,
          deposit: 5.0,
        },
      });
      expect(product.deposit).toBe(5.0);
    });

    it('should be null when not provided', async () => {
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
          price: 10.0,
        },
      });
      expect(product.deposit).toBeNull();
    });
  });

  describe('is_active', () => {
    it('should default to true', async () => {
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
          price: 10.0,
        },
      });
      expect(product.is_active).toBe(true);
    });

    it('should be settable', async () => {
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
          price: 10.0,
          is_active: false,
        },
      });
      expect(product.is_active).toBe(false);
    });
  });

  describe('updated_at', () => {
    it('should be Date', async () => {
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
          price: 10.0,
        },
      });
      expect(product.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('category_id', () => {
    it('should be settable', async () => {
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
          price: 10.0,
          category_id: category.id,
        },
      });
      expect(product.category_id).toBe(category.id);
    });

    it('should be null when not provided', async () => {
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
          price: 10.0,
        },
      });
      expect(product.category_id).toBeNull();
    });
  });

  describe('vendor relation', () => {
    it('should include vendor', async () => {
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
          price: 10.0,
        },
      });
      const productWithVendor = await prisma.product.findUnique({
        where: { id: product.id },
        include: { vendor: true },
      });
      expect(productWithVendor?.vendor?.name).toBe('Test Vendor');
    });
  });

  describe('category relation', () => {
    it('should include category', async () => {
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
          price: 10.0,
          category_id: category.id,
        },
      });
      const productWithCategory = await prisma.product.findUnique({
        where: { id: product.id },
        include: { category: true },
      });
      expect(productWithCategory?.category?.name).toBe('Test Category');
    });
  });
});
