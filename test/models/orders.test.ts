import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('Orders CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up orders table before each test
    await prisma.order.deleteMany();
    // Clean up related tables
    await prisma.vendorProduct.deleteMany();
    await prisma.customerAddress.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.city.deleteMany();
  });

  describe('Create', () => {
    it('should create an order with valid data', async () => {
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

      const customerAddress = await prisma.customerAddress.create({
        data: {
          customer_id: customer.id,
        },
      });

      const vendorProduct = await prisma.vendorProduct.create({
        data: {
          vendor_id: vendor.id,
          name: 'Test Product',
          price: 100.0,
        },
      });

      const orderData = {
        customer_id: customer.id,
        vendor_id: vendor.id,
        address_id: customerAddress.id,
        product_id: vendorProduct.id,
        qty: 2,
        total_amount: 200.0,
        status: 'PENDING' as any,
        assigned_rider_phone: '1111111111',
        delivery_address: { street: '123 Main St' },
      };

      const order = await prisma.order.create({ data: orderData });

      expect(order).toHaveProperty('id');
      expect(order.customer_id).toBe(customer.id);
      expect(order.vendor_id).toBe(vendor.id);
      expect(order.address_id).toBe(customerAddress.id);
      expect(order.product_id).toBe(vendorProduct.id);
      expect(order.qty).toBe(2);
      expect(order.total_amount).toBe(200.0);
      expect(order.status).toBe('PENDING');
      expect(order.assigned_rider_phone).toBe('1111111111');
      expect(order.delivery_address).toEqual({ street: '123 Main St' });
      expect(order.created_at).toBeInstanceOf(Date);
      expect(order.updated_at).toBeInstanceOf(Date);
    });

    it('should create an order with minimal data', async () => {
      const orderData = {
        qty: 1,
        total_amount: 50.0,
      };

      const order = await prisma.order.create({ data: orderData });

      expect(order).toHaveProperty('id');
      expect(order.qty).toBe(1);
      expect(order.total_amount).toBe(50.0);
      expect(order.status).toBe('PENDING');
      expect(order.customer_id).toBeNull();
      expect(order.vendor_id).toBeNull();
      expect(order.address_id).toBeNull();
      expect(order.product_id).toBeNull();
      expect(order.assigned_rider_phone).toBeNull();
      expect(order.delivery_address).toBeNull();
    });

    it('should throw error for null qty', async () => {
      const orderData = {
        qty: null as any,
        total_amount: 100.0,
      };

      await expect(prisma.order.create({ data: orderData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for null total_amount', async () => {
      const orderData = {
        qty: 1,
        total_amount: null as any,
      };

      await expect(prisma.order.create({ data: orderData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for invalid customer_id', async () => {
      const orderData = {
        customer_id: 'invalid-customer-id',
        qty: 1,
        total_amount: 100.0,
      };

      await expect(prisma.order.create({ data: orderData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for invalid vendor_id', async () => {
      const orderData = {
        vendor_id: 'invalid-vendor-id',
        qty: 1,
        total_amount: 100.0,
      };

      await expect(prisma.order.create({ data: orderData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for invalid address_id', async () => {
      const orderData = {
        address_id: 'invalid-address-id',
        qty: 1,
        total_amount: 100.0,
      };

      await expect(prisma.order.create({ data: orderData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for invalid product_id', async () => {
      const orderData = {
        product_id: 'invalid-product-id',
        qty: 1,
        total_amount: 100.0,
      };

      await expect(prisma.order.create({ data: orderData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });
  });

  describe('Read', () => {
    let orderId: string;

    beforeEach(async () => {
      const order = await prisma.order.create({
        data: {
          qty: 1,
          total_amount: 100.0,
        },
      });
      orderId = order.id;
    });

    it('should find many orders', async () => {
      const orders = await prisma.order.findMany();

      expect(orders).toHaveLength(1);
      expect(orders[0].qty).toBe(1);
    });

    it('should find unique order by id', async () => {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      expect(order).toBeTruthy();
      expect(order?.qty).toBe(1);
    });
  });

  describe('Update', () => {
    let orderId: string;

    beforeEach(async () => {
      const order = await prisma.order.create({
        data: {
          qty: 1,
          total_amount: 100.0,
          status: 'PENDING' as any,
        },
      });
      orderId = order.id;
    });

    it('should update order qty', async () => {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { qty: 2 },
      });

      expect(updatedOrder.qty).toBe(2);
    });

    it('should update status', async () => {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED' as any },
      });

      expect(updatedOrder.status).toBe('CONFIRMED');
    });

    it('should throw error for null qty on update', async () => {
      await expect(
        prisma.order.update({
          where: { id: orderId },
          data: { qty: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null total_amount on update', async () => {
      await expect(
        prisma.order.update({
          where: { id: orderId },
          data: { total_amount: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let orderId: string;

    beforeEach(async () => {
      const order = await prisma.order.create({
        data: {
          qty: 1,
          total_amount: 100.0,
        },
      });
      orderId = order.id;
    });

    it('should delete order', async () => {
      const deletedOrder = await prisma.order.delete({
        where: { id: orderId },
      });

      expect(deletedOrder.qty).toBe(1);

      const orders = await prisma.order.findMany();
      expect(orders).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.order.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
