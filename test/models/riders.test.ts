import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('Riders CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up riders table before each test
    await prisma.rider.deleteMany();
  });

  describe('Create', () => {
    it('should create a rider with valid data', async () => {
      const riderData = {
        name: 'Test Rider',
        phone: '+1234567890',
        email: 'test@example.com',
        address: '123 Main St',
      };

      const rider = await prisma.rider.create({ data: riderData });

      expect(rider).toHaveProperty('id');
      expect(rider.name).toBe('Test Rider');
      expect(rider.phone).toBe('+1234567890');
      expect(rider.email).toBe('test@example.com');
      expect(rider.address).toBe('123 Main St');
      expect(rider.created_at).toBeInstanceOf(Date);
      expect(rider.updated_at).toBeInstanceOf(Date);
    });

    it('should create a rider with minimal data', async () => {
      const riderData = {
        name: 'Minimal Rider',
        phone: '+0987654321',
      };

      const rider = await prisma.rider.create({ data: riderData });

      expect(rider).toHaveProperty('id');
      expect(rider.name).toBe('Minimal Rider');
      expect(rider.phone).toBe('+0987654321');
      expect(rider.email).toBeNull();
      expect(rider.address).toBeNull();
    });

    it('should throw error for null name', async () => {
      const riderData = {
        name: null as any,
        phone: '+1234567890',
      };

      await expect(
        prisma.rider.create({ data: riderData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null phone', async () => {
      const riderData = {
        name: 'Test Rider',
        phone: null as any,
      };

      await expect(
        prisma.rider.create({ data: riderData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for duplicate phone', async () => {
      await prisma.rider.create({
        data: {
          name: 'First Rider',
          phone: '+1234567890',
        },
      });

      const riderData = {
        name: 'Second Rider',
        phone: '+1234567890', // duplicate
      };

      await expect(
        prisma.rider.create({ data: riderData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Read', () => {
    let riderId: string;

    beforeEach(async () => {
      const rider = await prisma.rider.create({
        data: {
          name: 'Test Rider',
          phone: '+1234567890',
        },
      });
      riderId = rider.id;
    });

    it('should find many riders', async () => {
      const riders = await prisma.rider.findMany();

      expect(riders).toHaveLength(1);
      expect(riders[0].name).toBe('Test Rider');
    });

    it('should find unique rider by id', async () => {
      const rider = await prisma.rider.findUnique({
        where: { id: riderId },
      });

      expect(rider).toBeTruthy();
      expect(rider?.name).toBe('Test Rider');
    });

    it('should find unique rider by phone', async () => {
      const rider = await prisma.rider.findUnique({
        where: { phone: '+1234567890' },
      });

      expect(rider).toBeTruthy();
      expect(rider?.name).toBe('Test Rider');
    });
  });

  describe('Update', () => {
    let riderId: string;

    beforeEach(async () => {
      const rider = await prisma.rider.create({
        data: {
          name: 'Update Rider',
          phone: '+1234567890',
        },
      });
      riderId = rider.id;
    });

    it('should update rider name', async () => {
      const updatedRider = await prisma.rider.update({
        where: { id: riderId },
        data: { name: 'Updated Rider' },
      });

      expect(updatedRider.name).toBe('Updated Rider');
    });

    it('should update phone to unique value', async () => {
      const updatedRider = await prisma.rider.update({
        where: { id: riderId },
        data: { phone: '+0987654321' },
      });

      expect(updatedRider.phone).toBe('+0987654321');
    });

    it('should throw error for null name on update', async () => {
      await expect(
        prisma.rider.update({
          where: { id: riderId },
          data: { name: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null phone on update', async () => {
      await expect(
        prisma.rider.update({
          where: { id: riderId },
          data: { phone: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for duplicate phone on update', async () => {
      await prisma.rider.create({
        data: {
          name: 'Another Rider',
          phone: '+0987654321',
        },
      });

      await expect(
        prisma.rider.update({
          where: { id: riderId },
          data: { phone: '+0987654321' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let riderId: string;

    beforeEach(async () => {
      const rider = await prisma.rider.create({
        data: {
          name: 'Delete Rider',
          phone: '+1234567890',
        },
      });
      riderId = rider.id;
    });

    it('should delete rider', async () => {
      const deletedRider = await prisma.rider.delete({
        where: { id: riderId },
      });

      expect(deletedRider.name).toBe('Delete Rider');

      const riders = await prisma.rider.findMany();
      expect(riders).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.rider.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});