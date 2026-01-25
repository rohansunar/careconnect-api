import { Test, TestingModule } from '@nestjs/testing';
import { CustomerSubscriptionService } from '../../../src/subscription/services/customer-subscription.service';
import { SubscriptionRepositoryService } from '../../../src/subscription/repositories/subscription.repository';
import { PrismaService } from '../../../src/common/database/prisma.service';
import { DeliveryFrequencyService } from '../../../src/subscription/services/delivery-frequency.service';
import { PriceCalculationService } from '../../../src/subscription/services/price-calculation.service';
import { PaymentModeService } from '../../../src/subscription/services/payment-mode.service';
import { SubscriptionValidationService } from '../../../src/subscription/services/subscription-validation.service';
import { CreateSubscriptionDto } from '../../../src/subscription/dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../../../src/subscription/dto/update-subscription.dto';
import {
  SubscriptionFrequency,
  DayOfWeek,
} from '../../../src/subscription/interfaces/delivery-frequency.interface';
import { SubscriptionStatus } from '@prisma/client';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('CustomerSubscriptionService', () => {
  let service: CustomerSubscriptionService;
  let prismaService: PrismaService;
  let deliveryFrequencyService: DeliveryFrequencyService;
  let mockValidateInputs: jest.Mock;

  const mockUser = {
    id: 'user-123',
    phone: '1234567890',
    name: 'Test User',
    email: 'test@example.com',
    role: 'customer' as any,
    isActive: true,
    monthlyPaymentMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockProduct = {
    id: 'product-123',
    name: 'Test Product',
    categoryId: 'category-123',
    images: ['image1.jpg'],
    description: 'Test description',
    created_at: new Date(),
    vendorId: 'vendor-123',
    price: 100.0 as any,
    deposit: null,
    is_active: true,
    updated_at: new Date(),
    approval_status: 'APPROVED' as any,
    approved_by: null,
    approved_at: null,
    is_schedulable: true,
  };
  const mockCustomerAddress = {
    id: 'address-123',
    customerId: 'user-123',
    label: 'Home' as any,
    address: '123 Test St',
    locationId: 'location-123',
    pincode: '123456',
    created_at: new Date(),
    updated_at: new Date(),
    isDefault: true,
    is_active: true,
    isServiceable: true,
  };
  const mockSubscription = {
    id: 'subscription-123',
    customerAddressId: 'address-123',
    vendorId: 'vendor-123',
    productId: 'product-123',
    quantity: 2,
    frequency: SubscriptionFrequency.DAILY,
    custom_days: [],
    next_delivery_date: new Date('2027-01-02'),
    status: SubscriptionStatus.ACTIVE,
    start_date: new Date('2027-01-01'),
    payment_mode: 'UPFRONT',
    total_price: 200,
    created_at: new Date(),
    updated_at: new Date(),
    customerAddress: mockCustomerAddress,
  };

  const mockSubscriptionRepo = {
    id: 'subscription-123',
    customerId: 'user-123',
    productId: 'product-123',
    quantity: 2,
    price: 200,
    frequency: SubscriptionFrequency.DAILY,
    customDays: [],
    startDate: new Date('2027-01-01'),
    nextDeliveryDate: new Date('2027-01-02'),
    endDate: undefined,
    status: SubscriptionStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerSubscriptionService,
        {
          provide: SubscriptionRepositoryService,
          useValue: {
            findByCustomerAndProduct: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: DeliveryFrequencyService,
          useValue: {
            validateFrequency: jest.fn(),
            getNextDeliveryDate: jest.fn(),
            getDeliveryDays: jest.fn(),
          },
        },
        {
          provide: PriceCalculationService,
          useValue: {
            calculateTotalPrice: jest.fn(),
          },
        },
        {
          provide: PaymentModeService,
          useValue: {
            getCurrentMode: jest.fn(),
          },
        },
        {
          provide: SubscriptionValidationService,
          useValue: {
            validateInputs: jest.fn(),
          },
        },
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
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CustomerSubscriptionService>(
      CustomerSubscriptionService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
    deliveryFrequencyService = module.get<DeliveryFrequencyService>(
      DeliveryFrequencyService,
    );
    mockValidateInputs = module.get(SubscriptionValidationService)
      .validateInputs as jest.Mock;
  });

  describe('createSubscription', () => {
    it('should create a subscription successfully', async () => {
      mockValidateInputs.mockResolvedValue({ isValid: true });
      jest
        .spyOn(prismaService.customerAddress, 'findFirst')
        .mockResolvedValue(mockCustomerAddress);
      jest
        .spyOn(prismaService.product, 'findUnique')
        .mockResolvedValue(mockProduct);
      jest
        .spyOn(prismaService.subscription, 'create')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(service['subscriptionRepository'], 'findByCustomerAndProduct')
        .mockResolvedValue([]);
      jest
        .spyOn(service['subscriptionRepository'], 'create')
        .mockResolvedValue(mockSubscriptionRepo);
      jest
        .spyOn(service['paymentModeService'], 'getCurrentMode')
        .mockReturnValue('UPFRONT');

      const dto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2027-01-01',
      };

      const result = await service.createSubscription(mockUser, dto);

      expect(result).toEqual({
        id: 'subscription-123',
        total_price: 200,
        payment_mode: 'UPFRONT',
        customer: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
        },
      });
    });

    it('should throw NotFoundException if no active customer address found', async () => {
      mockValidateInputs.mockResolvedValue({ isValid: true });
      jest
        .spyOn(prismaService.customerAddress, 'findFirst')
        .mockResolvedValue(null);

      const dto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2027-01-01',
      };

      await expect(service.createSubscription(mockUser, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if product not found', async () => {
      mockValidateInputs.mockResolvedValue({ isValid: true });
      jest
        .spyOn(prismaService.customerAddress, 'findFirst')
        .mockResolvedValue(mockCustomerAddress);
      jest.spyOn(prismaService.product, 'findUnique').mockResolvedValue(null);

      const dto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2027-01-01',
      };

      await expect(service.createSubscription(mockUser, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when a duplicate subscription exists', async () => {
      mockValidateInputs.mockResolvedValue({ isValid: true });
      jest
        .spyOn(prismaService.customerAddress, 'findFirst')
        .mockResolvedValue(mockCustomerAddress);
      jest
        .spyOn(prismaService.product, 'findUnique')
        .mockResolvedValue(mockProduct);
      jest
        .spyOn(service['subscriptionRepository'], 'findByCustomerAndProduct')
        .mockResolvedValue([mockSubscriptionRepo]); // Duplicate exists

      const dto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2027-01-01',
      };

      await expect(service.createSubscription(mockUser, dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createSubscription(mockUser, dto)).rejects.toThrow(
        'A subscription for this product already exists for this customer address.',
      );
    });

    it('should throw InternalServerErrorException when database operations fail', async () => {
      mockValidateInputs.mockResolvedValue({ isValid: true });
      jest
        .spyOn(prismaService.customerAddress, 'findFirst')
        .mockResolvedValue(mockCustomerAddress);
      jest
        .spyOn(prismaService.product, 'findUnique')
        .mockResolvedValue(mockProduct);
      jest
        .spyOn(service['subscriptionRepository'], 'findByCustomerAndProduct')
        .mockRejectedValue(new Error('Database error')); // Simulate database failure

      const dto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2027-01-01',
      };

      await expect(service.createSubscription(mockUser, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.createSubscription(mockUser, dto)).rejects.toThrow(
        'Failed to check for duplicate subscription',
      );
    });
  });

  describe('getMySubscriptions', () => {
    it('should return subscriptions for the user', async () => {
      jest
        .spyOn(service['subscriptionRepository'], 'findByCustomerAndProduct')
        .mockResolvedValue([mockSubscriptionRepo]);

      const result = await service.getMySubscriptions(mockUser);

      expect(result).toEqual({
        subscriptions: [mockSubscriptionRepo],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('getMySubscription', () => {
    it('should return a subscription if it belongs to the user', async () => {
      jest
        .spyOn(service['subscriptionRepository'], 'findById')
        .mockResolvedValue(mockSubscriptionRepo);

      const result = await service.getMySubscription(
        'subscription-123',
        mockUser,
      );

      expect(result).toEqual(mockSubscriptionRepo);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      jest
        .spyOn(service['subscriptionRepository'], 'findById')
        .mockResolvedValue(null);

      await expect(
        service.getMySubscription('subscription-123', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subscription does not belong to user', async () => {
      const otherUserSubscription = {
        ...mockSubscriptionRepo,
        customerId: 'other-user',
      };
      jest
        .spyOn(service['subscriptionRepository'], 'findById')
        .mockResolvedValue(otherUserSubscription);

      await expect(
        service.getMySubscription('subscription-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateMySubscription', () => {
    it('should update a subscription if it belongs to the user', async () => {
      jest
        .spyOn(service['subscriptionRepository'], 'findById')
        .mockResolvedValue(mockSubscriptionRepo);
      jest
        .spyOn(service['subscriptionRepository'], 'update')
        .mockResolvedValue({ ...mockSubscriptionRepo, quantity: 5 });

      const dto: UpdateSubscriptionDto = {
        quantity: 5,
      };

      const result = await service.updateMySubscription(
        'subscription-123',
        dto,
        mockUser,
      );

      expect(result).toEqual({ ...mockSubscriptionRepo, quantity: 5 });
    });

    it('should throw NotFoundException if subscription not found', async () => {
      jest
        .spyOn(service['subscriptionRepository'], 'findById')
        .mockResolvedValue(null);

      const dto: UpdateSubscriptionDto = {
        quantity: 5,
      };

      await expect(
        service.updateMySubscription('subscription-123', dto, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subscription does not belong to user', async () => {
      const otherUserSubscription = {
        ...mockSubscriptionRepo,
        customerId: 'other-user',
      };
      jest
        .spyOn(service['subscriptionRepository'], 'findById')
        .mockResolvedValue(otherUserSubscription);

      const dto: UpdateSubscriptionDto = {
        quantity: 5,
      };

      await expect(
        service.updateMySubscription('subscription-123', dto, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteMySubscription', () => {
    it('should delete a subscription if it belongs to the user', async () => {
      jest
        .spyOn(service['subscriptionRepository'], 'findById')
        .mockResolvedValue(mockSubscriptionRepo);
      jest
        .spyOn(service['subscriptionRepository'], 'delete')
        .mockResolvedValue(mockSubscriptionRepo);

      const result = await service.deleteMySubscription(
        'subscription-123',
        mockUser,
      );

      expect(result).toEqual(mockSubscriptionRepo);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      jest
        .spyOn(service['subscriptionRepository'], 'findById')
        .mockResolvedValue(null);

      await expect(
        service.deleteMySubscription('subscription-123', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subscription does not belong to user', async () => {
      const otherUserSubscription = {
        ...mockSubscriptionRepo,
        customerId: 'other-user',
      };
      jest
        .spyOn(service['subscriptionRepository'], 'findById')
        .mockResolvedValue(otherUserSubscription);

      await expect(
        service.deleteMySubscription('subscription-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
