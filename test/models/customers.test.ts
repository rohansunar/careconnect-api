import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('Customers CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up customers table before each test
    await prisma.customer.deleteMany();
  });

  describe('Create', () => {
    it('should create a customer with valid data', async () => {
      const customerData = {
        name: 'Test Customer',
        phone: '1234567890',
        email: 'test@example.com',
        address: { street: '123 Main St' },
        city: 'Test City',
        pincode: '123456',
        location: 'POINT(0 0)' as any,
      };

      const customer = await prisma.customer.create({ data: customerData });

      expect(customer).toHaveProperty('id');
      expect(customer.name).toBe('Test Customer');
      expect(customer.phone).toBe('1234567890');
      expect(customer.email).toBe('test@example.com');
      expect(customer.address).toEqual({ street: '123 Main St' });
      expect(customer.city).toBe('Test City');
      expect(customer.pincode).toBe('123456');
      expect(customer.location).toBe('POINT(0 0)');
      expect(customer.created_at).toBeInstanceOf(Date);
      expect(customer.updated_at).toBeInstanceOf(Date);
    });

    it('should create a customer with minimal data', async () => {
      const customerData = {
        name: 'Minimal Customer',
        phone: '0987654321',
      };

      const customer = await prisma.customer.create({ data: customerData });

      expect(customer).toHaveProperty('id');
      expect(customer.name).toBe('Minimal Customer');
      expect(customer.phone).toBe('0987654321');
      expect(customer.email).toBeNull();
      expect(customer.address).toBeNull();
      expect(customer.city).toBeNull();
      expect(customer.pincode).toBeNull();
      expect(customer.location).toBeNull();
    });

    it('should throw error for null name', async () => {
      const customerData = {
        name: null as any,
        phone: '1234567890',
      };

      await expect(
        prisma.customer.create({ data: customerData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null phone', async () => {
      const customerData = {
        name: 'Test Customer',
        phone: null as any,
      };

      await expect(
        prisma.customer.create({ data: customerData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for duplicate phone', async () => {
      await prisma.customer.create({
        data: {
          name: 'First Customer',
          phone: '1234567890',
        },
      });

      const customerData = {
        name: 'Second Customer',
        phone: '1234567890', // duplicate
      };

      await expect(
        prisma.customer.create({ data: customerData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Read', () => {
    let customerId: string;

    beforeEach(async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });
      customerId = customer.id;
    });

    it('should find many customers', async () => {
      const customers = await prisma.customer.findMany();

      expect(customers).toHaveLength(1);
      expect(customers[0].name).toBe('Test Customer');
    });

    it('should find unique customer by id', async () => {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      expect(customer).toBeTruthy();
      expect(customer?.name).toBe('Test Customer');
    });
  });

  describe('Update', () => {
    let customerId: string;

    beforeEach(async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Update Customer',
          phone: '1234567890',
        },
      });
      customerId = customer.id;
    });

    it('should update customer name', async () => {
      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: { name: 'Updated Customer' },
      });

      expect(updatedCustomer.name).toBe('Updated Customer');
    });

    it('should update phone to unique value', async () => {
      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: { phone: '0987654321' },
      });

      expect(updatedCustomer.phone).toBe('0987654321');
    });

    it('should throw error for null name on update', async () => {
      await expect(
        prisma.customer.update({
          where: { id: customerId },
          data: { name: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null phone on update', async () => {
      await expect(
        prisma.customer.update({
          where: { id: customerId },
          data: { phone: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for duplicate phone on update', async () => {
      await prisma.customer.create({
        data: {
          name: 'Another Customer',
          phone: '0987654321',
        },
      });

      await expect(
        prisma.customer.update({
          where: { id: customerId },
          data: { phone: '0987654321' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let customerId: string;

    beforeEach(async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Delete Customer',
          phone: '1234567890',
        },
      });
      customerId = customer.id;
    });

    it('should delete customer', async () => {
      const deletedCustomer = await prisma.customer.delete({
        where: { id: customerId },
      });

      expect(deletedCustomer.name).toBe('Delete Customer');

      const customers = await prisma.customer.findMany();
      expect(customers).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.customer.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
