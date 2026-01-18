import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('Vendors CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up vendors table before each test
    await prisma.vendor.deleteMany();
    // Clean up cities as well since vendors depend on cities
    await prisma.city.deleteMany();
  });

  describe('Create', () => {
    it('should create a vendor with valid data', async () => {
      // Create a test city first
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });

      const vendorData = {
        name: 'Test Vendor',
        phone: '1234567890',
        city: city.id,
      };

      const vendor = await prisma.vendor.create({ data: vendorData });

      expect(vendor).toHaveProperty('id');
      expect(vendor.name).toBe('Test Vendor');
      expect(vendor.phone).toBe('1234567890');
      expect(vendor.city).toBe(city.id);
      expect(vendor.is_active).toBe(true);
      expect(vendor.created_at).toBeInstanceOf(Date);
      expect(vendor.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for null name', async () => {
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });

      const vendorData = {
        name: null as any,
        phone: '1234567890',
        city: city.id,
      };

      await expect(prisma.vendor.create({ data: vendorData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for invalid city (foreign key violation)', async () => {
      const vendorData = {
        name: 'Test Vendor',
        phone: '1234567890',
        city: 'invalid-city-id',
      };

      await expect(prisma.vendor.create({ data: vendorData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for duplicate phone', async () => {
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });

      await prisma.vendor.create({
        data: {
          name: 'First Vendor',
          phone: '1234567890',
          city: city.id,
        },
      });

      const vendorData = {
        name: 'Second Vendor',
        phone: '1234567890', // duplicate
        city: city.id,
      };

      await expect(prisma.vendor.create({ data: vendorData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });
  });

  describe('Read', () => {
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
    });

    it('should find many vendors', async () => {
      const vendors = await prisma.vendor.findMany();

      expect(vendors).toHaveLength(1);
      expect(vendors[0].name).toBe('Test Vendor');
    });

    it('should find unique vendor by id', async () => {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
      });

      expect(vendor).toBeTruthy();
      expect(vendor?.name).toBe('Test Vendor');
    });
  });

  describe('Update', () => {
    let vendorId: string;
    let cityId: string;

    beforeEach(async () => {
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });
      cityId = city.id;

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Update Vendor',
          phone: '1234567890',
          city: cityId,
        },
      });
      vendorId = vendor.id;
    });

    it('should update vendor name', async () => {
      const updatedVendor = await prisma.vendor.update({
        where: { id: vendorId },
        data: { name: 'Updated Vendor' },
      });

      expect(updatedVendor.name).toBe('Updated Vendor');
    });

    it('should throw error for null name on update', async () => {
      await expect(
        prisma.vendor.update({
          where: { id: vendorId },
          data: { name: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid city on update', async () => {
      await expect(
        prisma.vendor.update({
          where: { id: vendorId },
          data: { city: 'invalid-city-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
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
          name: 'Delete Vendor',
          phone: '1234567890',
          city: city.id,
        },
      });
      vendorId = vendor.id;
    });

    it('should delete vendor', async () => {
      const deletedVendor = await prisma.vendor.delete({
        where: { id: vendorId },
      });

      expect(deletedVendor.name).toBe('Delete Vendor');

      const vendors = await prisma.vendor.findMany();
      expect(vendors).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.vendor.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
