import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('Subscriptions CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up subscriptions table before each test
    await prisma.subscription.deleteMany();
    // Clean up related tables
    await prisma.vendorProduct.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.city.deleteMany();
  });

  describe('Create', () => {
    it('should create a subscription with valid data', async () => {
      // Create related entities
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });

      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '0987654321',
          city: city.id,
        },
      });

      const vendorProduct = await prisma.vendorProduct.create({
        data: {
          vendor_id: vendor.id,
          name: 'Test Product',
          price: 100.0,
        },
      });

      const subscriptionData = {
        customer_id: customer.id,
        vendor_id: vendor.id,
        product_id: vendorProduct.id,
        jars_per_delivery: 5,
        frequency: 'weekly',
        next_delivery_date: new Date('2025-12-01'),
        status: 'ACTIVE' as any,
      };

      const subscription = await prisma.subscription.create({
        data: subscriptionData,
      });

      expect(subscription).toHaveProperty('id');
      expect(subscription.customer_id).toBe(customer.id);
      expect(subscription.vendor_id).toBe(vendor.id);
      expect(subscription.product_id).toBe(vendorProduct.id);
      expect(subscription.jars_per_delivery).toBe(5);
      expect(subscription.frequency).toBe('weekly');
      expect(subscription.next_delivery_date).toBeInstanceOf(Date);
      expect(subscription.status).toBe('ACTIVE');
      expect(subscription.created_at).toBeInstanceOf(Date);
      expect(subscription.updated_at).toBeInstanceOf(Date);
    });

    it('should create a subscription with minimal data', async () => {
      const subscriptionData = {
        jars_per_delivery: 2,
        frequency: 'daily',
      };

      const subscription = await prisma.subscription.create({
        data: subscriptionData,
      });

      expect(subscription).toHaveProperty('id');
      expect(subscription.jars_per_delivery).toBe(2);
      expect(subscription.frequency).toBe('daily');
      expect(subscription.status).toBe('ACTIVE');
      expect(subscription.customer_id).toBeNull();
      expect(subscription.vendor_id).toBeNull();
      expect(subscription.product_id).toBeNull();
      expect(subscription.next_delivery_date).toBeNull();
    });

    it('should throw error for null jars_per_delivery', async () => {
      const subscriptionData = {
        jars_per_delivery: null as any,
        frequency: 'weekly',
      };

      await expect(
        prisma.subscription.create({ data: subscriptionData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null frequency', async () => {
      const subscriptionData = {
        jars_per_delivery: 1,
        frequency: null as any,
      };

      await expect(
        prisma.subscription.create({ data: subscriptionData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid customer_id', async () => {
      const subscriptionData = {
        customer_id: 'invalid-customer-id',
        jars_per_delivery: 1,
        frequency: 'weekly',
      };

      await expect(
        prisma.subscription.create({ data: subscriptionData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid vendor_id', async () => {
      const subscriptionData = {
        vendor_id: 'invalid-vendor-id',
        jars_per_delivery: 1,
        frequency: 'weekly',
      };

      await expect(
        prisma.subscription.create({ data: subscriptionData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid product_id', async () => {
      const subscriptionData = {
        product_id: 'invalid-product-id',
        jars_per_delivery: 1,
        frequency: 'weekly',
      };

      await expect(
        prisma.subscription.create({ data: subscriptionData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Read', () => {
    let subscriptionId: string;

    beforeEach(async () => {
      const subscription = await prisma.subscription.create({
        data: {
          jars_per_delivery: 3,
          frequency: 'monthly',
        },
      });
      subscriptionId = subscription.id;
    });

    it('should find many subscriptions', async () => {
      const subscriptions = await prisma.subscription.findMany();

      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].jars_per_delivery).toBe(3);
    });

    it('should find unique subscription by id', async () => {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      expect(subscription).toBeTruthy();
      expect(subscription?.jars_per_delivery).toBe(3);
    });
  });

  describe('Update', () => {
    let subscriptionId: string;

    beforeEach(async () => {
      const subscription = await prisma.subscription.create({
        data: {
          jars_per_delivery: 1,
          frequency: 'weekly',
          status: 'ACTIVE' as any,
        },
      });
      subscriptionId = subscription.id;
    });

    it('should update jars_per_delivery', async () => {
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { jars_per_delivery: 4 },
      });

      expect(updatedSubscription.jars_per_delivery).toBe(4);
    });

    it('should update status', async () => {
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: 'INACTIVE' as any },
      });

      expect(updatedSubscription.status).toBe('INACTIVE');
    });

    it('should throw error for null jars_per_delivery on update', async () => {
      await expect(
        prisma.subscription.update({
          where: { id: subscriptionId },
          data: { jars_per_delivery: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null frequency on update', async () => {
      await expect(
        prisma.subscription.update({
          where: { id: subscriptionId },
          data: { frequency: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let subscriptionId: string;

    beforeEach(async () => {
      const subscription = await prisma.subscription.create({
        data: {
          jars_per_delivery: 1,
          frequency: 'weekly',
        },
      });
      subscriptionId = subscription.id;
    });

    it('should delete subscription', async () => {
      const deletedSubscription = await prisma.subscription.delete({
        where: { id: subscriptionId },
      });

      expect(deletedSubscription.jars_per_delivery).toBe(1);

      const subscriptions = await prisma.subscription.findMany();
      expect(subscriptions).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.subscription.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
