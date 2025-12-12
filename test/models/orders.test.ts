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
    await prisma.product.deleteMany();
    await prisma.customerAddress.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.city.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.categories.deleteMany();
  });

  describe('Create', () => {
    it('should create an order with valid data', async () => {
      // Create related entities
      const city = await prisma.city.create({
        data: {
          name: 'Test City',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
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
          cityId: city.id,
        },
      });

      const customerAddress = await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
        },
      });

      const product = await prisma.product.create({
        data: {
          vendorId: vendor.id,
          name: 'Test Product',
          categoryId: category.id,
          price: 100.0,
        },
      });

      const orderData = {
        customer_id: customer.id,
        vendor_id: vendor.id,
        address_id: customerAddress.id,
        product_id: product.id,
        qty: 2,
        total_amount: 200.0,
        status: 'PENDING',
        assigned_rider_phone: '1111111111',
      };

      const order = await prisma.order.create({ data: orderData });

      expect(order).toHaveProperty('id');
      expect(order.customer_id).toBe(customer.id);
      expect(order.vendor_id).toBe(vendor.id);
      expect(order.address_id).toBe(customerAddress.id);
      expect(order.product_id).toBe(product.id);
      expect(order.qty).toBe(2);
      expect(order.total_amount).toBe(200.0);
      expect(order.status).toBe('PENDING');
      expect(order.assigned_rider_phone).toBe('1111111111');
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

    it('should throw error for negative qty', async () => {
      const orderData = {
        qty: -1,
        total_amount: 100.0,
      };

      await expect(prisma.order.create({ data: orderData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for zero qty', async () => {
      const orderData = {
        qty: 0,
        total_amount: 100.0,
      };

      await expect(prisma.order.create({ data: orderData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for negative total_amount', async () => {
      const orderData = {
        qty: 1,
        total_amount: -100.0,
      };

      await expect(prisma.order.create({ data: orderData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should create order with valid status', async () => {
      const orderData = {
        qty: 1,
        total_amount: 100.0,
        status: 'CONFIRMED',
      };

      const order = await prisma.order.create({ data: orderData });

      expect(order.status).toBe('CONFIRMED');
    });

    it('should create order with valid payment_status', async () => {
      const orderData = {
        qty: 1,
        total_amount: 100.0,
        payment_status: 'COMPLETED',
      };

      const order = await prisma.order.create({ data: orderData });

      expect(order.payment_status).toBe('COMPLETED');
    });

    it('should throw error for invalid status', async () => {
      const orderData = {
        qty: 1,
        total_amount: 100.0,
        status: 'INVALID_STATUS' as any,
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

    it('should throw error for negative qty on update', async () => {
      await expect(
        prisma.order.update({
          where: { id: orderId },
          data: { qty: -1 },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for zero qty on update', async () => {
      await expect(
        prisma.order.update({
          where: { id: orderId },
          data: { qty: 0 },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for negative total_amount on update', async () => {
      await expect(
        prisma.order.update({
          where: { id: orderId },
          data: { total_amount: -100.0 },
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

  describe('Relationships', () => {
    it('should fetch order with customer', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const order = await prisma.order.create({
        data: {
          customer_id: customer.id,
          qty: 1,
          total_amount: 100.0,
        },
      });

      const fetchedOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { customer: true },
      });

      expect(fetchedOrder?.customer?.name).toBe('Test Customer');
    });

    it('should fetch order with vendor', async () => {
      const city = await prisma.city.create({
        data: { name: 'Test City' },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '0987654321',
          cityId: city.id,
        },
      });

      const order = await prisma.order.create({
        data: {
          vendor_id: vendor.id,
          qty: 1,
          total_amount: 100.0,
        },
      });

      const fetchedOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { vendor: true },
      });

      expect(fetchedOrder?.vendor?.name).toBe('Test Vendor');
    });

    it('should fetch order with address', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const address = await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
        },
      });

      const order = await prisma.order.create({
        data: {
          address_id: address.id,
          qty: 1,
          total_amount: 100.0,
        },
      });

      const fetchedOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { address: true },
      });

      expect(fetchedOrder?.address?.id).toBe(address.id);
    });

    it('should fetch order with product', async () => {
      const city = await prisma.city.create({
        data: { name: 'Test City' },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '0987654321',
          cityId: city.id,
        },
      });

      const category = await prisma.categories.create({
        data: { name: 'Test Category' },
      });

      const product = await prisma.product.create({
        data: {
          vendorId: vendor.id,
          name: 'Test Product',
          categoryId: category.id,
          price: 100.0,
        },
      });

      const order = await prisma.order.create({
        data: {
          product_id: product.id,
          qty: 1,
          total_amount: 100.0,
        },
      });

      const fetchedOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { product: true },
      });

      expect(fetchedOrder?.product?.name).toBe('Test Product');
    });

    it('should fetch order with payments', async () => {
      const order = await prisma.order.create({
        data: {
          qty: 1,
          total_amount: 100.0,
        },
      });

      const payment = await prisma.payment.create({
        data: {
          order_id: order.id,
          amount: 100.0,
          payment_mode: 'CASH',
        },
      });

      const fetchedOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { payments: true },
      });

      expect(fetchedOrder?.payments).toHaveLength(1);
      expect(fetchedOrder?.payments[0].id).toBe(payment.id);
    });

    it('should verify bidirectional relation with customer', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const order = await prisma.order.create({
        data: {
          customer_id: customer.id,
          qty: 1,
          total_amount: 100.0,
        },
      });

      const fetchedCustomer = await prisma.customer.findUnique({
        where: { id: customer.id },
        include: { orders: true },
      });

      expect(fetchedCustomer?.orders).toHaveLength(1);
      expect(fetchedCustomer?.orders[0].id).toBe(order.id);
    });

    it('should verify bidirectional relation with vendor', async () => {
      const city = await prisma.city.create({
        data: { name: 'Test City' },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '0987654321',
          cityId: city.id,
        },
      });

      const order = await prisma.order.create({
        data: {
          vendor_id: vendor.id,
          qty: 1,
          total_amount: 100.0,
        },
      });

      const fetchedVendor = await prisma.vendor.findUnique({
        where: { id: vendor.id },
        include: { orders: true },
      });

      expect(fetchedVendor?.orders).toHaveLength(1);
      expect(fetchedVendor?.orders[0].id).toBe(order.id);
    });

    it('should verify bidirectional relation with address', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const address = await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
        },
      });

      const order = await prisma.order.create({
        data: {
          address_id: address.id,
          qty: 1,
          total_amount: 100.0,
        },
      });

      const fetchedAddress = await prisma.customerAddress.findUnique({
        where: { id: address.id },
        include: { orders: true },
      });

      expect(fetchedAddress?.orders).toHaveLength(1);
      expect(fetchedAddress?.orders[0].id).toBe(order.id);
    });

    it('should verify bidirectional relation with product', async () => {
      const city = await prisma.city.create({
        data: { name: 'Test City' },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '0987654321',
          cityId: city.id,
        },
      });

      const category = await prisma.categories.create({
        data: { name: 'Test Category' },
      });

      const product = await prisma.product.create({
        data: {
          vendorId: vendor.id,
          name: 'Test Product',
          categoryId: category.id,
          price: 100.0,
        },
      });

      const order = await prisma.order.create({
        data: {
          product_id: product.id,
          qty: 1,
          total_amount: 100.0,
        },
      });

      const fetchedProduct = await prisma.product.findUnique({
        where: { id: product.id },
        include: { orders: true },
      });

      expect(fetchedProduct?.orders).toHaveLength(1);
      expect(fetchedProduct?.orders[0].id).toBe(order.id);
    });
  });
});
