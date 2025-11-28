import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('CustomerAddresses CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up customerAddresses table before each test
    await prisma.customerAddress.deleteMany();
    // Clean up customers and cities as customerAddresses depend on them
    await prisma.customer.deleteMany();
    await prisma.city.deleteMany();
  });

  describe('Create', () => {
    it('should create a customerAddress with valid data', async () => {
      // Create a test customer
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      // Create a test city
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });

      const customerAddressData = {
        customer_id: customer.id,
        label: 'Home',
        address: '123 Main St',
        city_id: city.id,
        location: 'POINT(0 0)' as any,
        pincode: '123456',
      };

      const customerAddress = await prisma.customerAddress.create({
        data: customerAddressData,
      });

      expect(customerAddress).toHaveProperty('id');
      expect(customerAddress.customer_id).toBe(customer.id);
      expect(customerAddress.label).toBe('Home');
      expect(customerAddress.address).toBe('123 Main St');
      expect(customerAddress.city_id).toBe(city.id);
      expect(customerAddress.location).toBe('POINT(0 0)');
      expect(customerAddress.pincode).toBe('123456');
      expect(customerAddress.created_at).toBeInstanceOf(Date);
    });

    it('should create a customerAddress with minimal data', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const customerAddressData = {
        customer_id: customer.id,
      };

      const customerAddress = await prisma.customerAddress.create({
        data: customerAddressData,
      });

      expect(customerAddress).toHaveProperty('id');
      expect(customerAddress.customer_id).toBe(customer.id);
      expect(customerAddress.label).toBeNull();
      expect(customerAddress.address).toBeNull();
      expect(customerAddress.city_id).toBeNull();
      expect(customerAddress.location).toBeNull();
      expect(customerAddress.pincode).toBeNull();
    });

    it('should throw error for null customer_id', async () => {
      const customerAddressData = {
        customer_id: null as any,
      };

      await expect(
        prisma.customerAddress.create({ data: customerAddressData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid customer_id (foreign key violation)', async () => {
      const customerAddressData = {
        customer_id: 'invalid-customer-id',
      };

      await expect(
        prisma.customerAddress.create({ data: customerAddressData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid city_id (foreign key violation)', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const customerAddressData = {
        customer_id: customer.id,
        city_id: 'invalid-city-id',
      };

      await expect(
        prisma.customerAddress.create({ data: customerAddressData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid location geometry', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const customerAddressData = {
        customer_id: customer.id,
        location: 'INVALID_GEOMETRY' as any,
      };

      await expect(
        prisma.customerAddress.create({ data: customerAddressData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Read', () => {
    let customerAddressId: string;

    beforeEach(async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const customerAddress = await prisma.customerAddress.create({
        data: {
          customer_id: customer.id,
          label: 'Home',
        },
      });
      customerAddressId = customerAddress.id;
    });

    it('should find many customerAddresses', async () => {
      const customerAddresses = await prisma.customerAddress.findMany();

      expect(customerAddresses).toHaveLength(1);
      expect(customerAddresses[0].label).toBe('Home');
    });

    it('should find unique customerAddress by id', async () => {
      const customerAddress = await prisma.customerAddress.findUnique({
        where: { id: customerAddressId },
      });

      expect(customerAddress).toBeTruthy();
      expect(customerAddress?.label).toBe('Home');
    });
  });

  describe('Update', () => {
    let customerAddressId: string;
    let customerId: string;
    let cityId: string;

    beforeEach(async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });
      customerId = customer.id;

      const city = await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });
      cityId = city.id;

      const customerAddress = await prisma.customerAddress.create({
        data: {
          customer_id: customerId,
          label: 'Update Address',
        },
      });
      customerAddressId = customerAddress.id;
    });

    it('should update customerAddress label', async () => {
      const updatedCustomerAddress = await prisma.customerAddress.update({
        where: { id: customerAddressId },
        data: { label: 'Updated Label' },
      });

      expect(updatedCustomerAddress.label).toBe('Updated Label');
    });

    it('should update city_id', async () => {
      const updatedCustomerAddress = await prisma.customerAddress.update({
        where: { id: customerAddressId },
        data: { city_id: cityId },
      });

      expect(updatedCustomerAddress.city_id).toBe(cityId);
    });

    it('should throw error for null customer_id on update', async () => {
      await expect(
        prisma.customerAddress.update({
          where: { id: customerAddressId },
          data: { customer_id: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid customer_id on update', async () => {
      await expect(
        prisma.customerAddress.update({
          where: { id: customerAddressId },
          data: { customer_id: 'invalid-customer-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid city_id on update', async () => {
      await expect(
        prisma.customerAddress.update({
          where: { id: customerAddressId },
          data: { city_id: 'invalid-city-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid location geometry on update', async () => {
      await expect(
        prisma.customerAddress.update({
          where: { id: customerAddressId },
          data: { location: 'INVALID' as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let customerAddressId: string;

    beforeEach(async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const customerAddress = await prisma.customerAddress.create({
        data: {
          customer_id: customer.id,
          label: 'Delete Address',
        },
      });
      customerAddressId = customerAddress.id;
    });

    it('should delete customerAddress', async () => {
      const deletedCustomerAddress = await prisma.customerAddress.delete({
        where: { id: customerAddressId },
      });

      expect(deletedCustomerAddress.label).toBe('Delete Address');

      const customerAddresses = await prisma.customerAddress.findMany();
      expect(customerAddresses).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.customerAddress.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
