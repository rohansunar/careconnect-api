import { Test, TestingModule } from '@nestjs/testing';
import { CustomerSubscriptionController } from '../controllers/customer-subscription.controller';
import { CustomerSubscriptionService } from '../services/customer-subscription.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import {
  SubscriptionFrequency,
  DayOfWeek,
} from '../interfaces/delivery-frequency.interface';
import { User, UserRole } from '../../common/interfaces/user.interface';

describe('CustomerSubscriptionController', () => {
  let controller: CustomerSubscriptionController;
  let service: CustomerSubscriptionService;

  const mockUser: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    phone: '1234567890',
    role: UserRole.CUSTOMER,
    isActive: true,
    monthlyPaymentMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerSubscriptionController],
      providers: [
        {
          provide: CustomerSubscriptionService,
          useValue: {
            createSubscription: jest.fn(),
            getMySubscriptions: jest.fn(),
            getMySubscription: jest.fn(),
            updateMySubscription: jest.fn(),
            toggleSubscriptionStatus: jest.fn(),
            deleteMySubscription: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CustomerSubscriptionController>(
      CustomerSubscriptionController,
    );
    service = module.get<CustomerSubscriptionService>(
      CustomerSubscriptionService,
    );
  });

  describe('createSubscription', () => {
    it('should create a subscription and return result', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-01-15',
        custom_days: [],
      };

      const mockResult = {
        id: 'subscription-123',
        total_price: 200,
        payment_mode: 'UPFRONT',
        customer: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
        },
      };

      jest.spyOn(service, 'createSubscription').mockResolvedValue(mockResult);

      const result = await controller.createSubscription(mockUser, mockDto);

      expect(result).toEqual(mockResult);
      expect(service.createSubscription).toHaveBeenCalledWith(
        mockUser,
        mockDto,
      );
    });
  });

  describe('getMySubscriptions', () => {
    it('should return paginated subscriptions', async () => {
      const mockResult = {
        subscriptions: [
          {
            id: 'sub1',
            customerId: 'user-123',
            productId: 'product-123',
            quantity: 2,
            price: 200,
            frequency: SubscriptionFrequency.DAILY,
            customDays: [],
            startDate: new Date('2026-01-15'),
            nextDeliveryDate: new Date('2026-01-16'),
            endDate: null,
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'sub2',
            customerId: 'user-123',
            productId: 'product-123',
            quantity: 1,
            price: 100,
            frequency: SubscriptionFrequency.ALTERNATIVE_DAYS,
            customDays: [],
            startDate: new Date('2026-01-10'),
            nextDeliveryDate: new Date('2026-01-12'),
            endDate: null,
            status: 'INACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      jest.spyOn(service, 'getMySubscriptions').mockResolvedValue(mockResult);

      const result = await controller.getMySubscriptions(
        mockUser,
        ['ACTIVE'],
        '1',
        '10',
      );

      expect(result).toEqual(mockResult);
      expect(service.getMySubscriptions).toHaveBeenCalledWith(
        mockUser,
        ['ACTIVE'],
        1,
        10,
      );
    });
  });

  describe('getMySubscription', () => {
    it('should return a subscription by ID', async () => {
      const mockResult = {
        id: 'sub1',
        customerId: 'user-123',
        productId: 'product-123',
        quantity: 2,
        price: 200,
        frequency: SubscriptionFrequency.DAILY,
        customDays: [],
        startDate: new Date('2026-01-15'),
        nextDeliveryDate: new Date('2026-01-16'),
        endDate: undefined,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getMySubscription').mockResolvedValue(mockResult);

      const result = await controller.getMySubscription('sub1', mockUser);

      expect(result).toEqual(mockResult);
      expect(service.getMySubscription).toHaveBeenCalledWith('sub1', mockUser);
    });
  });

  describe('updateMySubscription', () => {
    it('should update a subscription and return result', async () => {
      const mockDto: UpdateSubscriptionDto = {
        quantity: 3,
        frequency: SubscriptionFrequency.ALTERNATIVE_DAYS,
        custom_days: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY],
        start_date: new Date('2026-01-15'),
      };

      const mockResult = {
        id: 'sub1',
        customerId: 'user-123',
        productId: 'product-123',
        quantity: 3,
        price: 300,
        frequency: SubscriptionFrequency.ALTERNATIVE_DAYS,
        customDays: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY],
        startDate: new Date('2026-01-15'),
        nextDeliveryDate: new Date('2026-01-17'),
        endDate: undefined,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'updateMySubscription').mockResolvedValue(mockResult);

      const result = await controller.updateMySubscription(
        'sub1',
        mockDto,
        mockUser,
      );

      expect(result).toEqual(mockResult);
      expect(service.updateMySubscription).toHaveBeenCalledWith(
        'sub1',
        mockDto,
        mockUser,
      );
    });
  });

  describe('toggleSubscriptionStatus', () => {
    it('should toggle subscription status and return result', async () => {
      const mockResult = {
        id: 'sub1',
        customerId: 'user-123',
        productId: 'product-123',
        quantity: 2,
        price: 200,
        frequency: SubscriptionFrequency.DAILY,
        customDays: [],
        startDate: new Date('2026-01-15'),
        nextDeliveryDate: new Date('2026-01-16'),
        endDate: undefined,
        status: 'INACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(service, 'toggleSubscriptionStatus')
        .mockResolvedValue(mockResult);

      const result = await controller.toggleSubscriptionStatus(
        'sub1',
        mockUser,
      );

      expect(result).toEqual(mockResult);
      expect(service.toggleSubscriptionStatus).toHaveBeenCalledWith(
        'sub1',
        mockUser,
      );
    });
  });

  describe('deleteMySubscription', () => {
    it('should delete a subscription and return result', async () => {
      const mockResult = {
        id: 'sub1',
        customerId: 'user-123',
        productId: 'product-123',
        quantity: 2,
        price: 200,
        frequency: SubscriptionFrequency.DAILY,
        customDays: [],
        startDate: new Date('2026-01-15'),
        nextDeliveryDate: new Date('2026-01-16'),
        endDate: undefined,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'deleteMySubscription').mockResolvedValue(mockResult);

      const result = await controller.deleteMySubscription('sub1', mockUser);

      expect(result).toEqual(mockResult);
      expect(service.deleteMySubscription).toHaveBeenCalledWith(
        'sub1',
        mockUser,
      );
    });
  });
});
