import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('VendorProducts CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up vendorProducts table before each test
    await prisma.vendorProduct.deleteMany();
    // Clean up vendors as well since vendorProducts depend on vendors
    await prisma.vendor.deleteMany();
    // Clean up cities as vendors depend on cities
    await prisma.city.deleteMany();
  });

  describe('Create', () => {
    it('should create a vendorProduct with valid data', async () => {
      // Create a test city first
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });

      // Create a test vendor
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
          city: city.id,
        },
      });

      const vendorProductData = {
        vendor_id: vendor.id,
        name: 'Test Vendor Product',
        description: 'A test vendor product',
        price: 100.5,
        image_url: 'http://example.com/image.jpg',
        is_active: true,
      };

      const vendorProduct = await prisma.vendorProduct.create({
        data: vendorProductData,
      });

      expect(vendorProduct).toHaveProperty('id');
      expect(vendorProduct.vendor_id).toBe(vendor.id);
      expect(vendorProduct.name).toBe('Test Vendor Product');
      expect(vendorProduct.description).toBe('A test vendor product');
      expect(vendorProduct.price).toBe(100.5);
      expect(vendorProduct.image_url).toBe('http://example.com/image.jpg');
      expect(vendorProduct.is_active).toBe(true);
      expect(vendorProduct.created_at).toBeInstanceOf(Date);
      expect(vendorProduct.updated_at).toBeInstanceOf(Date);
    });

    it('should create a vendorProduct with minimal data', async () => {
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
          city: city.id,
        },
      });

      const vendorProductData = {
        vendor_id: vendor.id,
        name: 'Minimal Vendor Product',
        price: 50.0,
      };

      const vendorProduct = await prisma.vendorProduct.create({
        data: vendorProductData,
      });

      expect(vendorProduct).toHaveProperty('id');
      expect(vendorProduct.vendor_id).toBe(vendor.id);
      expect(vendorProduct.name).toBe('Minimal Vendor Product');
      expect(vendorProduct.price).toBe(50.0);
      expect(vendorProduct.is_active).toBe(true);
      expect(vendorProduct.description).toBeNull();
      expect(vendorProduct.image_url).toBeNull();
    });

    it('should throw error for null name', async () => {
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
          city: city.id,
        },
      });

      const vendorProductData = {
        vendor_id: vendor.id,
        name: null as any,
        price: 100.0,
      };

      await expect(
        prisma.vendorProduct.create({ data: vendorProductData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null price', async () => {
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
          city: city.id,
        },
      });

      const vendorProductData = {
        vendor_id: vendor.id,
        name: 'Test Product',
        price: null as any,
      };

      await expect(
        prisma.vendorProduct.create({ data: vendorProductData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid vendor_id (foreign key violation)', async () => {
      const vendorProductData = {
        vendor_id: 'invalid-vendor-id',
        name: 'Test Product',
        price: 100.0,
      };

      await expect(
        prisma.vendorProduct.create({ data: vendorProductData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Read', () => {
    let vendorProductId: string;

    beforeEach(async () => {
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
          city: city.id,
        },
      });

      const vendorProduct = await prisma.vendorProduct.create({
        data: {
          vendor_id: vendor.id,
          name: 'Test Vendor Product',
          price: 100.0,
        },
      });
      vendorProductId = vendorProduct.id;
    });

    it('should find many vendorProducts', async () => {
      const vendorProducts = await prisma.vendorProduct.findMany();

      expect(vendorProducts).toHaveLength(1);
      expect(vendorProducts[0].name).toBe('Test Vendor Product');
    });

    it('should find unique vendorProduct by id', async () => {
      const vendorProduct = await prisma.vendorProduct.findUnique({
        where: { id: vendorProductId },
      });

      expect(vendorProduct).toBeTruthy();
      expect(vendorProduct?.name).toBe('Test Vendor Product');
    });
  });

  describe('Update', () => {
    let vendorProductId: string;
    let vendorId: string;

    beforeEach(async () => {
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
          city: city.id,
        },
      });
      vendorId = vendor.id;

      const vendorProduct = await prisma.vendorProduct.create({
        data: {
          vendor_id: vendorId,
          name: 'Update Vendor Product',
          price: 200.0,
        },
      });
      vendorProductId = vendorProduct.id;
    });

    it('should update vendorProduct name', async () => {
      const updatedVendorProduct = await prisma.vendorProduct.update({
        where: { id: vendorProductId },
        data: { name: 'Updated Vendor Product' },
      });

      expect(updatedVendorProduct.name).toBe('Updated Vendor Product');
    });

    it('should update price', async () => {
      const updatedVendorProduct = await prisma.vendorProduct.update({
        where: { id: vendorProductId },
        data: { price: 250.0 },
      });

      expect(updatedVendorProduct.price).toBe(250.0);
    });

    it('should throw error for null name on update', async () => {
      await expect(
        prisma.vendorProduct.update({
          where: { id: vendorProductId },
          data: { name: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null price on update', async () => {
      await expect(
        prisma.vendorProduct.update({
          where: { id: vendorProductId },
          data: { price: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let vendorProductId: string;

    beforeEach(async () => {
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
          city: city.id,
        },
      });

      const vendorProduct = await prisma.vendorProduct.create({
        data: {
          vendor_id: vendor.id,
          name: 'Delete Vendor Product',
          price: 100.0,
        },
      });
      vendorProductId = vendorProduct.id;
    });

    it('should delete vendorProduct', async () => {
      const deletedVendorProduct = await prisma.vendorProduct.delete({
        where: { id: vendorProductId },
      });

      expect(deletedVendorProduct.name).toBe('Delete Vendor Product');

      const vendorProducts = await prisma.vendorProduct.findMany();
      expect(vendorProducts).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.vendorProduct.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
