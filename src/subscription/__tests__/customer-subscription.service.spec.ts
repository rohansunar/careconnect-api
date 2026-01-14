import { Test, TestingModule } from '@nestjs/testing';
import { CustomerSubscriptionService } from '../services/customer-subscription.service';
import { PrismaService } from '../../common/database/prisma.service';
import { DeliveryFrequencyService } from '../services/delivery-frequency.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { SubscriptionFrequency, DayOfWeek } from '../interfaces/delivery-frequency.interface';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CustomerSubscriptionService', () => {
  let service: CustomerSubscriptionService;
  let prismaService: PrismaService;
  let deliveryFrequencyService: DeliveryFrequencyService;

  const mockUser = { id: 'user-123' };
  const mockProduct = { id: 'product-123', vendorId: 'vendor-123' };
  const mockCustomerAddress = { id: 'address-123', customerId: 'user-123', isActive: true, isDefault: true };
  const mockSubscription = {
    id: 'subscription-123',
    customerAddressId: 'address-123',
    vendorId: 'vendor-123',
    productId: 'product-123',
    quantity: 2,
    frequency: SubscriptionFrequency.DAILY,
    custom_days: [],
    next_delivery_date: new Date('2023-01-02'),
    status: 'ACTIVE',
    start_date: new Date('2023-01-01'),
    created_at: new Date(),
    updated_at: new Date(),
    customerAddress: mockCustomerAddress,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerSubscriptionService,
        {
          provide: PrismaService,
          useValue: {
            customerAddress: {
              findFirst: jest.fn(),
            },
            product: {
              findUnique: jest.fn(),
            },
            subscription: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        DeliveryFrequencyService,
      ],
    }).compile();

    service = module.get<CustomerSubscriptionService>(CustomerSubscriptionService);
    prismaService = module.get<PrismaService>(PrismaService);
    deliveryFrequencyService = module.get<DeliveryFrequencyService>(DeliveryFrequencyService);
  });

  describe('createSubscription', () => {
    it('should create a subscription successfully', async () => {
      jest.spyOn(prismaService.customerAddress, 'findFirst').mockResolvedValue(mockCustomerAddress);
      jest.spyOn(prismaService.product, 'findUnique').mockResolvedValue(mockProduct);
      jest.spyOn(prismaService.subscription, 'create').mockResolvedValue(mockSubscription);

      const dto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2023-01-01',
      };

      const result = await service.createSubscription(mockUser, dto);

      expect(result).toEqual(mockSubscription);
      expect(prismaService.subscription.create).toHaveBeenCalledWith({
        data: {
          customerAddressId: mockCustomerAddress.id,
          vendorId: mockProduct.vendorId,
          productId: dto.productId,
          quantity: dto.quantity,
          frequency: dto.frequency,
          custom_days: [],
          next_delivery_date: expect.any(Date),
          start_date: new Date(dto.start_date),
        },
      });
    });

    it('should throw NotFoundException if no active customer address found', async () => {
      jest.spyOn(prismaService.customerAddress, 'findFirst').mockResolvedValue(null);

      const dto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2023-01-01',
      };

      await expect(service.createSubscription(mockUser, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if product not found', async () => {
      jest.spyOn(prismaService.customerAddress, 'findFirst').mockResolvedValue(mockCustomerAddress);
      jest.spyOn(prismaService.product, 'findUnique').mockResolvedValue(null);

      const dto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2023-01-01',
      };

      await expect(service.createSubscription(mockUser, dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMySubscriptions', () => {
    it('should return subscriptions for the user', async () => {
      jest.spyOn(prismaService.subscription, 'findMany').mockResolvedValue([mockSubscription]);
      jest.spyOn(prismaService.subscription, 'count').mockResolvedValue(1);

      const result = await service.getMySubscriptions(mockUser);

      expect(result).toEqual({
        subscriptions: [mockSubscription],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('getMySubscription', () => {
    it('should return a subscription if it belongs to the user', async () => {
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(mockSubscription);

      const result = await service.getMySubscription('subscription-123', mockUser);

      expect(result).toEqual(mockSubscription);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(null);

      await expect(service.getMySubscription('subscription-123', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subscription does not belong to user', async () => {
      const otherUserSubscription = { ...mockSubscription, customerAddress: { ...mockCustomerAddress, customerId: 'other-user' } };
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(otherUserSubscription);

      await expect(service.getMySubscription('subscription-123', mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateMySubscription', () => {
    it('should update a subscription if it belongs to the user', async () => {
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(mockSubscription);
      jest.spyOn(prismaService.subscription, 'update').mockResolvedValue({ ...mockSubscription, quantity: 5 });

      const dto: UpdateSubscriptionDto = {
        quantity: 5,
      };

      const result = await service.updateMySubscription('subscription-123', dto, mockUser);

      expect(result).toEqual({ ...mockSubscription, quantity: 5 });
    });

    it('should throw NotFoundException if subscription not found', async () => {
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(null);

      const dto: UpdateSubscriptionDto = {
        quantity: 5,
      };

      await expect(service.updateMySubscription('subscription-123', dto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subscription does not belong to user', async () => {
      const otherUserSubscription = { ...mockSubscription, customerAddress: { ...mockCustomerAddress, customerId: 'other-user' } };
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(otherUserSubscription);

      const dto: UpdateSubscriptionDto = {
        quantity: 5,
      };

      await expect(service.updateMySubscription('subscription-123', dto, mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('pauseMySubscription', () => {
    it('should pause a subscription if it belongs to the user', async () => {
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(mockSubscription);
      jest.spyOn(prismaService.subscription, 'update').mockResolvedValue({ ...mockSubscription, status: 'INACTIVE' });

      const result = await service.pauseMySubscription('subscription-123', mockUser);

      expect(result).toEqual({ ...mockSubscription, status: 'INACTIVE' });
    });

    it('should throw NotFoundException if subscription not found', async () => {
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(null);

      await expect(service.pauseMySubscription('subscription-123', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subscription does not belong to user', async () => {
      const otherUserSubscription = { ...mockSubscription, customerAddress: { ...mockCustomerAddress, customerId: 'other-user' } };
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(otherUserSubscription);

      await expect(service.pauseMySubscription('subscription-123', mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteMySubscription', () => {
    it('should delete a subscription if it belongs to the user', async () => {
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(mockSubscription);
      jest.spyOn(prismaService.subscription, 'delete').mockResolvedValue(mockSubscription);

      const result = await service.deleteMySubscription('subscription-123', mockUser);

      expect(result).toEqual(mockSubscription);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(null);

      await expect(service.deleteMySubscription('subscription-123', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subscription does not belong to user', async () => {
      const otherUserSubscription = { ...mockSubscription, customerAddress: { ...mockCustomerAddress, customerId: 'other-user' } };
      jest.spyOn(prismaService.subscription, 'findUnique').mockResolvedValue(otherUserSubscription);

      await expect(service.deleteMySubscription('subscription-123', mockUser)).rejects.toThrow(ForbiddenException);
    });
  });
});