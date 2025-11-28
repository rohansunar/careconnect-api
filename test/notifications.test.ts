import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('Notifications CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up notifications table before each test
    await prisma.notification.deleteMany();
    // Clean up related tables
    await prisma.customer.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.city.deleteMany();
  });

  describe('Create', () => {
    it('should create a notification with valid data', async () => {
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

      const notificationData = {
        customer_id: customer.id,
        vendor_id: vendor.id,
        type: 'order_update',
        message: 'Your order has been shipped',
        sent_via: 'email',
        status: 'SENT' as any,
      };

      const notification = await prisma.notification.create({
        data: notificationData,
      });

      expect(notification).toHaveProperty('id');
      expect(notification.customer_id).toBe(customer.id);
      expect(notification.vendor_id).toBe(vendor.id);
      expect(notification.type).toBe('order_update');
      expect(notification.message).toBe('Your order has been shipped');
      expect(notification.sent_via).toBe('email');
      expect(notification.status).toBe('SENT');
      expect(notification.created_at).toBeInstanceOf(Date);
    });

    it('should create a notification with minimal data', async () => {
      const notificationData = {
        type: 'reminder',
        message: 'Please update your profile',
        sent_via: 'sms',
      };

      const notification = await prisma.notification.create({
        data: notificationData,
      });

      expect(notification).toHaveProperty('id');
      expect(notification.type).toBe('reminder');
      expect(notification.message).toBe('Please update your profile');
      expect(notification.sent_via).toBe('sms');
      expect(notification.status).toBe('SENT');
      expect(notification.customer_id).toBeNull();
      expect(notification.vendor_id).toBeNull();
    });

    it('should throw error for null type', async () => {
      const notificationData = {
        type: null as any,
        message: 'Test message',
        sent_via: 'email',
      };

      await expect(
        prisma.notification.create({ data: notificationData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null message', async () => {
      const notificationData = {
        type: 'test',
        message: null as any,
        sent_via: 'email',
      };

      await expect(
        prisma.notification.create({ data: notificationData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null sent_via', async () => {
      const notificationData = {
        type: 'test',
        message: 'Test message',
        sent_via: null as any,
      };

      await expect(
        prisma.notification.create({ data: notificationData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid customer_id', async () => {
      const notificationData = {
        customer_id: 'invalid-customer-id',
        type: 'test',
        message: 'Test message',
        sent_via: 'email',
      };

      await expect(
        prisma.notification.create({ data: notificationData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid vendor_id', async () => {
      const notificationData = {
        vendor_id: 'invalid-vendor-id',
        type: 'test',
        message: 'Test message',
        sent_via: 'email',
      };

      await expect(
        prisma.notification.create({ data: notificationData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Read', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await prisma.notification.create({
        data: {
          type: 'alert',
          message: 'System alert',
          sent_via: 'push',
        },
      });
      notificationId = notification.id;
    });

    it('should find many notifications', async () => {
      const notifications = await prisma.notification.findMany();

      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('alert');
    });

    it('should find unique notification by id', async () => {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      expect(notification).toBeTruthy();
      expect(notification?.type).toBe('alert');
    });
  });

  describe('Update', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await prisma.notification.create({
        data: {
          type: 'info',
          message: 'Info message',
          sent_via: 'email',
          status: 'SENT' as any,
        },
      });
      notificationId = notification.id;
    });

    it('should update message', async () => {
      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: { message: 'Updated message' },
      });

      expect(updatedNotification.message).toBe('Updated message');
    });

    it('should update status', async () => {
      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'DELIVERED' as any },
      });

      expect(updatedNotification.status).toBe('DELIVERED');
    });

    it('should throw error for null type on update', async () => {
      await expect(
        prisma.notification.update({
          where: { id: notificationId },
          data: { type: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null message on update', async () => {
      await expect(
        prisma.notification.update({
          where: { id: notificationId },
          data: { message: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null sent_via on update', async () => {
      await expect(
        prisma.notification.update({
          where: { id: notificationId },
          data: { sent_via: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await prisma.notification.create({
        data: {
          type: 'delete_test',
          message: 'Delete test message',
          sent_via: 'sms',
        },
      });
      notificationId = notification.id;
    });

    it('should delete notification', async () => {
      const deletedNotification = await prisma.notification.delete({
        where: { id: notificationId },
      });

      expect(deletedNotification.type).toBe('delete_test');

      const notifications = await prisma.notification.findMany();
      expect(notifications).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.notification.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
