import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CustomerSubscriptionController } from '../../controllers/customer-subscription.controller';
import { CustomerSubscriptionService } from '../../services/customer-subscription.service';
import { AdminSubscriptionController } from '../../controllers/admin-subscription.controller';
import { AdminSubscriptionService } from '../../services/admin-subscription.service';
import { CreateSubscriptionDto } from '../../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../../dto/update-subscription.dto';
import { SubscriptionFrequency, DayOfWeek } from '../../interfaces/delivery-frequency.interface';
import { User, UserRole } from '../../../common/interfaces/user.interface';

describe('Controller Integration Tests', () => {
  let app: INestApplication;
  let customerController: CustomerSubscriptionController;
  let adminController: AdminSubscriptionController;
  let customerService: CustomerSubscriptionService;
  let adminService: AdminSubscriptionService;

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

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerSubscriptionController, AdminSubscriptionController],
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
        {
          provide: AdminSubscriptionService,
          useValue: {
            togglePaymentMode: jest.fn(),
            getPaymentMode: jest.fn(),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    customerController = module.get<CustomerSubscriptionController>(CustomerSubscriptionController);
    adminController = module.get<AdminSubscriptionController>(AdminSubscriptionController);
    customerService = module.get<CustomerSubscriptionService>(CustomerSubscriptionService);
    adminService = module.get<AdminSubscriptionService>(AdminSubscriptionService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Customer Controller Integration Tests', () => {
    it('should create subscription and return result', async () => {
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

      jest.spyOn(customerService, 'createSubscription').mockResolvedValue(mockResult);

      const result = await customerController.createSubscription(mockUser, mockDto);

      expect(result).toEqual(mockResult);
      expect(customerService.createSubscription).toHaveBeenCalledWith(mockUser, mockDto);
    });

    it('should get subscriptions and return paginated result', async () => {
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
            endDate: undefined,
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      jest.spyOn(customerService, 'getMySubscriptions').mockResolvedValue({
        ...mockResult,
        subscriptions: mockResult.subscriptions.map((sub) => ({
          ...sub,
          endDate: undefined,
        })),
      });

      const result = await customerController.getMySubscriptions(mockUser, ['ACTIVE'], '1', '10');

      expect(result).toEqual(mockResult);
      expect(customerService.getMySubscriptions).toHaveBeenCalledWith(mockUser, ['ACTIVE'], 1, 10);
    });

    it('should get subscription by ID', async () => {
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

      jest.spyOn(customerService, 'getMySubscription').mockResolvedValue({
        ...mockResult,
        endDate: undefined,
      });

      const result = await customerController.getMySubscription('sub1', mockUser);

      expect(result).toEqual(mockResult);
      expect(customerService.getMySubscription).toHaveBeenCalledWith('sub1', mockUser);
    });

    it('should update subscription', async () => {
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

      jest.spyOn(customerService, 'updateMySubscription').mockResolvedValue({
        ...mockResult,
        endDate: undefined,
      });

      const result = await customerController.updateMySubscription('sub1', mockDto, mockUser);

      expect(result).toEqual(mockResult);
      expect(customerService.updateMySubscription).toHaveBeenCalledWith('sub1', mockDto, mockUser);
    });

    it('should toggle subscription status', async () => {
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

      jest.spyOn(customerService, 'toggleSubscriptionStatus').mockResolvedValue({
        ...mockResult,
        endDate: undefined,
      });

      const result = await customerController.toggleSubscriptionStatus('sub1', mockUser);

      expect(result).toEqual(mockResult);
      expect(customerService.toggleSubscriptionStatus).toHaveBeenCalledWith('sub1', mockUser);
    });

    it('should delete subscription', async () => {
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

      jest.spyOn(customerService, 'deleteMySubscription').mockResolvedValue({
        ...mockResult,
        endDate: undefined,
      });

      const result = await customerController.deleteMySubscription('sub1', mockUser);

      expect(result).toEqual(mockResult);
      expect(customerService.deleteMySubscription).toHaveBeenCalledWith('sub1', mockUser);
    });
  });

  describe('Admin Controller Integration Tests', () => {
    it('should toggle payment mode', async () => {
      const mockResult = {
        message: 'Payment mode toggled successfully',
        payment_mode: 'POST_DELIVERY',
      };

      jest.spyOn(adminService, 'togglePaymentMode').mockResolvedValue(mockResult);

      const result = await adminController.togglePaymentMode();

      expect(result).toEqual(mockResult);
      expect(adminService.togglePaymentMode).toHaveBeenCalled();
    });

    it('should get payment mode', async () => {
      const mockResult = { payment_mode: 'UPFRONT' };

      jest.spyOn(adminService, 'getPaymentMode').mockResolvedValue(mockResult);

      const result = await adminController.getPaymentMode();

      expect(result).toEqual(mockResult);
      expect(adminService.getPaymentMode).toHaveBeenCalled();
    });
  });
});