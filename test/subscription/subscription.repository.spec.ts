import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionRepositoryService } from '../repositories/subscription.repository';
import { PrismaService } from '../../common/database/prisma.service';
import { SubscriptionFrequency, DayOfWeek } from '../interfaces/delivery-frequency.interface';
import { SubscriptionStatus } from '@prisma/client';

describe('SubscriptionRepositoryService', () => {
  let service: SubscriptionRepositoryService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionRepositoryService,
        {
          provide: PrismaService,
          useValue: {
            subscription: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionRepositoryService>(SubscriptionRepositoryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findById', () => {
    it('should return a subscription when found', async () => {
      const mockSubscription = {
        id: 'sub-123',
        customerAddressId: 'addr-123',
        vendorId: null,
        productId: 'prod-123',
        quantity: 2,
        total_price: 200,
        frequency: SubscriptionFrequency.DAILY,
        custom_days: [],
        start_date: new Date('2026-01-15'),
        next_delivery_date: new Date('2026-01-16'),
        end_date: null,
        status: SubscriptionStatus.ACTIVE,
        payment_mode: 'UPFRONT',
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(prisma.subscription, 'findUnique').mockResolvedValue(mockSubscription);

      const result = await service.findById('sub-123');

      expect(result).toEqual({
        id: 'sub-123',
        customerId: 'addr-123',
        productId: 'prod-123',
        quantity: 2,
        price: 200,
        frequency: SubscriptionFrequency.DAILY,
        customDays: [],
        startDate: new Date('2026-01-15'),
        nextDeliveryDate: new Date('2026-01-16'),
        endDate: null,
        status: SubscriptionStatus.ACTIVE,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should return null when subscription is not found', async () => {
      jest.spyOn(prisma.subscription, 'findUnique').mockResolvedValue(null);

      const result = await service.findById('sub-123');

      expect(result).toBeNull();
    });
  });

  describe('findByCustomerAndProduct', () => {
    it('should return an array of subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-123',
          customerAddressId: 'addr-123',
          vendorId: null,
          productId: 'prod-123',
          quantity: 2,
          total_price: 200,
          frequency: SubscriptionFrequency.DAILY,
          custom_days: [],
          start_date: new Date('2026-01-15'),
          next_delivery_date: new Date('2026-01-16'),
          end_date: null,
          status: SubscriptionStatus.ACTIVE,
          payment_mode: 'UPFRONT',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'sub-456',
          customerAddressId: 'addr-123',
          vendorId: null,
          productId: 'prod-123',
          quantity: 1,
          total_price: 100,
          frequency: SubscriptionFrequency.ALTERNATIVE_DAYS,
          custom_days: [],
          start_date: new Date('2026-01-10'),
          next_delivery_date: new Date('2026-01-12'),
          end_date: null,
          status: SubscriptionStatus.INACTIVE,
          payment_mode: 'UPFRONT',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      jest.spyOn(prisma.subscription, 'findMany').mockResolvedValue(mockSubscriptions);

      const result = await service.findByCustomerAndProduct('addr-123', 'prod-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('sub-123');
      expect(result[1].id).toBe('sub-456');
    });

    it('should return an empty array when no subscriptions are found', async () => {
      jest.spyOn(prisma.subscription, 'findMany').mockResolvedValue([]);

      const result = await service.findByCustomerAndProduct('addr-123', 'prod-123');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create and return a subscription', async () => {
      const mockInput = {
        customerId: 'addr-123',
        productId: 'prod-123',
        quantity: 2,
        price: 200,
        frequency: SubscriptionFrequency.DAILY,
        customDays: [],
        startDate: new Date('2026-01-15'),
        nextDeliveryDate: new Date('2026-01-16'),
        status: 'ACTIVE' as SubscriptionStatus,
      };

      const mockCreatedSubscription = {
        id: 'sub-123',
        customerAddressId: 'addr-123',
        vendorId: null,
        productId: 'prod-123',
        quantity: 2,
        total_price: 200,
        frequency: SubscriptionFrequency.DAILY,
        custom_days: [],
        start_date: new Date('2026-01-15'),
        next_delivery_date: new Date('2026-01-16'),
        end_date: null,
        status: SubscriptionStatus.ACTIVE,
        payment_mode: 'UPFRONT',
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(prisma.subscription, 'create').mockResolvedValue(mockCreatedSubscription);

      const result = await service.create(mockInput);

      expect(result).toEqual({
        id: 'sub-123',
        customerId: 'addr-123',
        productId: 'prod-123',
        quantity: 2,
        price: 200,
        frequency: SubscriptionFrequency.DAILY,
        customDays: [],
        startDate: new Date('2026-01-15'),
        nextDeliveryDate: new Date('2026-01-16'),
        endDate: null,
        status: SubscriptionStatus.ACTIVE,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('update', () => {
    it('should update and return a subscription', async () => {
      const mockUpdateData = {
        quantity: 3,
        price: 300,
      };

      const mockUpdatedSubscription = {
        id: 'sub-123',
        customerAddressId: 'addr-123',
        vendorId: null,
        productId: 'prod-123',
        quantity: 3,
        total_price: 300,
        frequency: SubscriptionFrequency.DAILY,
        custom_days: [],
        start_date: new Date('2026-01-15'),
        next_delivery_date: new Date('2026-01-16'),
        end_date: null,
        status: SubscriptionStatus.ACTIVE,
        payment_mode: 'UPFRONT',
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(prisma.subscription, 'update').mockResolvedValue(mockUpdatedSubscription);

      const result = await service.update('sub-123', mockUpdateData);

      expect(result).toEqual({
        id: 'sub-123',
        customerId: 'addr-123',
        productId: 'prod-123',
        quantity: 3,
        price: 300,
        frequency: SubscriptionFrequency.DAILY,
        customDays: [],
        startDate: new Date('2026-01-15'),
        nextDeliveryDate: new Date('2026-01-16'),
        endDate: null,
        status: SubscriptionStatus.ACTIVE,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('delete', () => {
    it('should delete and return a subscription', async () => {
      const mockDeletedSubscription = {
        id: 'sub-123',
        customerAddressId: 'addr-123',
        vendorId: null,
        productId: 'prod-123',
        quantity: 2,
        total_price: 200,
        frequency: SubscriptionFrequency.DAILY,
        custom_days: [],
        start_date: new Date('2026-01-15'),
        next_delivery_date: new Date('2026-01-16'),
        end_date: null,
        status: SubscriptionStatus.ACTIVE,
        payment_mode: 'UPFRONT',
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(prisma.subscription, 'delete').mockResolvedValue(mockDeletedSubscription);

      const result = await service.delete('sub-123');

      expect(result).toEqual({
        id: 'sub-123',
        customerId: 'addr-123',
        productId: 'prod-123',
        quantity: 2,
        price: 200,
        frequency: SubscriptionFrequency.DAILY,
        customDays: [],
        startDate: new Date('2026-01-15'),
        nextDeliveryDate: new Date('2026-01-16'),
        endDate: null,
        status: SubscriptionStatus.ACTIVE,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });
});