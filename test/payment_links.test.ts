import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('PaymentLinks CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up paymentLinks table before each test
    await prisma.paymentLink.deleteMany();
    // Clean up related tables
    await prisma.monthlyBill.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.city.deleteMany();
  });

  describe('Create', () => {
    it('should create a paymentLink with valid data', async () => {
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

      const monthlyBill = await prisma.monthlyBill.create({
        data: {
          customer_id: customer.id,
          vendor_id: vendor.id,
          month: '2025-01',
          total_amount: 500.0,
        },
      });

      const paymentLinkData = {
        bill_id: monthlyBill.id,
        provider: 'razorpay',
        link_url: 'https://payment.link/123',
        provider_link_id: 'plink_123',
        expires_at: new Date('2025-12-01'),
        status: 'ACTIVE' as any,
      };

      const paymentLink = await prisma.paymentLink.create({
        data: paymentLinkData,
      });

      expect(paymentLink).toHaveProperty('id');
      expect(paymentLink.bill_id).toBe(monthlyBill.id);
      expect(paymentLink.provider).toBe('razorpay');
      expect(paymentLink.link_url).toBe('https://payment.link/123');
      expect(paymentLink.provider_link_id).toBe('plink_123');
      expect(paymentLink.expires_at).toBeInstanceOf(Date);
      expect(paymentLink.status).toBe('ACTIVE');
      expect(paymentLink.created_at).toBeInstanceOf(Date);
      expect(paymentLink.updated_at).toBeInstanceOf(Date);
    });

    it('should create a paymentLink with minimal data', async () => {
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

      const monthlyBill = await prisma.monthlyBill.create({
        data: {
          customer_id: customer.id,
          vendor_id: vendor.id,
          month: '2025-02',
          total_amount: 300.0,
        },
      });

      const paymentLinkData = {
        bill_id: monthlyBill.id,
      };

      const paymentLink = await prisma.paymentLink.create({
        data: paymentLinkData,
      });

      expect(paymentLink).toHaveProperty('id');
      expect(paymentLink.bill_id).toBe(monthlyBill.id);
      expect(paymentLink.status).toBe('ACTIVE');
      expect(paymentLink.provider).toBeNull();
      expect(paymentLink.link_url).toBeNull();
      expect(paymentLink.provider_link_id).toBeNull();
      expect(paymentLink.expires_at).toBeNull();
    });

    it('should throw error for null bill_id', async () => {
      const paymentLinkData = {
        bill_id: null as any,
      };

      await expect(
        prisma.paymentLink.create({ data: paymentLinkData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid bill_id (foreign key violation)', async () => {
      const paymentLinkData = {
        bill_id: 'invalid-bill-id',
      };

      await expect(
        prisma.paymentLink.create({ data: paymentLinkData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Read', () => {
    let paymentLinkId: string;

    beforeEach(async () => {
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

      const monthlyBill = await prisma.monthlyBill.create({
        data: {
          customer_id: customer.id,
          vendor_id: vendor.id,
          month: '2025-03',
          total_amount: 400.0,
        },
      });

      const paymentLink = await prisma.paymentLink.create({
        data: {
          bill_id: monthlyBill.id,
          provider: 'stripe',
        },
      });
      paymentLinkId = paymentLink.id;
    });

    it('should find many paymentLinks', async () => {
      const paymentLinks = await prisma.paymentLink.findMany();

      expect(paymentLinks).toHaveLength(1);
      expect(paymentLinks[0].provider).toBe('stripe');
    });

    it('should find unique paymentLink by id', async () => {
      const paymentLink = await prisma.paymentLink.findUnique({
        where: { id: paymentLinkId },
      });

      expect(paymentLink).toBeTruthy();
      expect(paymentLink?.provider).toBe('stripe');
    });
  });

  describe('Update', () => {
    let paymentLinkId: string;

    beforeEach(async () => {
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

      const monthlyBill = await prisma.monthlyBill.create({
        data: {
          customer_id: customer.id,
          vendor_id: vendor.id,
          month: '2025-04',
          total_amount: 600.0,
        },
      });

      const paymentLink = await prisma.paymentLink.create({
        data: {
          bill_id: monthlyBill.id,
          status: 'ACTIVE' as any,
        },
      });
      paymentLinkId = paymentLink.id;
    });

    it('should update link_url', async () => {
      const updatedPaymentLink = await prisma.paymentLink.update({
        where: { id: paymentLinkId },
        data: { link_url: 'https://updated.link' },
      });

      expect(updatedPaymentLink.link_url).toBe('https://updated.link');
    });

    it('should update status', async () => {
      const updatedPaymentLink = await prisma.paymentLink.update({
        where: { id: paymentLinkId },
        data: { status: 'EXPIRED' as any },
      });

      expect(updatedPaymentLink.status).toBe('EXPIRED');
    });

    it('should throw error for null bill_id on update', async () => {
      await expect(
        prisma.paymentLink.update({
          where: { id: paymentLinkId },
          data: { bill_id: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let paymentLinkId: string;

    beforeEach(async () => {
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

      const monthlyBill = await prisma.monthlyBill.create({
        data: {
          customer_id: customer.id,
          vendor_id: vendor.id,
          month: '2025-05',
          total_amount: 250.0,
        },
      });

      const paymentLink = await prisma.paymentLink.create({
        data: {
          bill_id: monthlyBill.id,
          provider: 'delete_test',
        },
      });
      paymentLinkId = paymentLink.id;
    });

    it('should delete paymentLink', async () => {
      const deletedPaymentLink = await prisma.paymentLink.delete({
        where: { id: paymentLinkId },
      });

      expect(deletedPaymentLink.provider).toBe('delete_test');

      const paymentLinks = await prisma.paymentLink.findMany();
      expect(paymentLinks).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.paymentLink.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
