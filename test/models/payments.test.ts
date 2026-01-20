import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('Payments CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up payments table before each test
    await prisma.payment.deleteMany();
    // Clean up related tables
    await prisma.monthlyBill.deleteMany();
    await prisma.order.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.city.deleteMany();
  });

  describe('Create', () => {
    it('should create a payment with valid data', async () => {
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

      const order = await prisma.order.create({
        data: {
          customer_id: customer.id,
          vendor_id: vendor.id,
          qty: 1,
          total_amount: 100.0,
        },
      });

      const paymentData = {
        order_id: order.id,
        amount: 100.0,
        currency: 'INR',
        payment_mode: 'card',
        provider: 'stripe',
        provider_payment_id: 'pi_123',
        provider_payload: { key: 'value' },
        status: 'COMPLETED' as any,
        completed_at: new Date(),
        reconciled: true,
        metadata: { note: 'Test payment' },
      };

      const payment = await prisma.payment.create({ data: paymentData });

      expect(payment).toHaveProperty('id');
      expect(payment.order_id).toBe(order.id);
      expect(payment.amount).toBe(100.0);
      expect(payment.currency).toBe('INR');
      expect(payment.payment_mode).toBe('card');
      expect(payment.provider).toBe('stripe');
      expect(payment.provider_payment_id).toBe('pi_123');
      expect(payment.provider_payload).toEqual({ key: 'value' });
      expect(payment.status).toBe('COMPLETED');
      expect(payment.completed_at).toBeInstanceOf(Date);
      expect(payment.reconciled).toBe(true);
      expect(payment.metadata).toEqual({ note: 'Test payment' });
      expect(payment.initiated_at).toBeInstanceOf(Date);
      expect(payment.created_at).toBeInstanceOf(Date);
      expect(payment.updated_at).toBeInstanceOf(Date);
    });

    it('should create a payment with minimal data', async () => {
      const paymentData = {
        amount: 50.0,
        payment_mode: 'cash',
      };

      const payment = await prisma.payment.create({ data: paymentData });

      expect(payment).toHaveProperty('id');
      expect(payment.amount).toBe(50.0);
      expect(payment.payment_mode).toBe('cash');
      expect(payment.currency).toBe('INR');
      expect(payment.status).toBe('PENDING');
      expect(payment.reconciled).toBe(false);
      expect(payment.order_id).toBeNull();
      expect(payment.provider).toBeNull();
      expect(payment.provider_payment_id).toBeNull();
      expect(payment.provider_payload).toBeNull();
      expect(payment.completed_at).toBeNull();
      expect(payment.metadata).toBeNull();
    });

    it('should throw error for null amount', async () => {
      const paymentData = {
        amount: null as any,
        payment_mode: 'card',
      };

      await expect(
        prisma.payment.create({ data: paymentData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null payment_mode', async () => {
      const paymentData = {
        amount: 100.0,
        payment_mode: null as any,
      };

      await expect(
        prisma.payment.create({ data: paymentData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid order_id', async () => {
      const paymentData = {
        order_id: 'invalid-order-id',
        amount: 100.0,
        payment_mode: 'card',
      };

      await expect(
        prisma.payment.create({ data: paymentData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Read', () => {
    let paymentId: string;

    beforeEach(async () => {
      const payment = await prisma.payment.create({
        data: {
          amount: 75.0,
          payment_mode: 'upi',
        },
      });
      paymentId = payment.id;
    });

    it('should find many payments', async () => {
      const payments = await prisma.payment.findMany();

      expect(payments).toHaveLength(1);
      expect(payments[0].amount).toBe(75.0);
    });

    it('should find unique payment by id', async () => {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      expect(payment).toBeTruthy();
      expect(payment?.amount).toBe(75.0);
    });
  });

  describe('Update', () => {
    let paymentId: string;

    beforeEach(async () => {
      const payment = await prisma.payment.create({
        data: {
          amount: 200.0,
          payment_mode: 'netbanking',
          status: 'PENDING' as any,
        },
      });
      paymentId = payment.id;
    });

    it('should update amount', async () => {
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: { amount: 250.0 },
      });

      expect(updatedPayment.amount).toBe(250.0);
    });

    it('should update status', async () => {
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'COMPLETED' as any },
      });

      expect(updatedPayment.status).toBe('COMPLETED');
    });

    it('should throw error for null amount on update', async () => {
      await expect(
        prisma.payment.update({
          where: { id: paymentId },
          data: { amount: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null payment_mode on update', async () => {
      await expect(
        prisma.payment.update({
          where: { id: paymentId },
          data: { payment_mode: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let paymentId: string;

    beforeEach(async () => {
      const payment = await prisma.payment.create({
        data: {
          amount: 125.0,
          payment_mode: 'wallet',
        },
      });
      paymentId = payment.id;
    });

    it('should delete payment', async () => {
      const deletedPayment = await prisma.payment.delete({
        where: { id: paymentId },
      });

      expect(deletedPayment.amount).toBe(125.0);

      const payments = await prisma.payment.findMany();
      expect(payments).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.payment.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
