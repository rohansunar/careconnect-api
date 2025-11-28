import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('PlatformFees CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up platformFees table before each test
    await prisma.platformFee.deleteMany();
  });

  describe('Create', () => {
    it('should create a platformFee with valid data', async () => {
      const platformFeeData = {
        related_type: 'order',
        related_id: 'order-123',
        amount: 10.5,
        fee_type: 'processing',
        collected: true,
        note: 'Processing fee for order',
        collected_at: new Date(),
      };

      const platformFee = await prisma.platformFee.create({
        data: platformFeeData,
      });

      expect(platformFee).toHaveProperty('id');
      expect(platformFee.related_type).toBe('order');
      expect(platformFee.related_id).toBe('order-123');
      expect(platformFee.amount).toBe(10.5);
      expect(platformFee.fee_type).toBe('processing');
      expect(platformFee.collected).toBe(true);
      expect(platformFee.note).toBe('Processing fee for order');
      expect(platformFee.collected_at).toBeInstanceOf(Date);
      expect(platformFee.created_at).toBeInstanceOf(Date);
    });

    it('should create a platformFee with minimal data', async () => {
      const platformFeeData = {
        related_type: 'payment',
        related_id: 'payment-456',
        amount: 5.0,
      };

      const platformFee = await prisma.platformFee.create({
        data: platformFeeData,
      });

      expect(platformFee).toHaveProperty('id');
      expect(platformFee.related_type).toBe('payment');
      expect(platformFee.related_id).toBe('payment-456');
      expect(platformFee.amount).toBe(5.0);
      expect(platformFee.collected).toBe(false);
      expect(platformFee.fee_type).toBeNull();
      expect(platformFee.note).toBeNull();
      expect(platformFee.collected_at).toBeNull();
    });

    it('should throw error for null related_type', async () => {
      const platformFeeData = {
        related_type: null as any,
        related_id: 'test-id',
        amount: 10.0,
      };

      await expect(
        prisma.platformFee.create({ data: platformFeeData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null related_id', async () => {
      const platformFeeData = {
        related_type: 'test',
        related_id: null as any,
        amount: 10.0,
      };

      await expect(
        prisma.platformFee.create({ data: platformFeeData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null amount', async () => {
      const platformFeeData = {
        related_type: 'test',
        related_id: 'test-id',
        amount: null as any,
      };

      await expect(
        prisma.platformFee.create({ data: platformFeeData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Read', () => {
    let platformFeeId: string;

    beforeEach(async () => {
      const platformFee = await prisma.platformFee.create({
        data: {
          related_type: 'subscription',
          related_id: 'sub-789',
          amount: 15.0,
        },
      });
      platformFeeId = platformFee.id;
    });

    it('should find many platformFees', async () => {
      const platformFees = await prisma.platformFee.findMany();

      expect(platformFees).toHaveLength(1);
      expect(platformFees[0].related_type).toBe('subscription');
    });

    it('should find unique platformFee by id', async () => {
      const platformFee = await prisma.platformFee.findUnique({
        where: { id: platformFeeId },
      });

      expect(platformFee).toBeTruthy();
      expect(platformFee?.related_type).toBe('subscription');
    });
  });

  describe('Update', () => {
    let platformFeeId: string;

    beforeEach(async () => {
      const platformFee = await prisma.platformFee.create({
        data: {
          related_type: 'bill',
          related_id: 'bill-101',
          amount: 20.0,
          collected: false,
        },
      });
      platformFeeId = platformFee.id;
    });

    it('should update amount', async () => {
      const updatedPlatformFee = await prisma.platformFee.update({
        where: { id: platformFeeId },
        data: { amount: 25.0 },
      });

      expect(updatedPlatformFee.amount).toBe(25.0);
    });

    it('should update collected status', async () => {
      const updatedPlatformFee = await prisma.platformFee.update({
        where: { id: platformFeeId },
        data: { collected: true },
      });

      expect(updatedPlatformFee.collected).toBe(true);
    });

    it('should throw error for null related_type on update', async () => {
      await expect(
        prisma.platformFee.update({
          where: { id: platformFeeId },
          data: { related_type: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null related_id on update', async () => {
      await expect(
        prisma.platformFee.update({
          where: { id: platformFeeId },
          data: { related_id: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null amount on update', async () => {
      await expect(
        prisma.platformFee.update({
          where: { id: platformFeeId },
          data: { amount: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let platformFeeId: string;

    beforeEach(async () => {
      const platformFee = await prisma.platformFee.create({
        data: {
          related_type: 'delete_test',
          related_id: 'delete-123',
          amount: 30.0,
        },
      });
      platformFeeId = platformFee.id;
    });

    it('should delete platformFee', async () => {
      const deletedPlatformFee = await prisma.platformFee.delete({
        where: { id: platformFeeId },
      });

      expect(deletedPlatformFee.related_type).toBe('delete_test');

      const platformFees = await prisma.platformFee.findMany();
      expect(platformFees).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.platformFee.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
