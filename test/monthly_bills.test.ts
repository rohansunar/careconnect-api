import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('MonthlyBills CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up monthlyBills table before each test
    await prisma.monthlyBill.deleteMany();
    // Clean up related tables
    await prisma.customer.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.city.deleteMany();
  });

  describe('Create', () => {
    it('should create a monthlyBill with valid data', async () => {
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

      const monthlyBillData = {
        customer_id: customer.id,
        vendor_id: vendor.id,
        month: '2025-01',
        total_amount: 500.0,
        paid_amount: 200.0,
        status: 'PENDING' as any,
      };

      const monthlyBill = await prisma.monthlyBill.create({
        data: monthlyBillData,
      });

      expect(monthlyBill).toHaveProperty('id');
      expect(monthlyBill.customer_id).toBe(customer.id);
      expect(monthlyBill.vendor_id).toBe(vendor.id);
      expect(monthlyBill.month).toBe('2025-01');
      expect(monthlyBill.total_amount).toBe(500.0);
      expect(monthlyBill.paid_amount).toBe(200.0);
      expect(monthlyBill.status).toBe('PENDING');
      expect(monthlyBill.generated_at).toBeInstanceOf(Date);
      expect(monthlyBill.updated_at).toBeInstanceOf(Date);
    });

    it('should create a monthlyBill with minimal data', async () => {
      const monthlyBillData = {
        month: '2025-02',
        total_amount: 300.0,
      };

      const monthlyBill = await prisma.monthlyBill.create({
        data: monthlyBillData,
      });

      expect(monthlyBill).toHaveProperty('id');
      expect(monthlyBill.month).toBe('2025-02');
      expect(monthlyBill.total_amount).toBe(300.0);
      expect(monthlyBill.paid_amount).toBe(0);
      expect(monthlyBill.status).toBe('PENDING');
      expect(monthlyBill.customer_id).toBeNull();
      expect(monthlyBill.vendor_id).toBeNull();
    });

    it('should throw error for null month', async () => {
      const monthlyBillData = {
        month: null as any,
        total_amount: 100.0,
      };

      await expect(
        prisma.monthlyBill.create({ data: monthlyBillData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null total_amount', async () => {
      const monthlyBillData = {
        month: '2025-01',
        total_amount: null as any,
      };

      await expect(
        prisma.monthlyBill.create({ data: monthlyBillData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid customer_id', async () => {
      const monthlyBillData = {
        customer_id: 'invalid-customer-id',
        month: '2025-01',
        total_amount: 100.0,
      };

      await expect(
        prisma.monthlyBill.create({ data: monthlyBillData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid vendor_id', async () => {
      const monthlyBillData = {
        vendor_id: 'invalid-vendor-id',
        month: '2025-01',
        total_amount: 100.0,
      };

      await expect(
        prisma.monthlyBill.create({ data: monthlyBillData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Read', () => {
    let monthlyBillId: string;

    beforeEach(async () => {
      const monthlyBill = await prisma.monthlyBill.create({
        data: {
          month: '2025-03',
          total_amount: 400.0,
        },
      });
      monthlyBillId = monthlyBill.id;
    });

    it('should find many monthlyBills', async () => {
      const monthlyBills = await prisma.monthlyBill.findMany();

      expect(monthlyBills).toHaveLength(1);
      expect(monthlyBills[0].month).toBe('2025-03');
    });

    it('should find unique monthlyBill by id', async () => {
      const monthlyBill = await prisma.monthlyBill.findUnique({
        where: { id: monthlyBillId },
      });

      expect(monthlyBill).toBeTruthy();
      expect(monthlyBill?.month).toBe('2025-03');
    });
  });

  describe('Update', () => {
    let monthlyBillId: string;

    beforeEach(async () => {
      const monthlyBill = await prisma.monthlyBill.create({
        data: {
          month: '2025-04',
          total_amount: 600.0,
          status: 'PENDING' as any,
        },
      });
      monthlyBillId = monthlyBill.id;
    });

    it('should update total_amount', async () => {
      const updatedMonthlyBill = await prisma.monthlyBill.update({
        where: { id: monthlyBillId },
        data: { total_amount: 700.0 },
      });

      expect(updatedMonthlyBill.total_amount).toBe(700.0);
    });

    it('should update status', async () => {
      const updatedMonthlyBill = await prisma.monthlyBill.update({
        where: { id: monthlyBillId },
        data: { status: 'PAID' as any },
      });

      expect(updatedMonthlyBill.status).toBe('PAID');
    });

    it('should throw error for null month on update', async () => {
      await expect(
        prisma.monthlyBill.update({
          where: { id: monthlyBillId },
          data: { month: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null total_amount on update', async () => {
      await expect(
        prisma.monthlyBill.update({
          where: { id: monthlyBillId },
          data: { total_amount: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let monthlyBillId: string;

    beforeEach(async () => {
      const monthlyBill = await prisma.monthlyBill.create({
        data: {
          month: '2025-05',
          total_amount: 250.0,
        },
      });
      monthlyBillId = monthlyBill.id;
    });

    it('should delete monthlyBill', async () => {
      const deletedMonthlyBill = await prisma.monthlyBill.delete({
        where: { id: monthlyBillId },
      });

      expect(deletedMonthlyBill.month).toBe('2025-05');

      const monthlyBills = await prisma.monthlyBill.findMany();
      expect(monthlyBills).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.monthlyBill.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
