import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('CartItems CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up cartItems table before each test
    await (prisma as any).cartItem?.deleteMany();
    // Clean up related tables
    await prisma.customerAddress.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.product.deleteMany();
    await prisma.vendorAddress.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.categories.deleteMany();
  });

  describe('Create', () => {
    it('should create a cart item with valid data', async () => {
      // Create test dependencies
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 100.5,
          deposit: 10.0,
          is_active: true,
        },
      });

      const address = await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: 'Home',
        },
      });

      const cart = await prisma.cart.create({
        data: {
          customerId: customer.id,
        },
      });

      const cartItemData = {
        customerId: customer.id,
        productId: product.id,
        quantity: 2,
        addressId: address.id,
        price: product.price,
        deposit: product.deposit,
        cartId: cart.id,
      };

      const cartItem = await (prisma as any).cartItem.create({
        data: cartItemData,
      });

      expect(cartItem).toHaveProperty('id');
      expect(cartItem.customerId).toBe(customer.id);
      expect(cartItem.productId).toBe(product.id);
      expect(cartItem.quantity).toBe(2);
      expect(cartItem.addressId).toBe(address.id);
      expect(String(cartItem.price)).toBe('100.5');
      expect(String(cartItem.deposit)).toBe('10');
      expect(cartItem.createdAt).toBeInstanceOf(Date);
      expect(cartItem.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a cart item with minimal data (no address)', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 50.0,
        },
      });

      const cartItemData = {
        customerId: customer.id,
        productId: product.id,
        quantity: 1,
        price: product.price,
        deposit: product.deposit,
      };

      const cartItem = await (prisma as any).cartItem.create({
        data: cartItemData,
      });

      expect(cartItem).toHaveProperty('id');
      expect(cartItem.customerId).toBe(customer.id);
      expect(cartItem.productId).toBe(product.id);
      expect(cartItem.quantity).toBe(1);
      expect(cartItem.addressId).toBeNull();
      expect(String(cartItem.price)).toBe('50');
      expect(cartItem.deposit).toBeNull();
    });

    it('should default quantity to 1', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      const cartItem = await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          price: product.price,
          deposit: product.deposit,
        },
      });

      expect(cartItem.quantity).toBe(1);
    });

    it('should throw error for null customerId', async () => {
      const cartItemData = {
        customerId: null as any,
        productId: 'some-product-id',
        quantity: 1,
        price: 10.0,
      };

      await expect(
        (prisma as any).cartItem.create({ data: cartItemData }),
      ).rejects.toThrow(Prisma.PrismaClientValidationError);
    });

    it('should throw error for null productId', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const cartItemData = {
        customerId: customer.id,
        productId: null as any,
        quantity: 1,
        price: 10.0,
      };

      await expect(
        (prisma as any).cartItem.create({ data: cartItemData }),
      ).rejects.toThrow(Prisma.PrismaClientValidationError);
    });

    it('should throw error for invalid customerId (foreign key violation)', async () => {
      const cartItemData = {
        customerId: 'invalid-customer-id',
        productId: 'some-product-id',
        quantity: 1,
        price: 10.0,
      };

      await expect(
        (prisma as any).cartItem.create({ data: cartItemData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid productId (foreign key violation)', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const cartItemData = {
        customerId: customer.id,
        productId: 'invalid-product-id',
        quantity: 1,
        price: 10.0,
      };

      await expect(
        (prisma as any).cartItem.create({ data: cartItemData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid addressId (foreign key violation)', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      const cartItemData = {
        customerId: customer.id,
        productId: product.id,
        quantity: 1,
        addressId: 'invalid-address-id',
        price: product.price,
        deposit: product.deposit,
      };

      await expect(
        (prisma as any).cartItem.create({ data: cartItemData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should allow quantity = 0', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      const cartItemData = {
        customerId: customer.id,
        productId: product.id,
        quantity: 0,
        price: product.price,
        deposit: product.deposit,
      };

      const cartItem = await (prisma as any).cartItem.create({
        data: cartItemData,
      });

      expect(cartItem.quantity).toBe(0);
    });
  });

  describe('Unique Constraints', () => {
    it('should prevent duplicate cart items (same customer, product, address)', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      const address = await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: 'Home',
        },
      });

      // Create first cart item
      await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity: 1,
          addressId: address.id,
          price: product.price,
          deposit: product.deposit,
        },
      });

      // Try to create duplicate
      await expect(
        (prisma as any).cartItem.create({
          data: {
            customerId: customer.id,
            productId: product.id,
            quantity: 2,
            addressId: address.id,
            price: product.price,
            deposit: product.deposit,
          },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should allow same customer and product with different addresses', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      const address1 = await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: 'Home',
        },
      });

      const address2 = await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: 'Office',
        },
      });

      // Create first cart item
      const cartItem1 = await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity: 1,
          addressId: address1.id,
          price: product.price,
          deposit: product.deposit,
        },
      });

      // Create second cart item with different address
      const cartItem2 = await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity: 2,
          addressId: address2.id,
          price: product.price,
          deposit: product.deposit,
        },
      });

      expect(cartItem1.id).not.toBe(cartItem2.id);
      expect(cartItem1.addressId).toBe(address1.id);
      expect(cartItem2.addressId).toBe(address2.id);
    });

    it('should allow same customer and product with null address', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      const address = await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: 'Home',
        },
      });

      // Create first cart item with address
      const cartItem1 = await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity: 1,
          addressId: address.id,
          price: product.price,
          deposit: product.deposit,
        },
      });

      // Create second cart item with null address
      const cartItem2 = await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity: 2,
          price: product.price,
          deposit: product.deposit,
        },
      });

      expect(cartItem1.id).not.toBe(cartItem2.id);
      expect(cartItem1.addressId).toBe(address.id);
      expect(cartItem2.addressId).toBeNull();
    });
  });

  describe('Read', () => {
    let cartItemId: number;

    beforeEach(async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
          vendorNo: 'V00001',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      const cartItem = await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
          deposit: product.deposit,
        },
      });
      cartItemId = cartItem.id;
    });

    it('should find many cart items', async () => {
      const cartItems = await (prisma as any).cartItem.findMany();

      expect(cartItems).toHaveLength(1);
      expect(cartItems[0].quantity).toBe(1);
    });

    it('should find unique cart item by id', async () => {
      const cartItem = await (prisma as any).cartItem.findUnique({
        where: { id: cartItemId },
      });

      expect(cartItem).toBeTruthy();
      expect(cartItem?.quantity).toBe(1);
    });
  });

  describe('Update', () => {
    let cartItemId: number;

    beforeEach(async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
          vendorNo: 'V00001',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Update Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 30.0,
        },
      });

      const cartItem = await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
          deposit: product.deposit,
        },
      });
      cartItemId = cartItem.id;
    });

    it('should update cart item quantity', async () => {
      const updatedCartItem = await (prisma as any).cartItem.update({
        where: { id: cartItemId },
        data: { quantity: 5 },
      });

      expect(updatedCartItem.quantity).toBe(5);
      expect(updatedCartItem.updatedAt).toBeInstanceOf(Date);
    });

    it('should update addressId', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Another Customer',
          phone: '0987654321',
        },
      });

      const address = await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: 'New Address',
        },
      });

      const updatedCartItem = await (prisma as any).cartItem.update({
        where: { id: cartItemId },
        data: { addressId: address.id },
      });

      expect(updatedCartItem.addressId).toBe(address.id);
    });

    it('should allow quantity = 0 on update', async () => {
      const updatedCartItem = await (prisma as any).cartItem.update({
        where: { id: cartItemId },
        data: { quantity: 0 },
      });

      expect(updatedCartItem.quantity).toBe(0);
    });
  });

  describe('Delete', () => {
    let cartItemId: number;

    beforeEach(async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Delete Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 20.0,
        },
      });

      const cartItem = await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
          deposit: product.deposit,
        },
      });
      cartItemId = cartItem.id;
    });

    it('should delete cart item', async () => {
      const deletedCartItem = await (prisma as any).cartItem.delete({
        where: { id: cartItemId },
      });

      expect(deletedCartItem.quantity).toBe(1);

      const cartItems = await (prisma as any).cartItem.findMany();
      expect(cartItems).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        (prisma as any).cartItem.delete({
          where: { id: 99999 },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Relationships', () => {
    it('should include customer relation', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      const cartItem = await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
          deposit: product.deposit,
        },
      });

      const cartItemWithCustomer = await (prisma as any).cartItem.findUnique({
        where: { id: cartItem.id },
        include: { customer: true },
      });

      expect(cartItemWithCustomer?.customer?.name).toBe('Test Customer');
    });

    it('should include product relation', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      const cartItem = await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
          deposit: product.deposit,
        },
      });

      const cartItemWithProduct = await (prisma as any).cartItem.findUnique({
        where: { id: cartItem.id },
        include: { product: true },
      });

      expect(cartItemWithProduct?.product?.name).toBe('Test Product');
    });

    it('should include address relation when present', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      const address = await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: 'Home',
        },
      });

      const cartItem = await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity: 1,
          addressId: address.id,
          price: product.price,
          deposit: product.deposit,
        },
      });

      const cartItemWithAddress = await (prisma as any).cartItem.findUnique({
        where: { id: cartItem.id },
        include: { address: true },
      });

      expect(cartItemWithAddress?.address?.label).toBe('Home');
    });
  });

  describe('Cascade Delete', () => {
    it('should cascade delete when customer is deleted', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
          deposit: product.deposit,
        },
      });

      // Delete customer
      await prisma.customer.delete({
        where: { id: customer.id },
      });

      // Check that cart item is also deleted
      const cartItems = await (prisma as any).cartItem.findMany();
      expect(cartItems).toHaveLength(0);
    });

    it('should cascade delete when product is deleted', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
          deposit: product.deposit,
        },
      });

      // Delete product
      await prisma.product.delete({
        where: { id: product.id },
      });

      // Check that cart item is also deleted
      const cartItems = await (prisma as any).cartItem.findMany();
      expect(cartItems).toHaveLength(0);
    });
  });

  describe('Indexes', () => {
    it('should efficiently query by customerId', async () => {
      const customer1 = await prisma.customer.create({
        data: {
          name: 'Customer 1',
          phone: '1111111111',
        },
      });

      const customer2 = await prisma.customer.create({
        data: {
          name: 'Customer 2',
          phone: '2222222222',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      // Create cart items for customer1
      await (prisma as any).cartItem.create({
        data: {
          customerId: customer1.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
          deposit: product.deposit,
        },
      });

      await (prisma as any).cartItem.create({
        data: {
          customerId: customer1.id,
          productId: product.id,
          quantity: 2,
          addressId: null,
          price: product.price,
          deposit: product.deposit,
        },
      });

      // Create cart item for customer2
      await (prisma as any).cartItem.create({
        data: {
          customerId: customer2.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
          deposit: product.deposit,
        },
      });

      // Query by customerId (should use index)
      const customer1CartItems = await (prisma as any).cartItem.findMany({
        where: { customerId: customer1.id },
      });

      expect(customer1CartItems).toHaveLength(2);

      const customer2CartItems = await (prisma as any).cartItem.findMany({
        where: { customerId: customer2.id },
      });

      expect(customer2CartItems).toHaveLength(1);
    });

    it('should efficiently query by productId', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '1234567890',
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const category = await prisma.categories.create({
        data: {
          name: 'Test Category',
        },
      });

      const product1 = await prisma.product.create({
        data: {
          name: 'Product 1',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 25.0,
        },
      });

      const product2 = await prisma.product.create({
        data: {
          name: 'Product 2',
          categoryId: category.id,
          vendorId: vendor.id,
          price: 30.0,
        },
      });

      // Create cart items
      await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product1.id,
          quantity: 1,
          price: product1.price,
          deposit: product1.deposit,
        },
      });

      await (prisma as any).cartItem.create({
        data: {
          customerId: customer.id,
          productId: product2.id,
          quantity: 2,
          price: product2.price,
          deposit: product2.deposit,
        },
      });

      // Query by productId (should use index)
      const product1CartItems = await (prisma as any).cartItem.findMany({
        where: { productId: product1.id },
      });

      expect(product1CartItems).toHaveLength(1);
      expect(product1CartItems[0].quantity).toBe(1);
    });
  });
});
