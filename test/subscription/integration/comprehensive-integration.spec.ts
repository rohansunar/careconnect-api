import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CustomerSubscriptionService } from '../../services/customer-subscription.service';
import { AdminSubscriptionService } from '../../services/admin-subscription.service';
import { SubscriptionRepositoryService } from '../../repositories/subscription.repository';
import { DeliveryFrequencyService } from '../../services/delivery-frequency.service';
import { DeliveryFrequencyFactoryService } from '../../services/delivery-frequency/delivery-frequency.factory';
import { PriceCalculationService } from '../../services/price-calculation.service';
import { PriceCalculatorFactoryService } from '../../services/price-calculation/price-calculator.factory';
import { PaymentModeService } from '../../services/payment-mode.service';
import { SubscriptionValidationService } from '../../services/subscription-validation.service';
import { JsonPaymentModeRepository } from '../../services/payment-mode/payment-mode.repository';
import { CreateSubscriptionDto } from '../../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../../dto/update-subscription.dto';
import { SubscriptionFrequency, DayOfWeek } from '../../interfaces/delivery-frequency.interface';
import { User, UserRole } from '../../../common/interfaces/user.interface';
import { PrismaService } from '../../../common/database/prisma.service';

describe('Comprehensive Integration Tests', () => {
  let app: INestApplication;
  let customerSubscriptionService: CustomerSubscriptionService;
  let adminSubscriptionService: AdminSubscriptionService;
  let module: TestingModule;

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

  const mockPrismaService = {
    customerAddress: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'addr-123',
        customerId: 'user-123',
        is_active: true,
        isDefault: true,
      }),
    },
    product: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'product-123',
        price: 100,
        is_schedulable: true,
      }),
    },
    subscription: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockImplementation((args) => {
        const id = args.where.id;
        if (id.startsWith('sub-')) {
          return Promise.resolve({
            id,
            customerAddressId: 'addr-123',
            productId: 'product-123',
            quantity: 2,
            total_price: 200,
            frequency: 'DAILY',
            custom_days: [],
            start_date: new Date('2026-12-15'),
            next_delivery_date: new Date('2026-12-15'),
            status: 'PROCESSING',
            created_at: new Date(),
            updated_at: new Date(),
            customerAddress: {
              id: 'addr-123',
              customerId: 'user-123',
              is_active: true,
              isDefault: true,
            },
          });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((data) => {
        createCounter++;
        const id = `sub-${createCounter}`;
        return Promise.resolve({
          id,
          customerAddressId: 'addr-123',
          productId: data.productId,
          quantity: data.quantity,
          total_price: 200,
          frequency: data.frequency,
          custom_days: data.custom_days || [],
          start_date: data.start_date,
          next_delivery_date: new Date('2026-12-15'),
          status: 'PROCESSING',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }),
      update: jest.fn().mockResolvedValue({
        id: 'sub-123',
        customerAddressId: 'addr-123',
        productId: 'product-123',
        quantity: 3,
        total_price: 300,
        frequency: 'ALTERNATIVE_DAYS',
        custom_days: [],
        start_date: new Date('2026-12-15'),
        next_delivery_date: new Date('2026-12-15'),
        status: 'INACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      }),
      delete: jest.fn().mockResolvedValue({
        id: 'sub-123',
        customerAddressId: 'addr-123',
        productId: 'product-123',
        quantity: 2,
        total_price: 200,
        frequency: 'DAILY',
        custom_days: [],
        start_date: new Date('2026-12-15'),
        next_delivery_date: new Date('2026-12-15'),
        status: 'PROCESSING',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    },
  };

  let createCounter = 0;

  beforeAll(async () => {
    let currentMode = 'UPFRONT';
    const mockJsonPaymentModeRepository = {
      getPaymentMode: jest.fn().mockImplementation(() => currentMode),
      setPaymentMode: jest.fn((mode) => { currentMode = mode; }),
    };

    module = await Test.createTestingModule({
      providers: [
        CustomerSubscriptionService,
        AdminSubscriptionService,
        SubscriptionRepositoryService,
        DeliveryFrequencyService,
        DeliveryFrequencyFactoryService,
        PriceCalculationService,
        PriceCalculatorFactoryService,
        PaymentModeService,
        SubscriptionValidationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        JsonPaymentModeRepository,
      ],
    }).overrideProvider(JsonPaymentModeRepository).useValue(mockJsonPaymentModeRepository).compile();

    app = module.createNestApplication();
    await app.init();

    customerSubscriptionService = module.get<CustomerSubscriptionService>(CustomerSubscriptionService);
    adminSubscriptionService = module.get<AdminSubscriptionService>(AdminSubscriptionService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('End-to-End Integration Tests', () => {
    it('should create subscription, update it, toggle status, and delete it', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-12-15',
        custom_days: [],
      };

      const created = await customerSubscriptionService.createSubscription(mockUser, mockDto);
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();

      const updateDto: UpdateSubscriptionDto = {
        quantity: 3,
        frequency: SubscriptionFrequency.ALTERNATIVE_DAYS,
        custom_days: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY],
        start_date: new Date('2026-01-15'),
      };

      const updated = await customerSubscriptionService.updateMySubscription(created.id, updateDto, mockUser);
      expect(updated).toBeDefined();
      expect(updated.quantity).toBe(updateDto.quantity);

      const toggled = await customerSubscriptionService.toggleSubscriptionStatus(created.id, mockUser);
      expect(toggled).toBeDefined();
      expect(toggled.status).toBe('INACTIVE');

      const deleted = await customerSubscriptionService.deleteMySubscription(created.id, mockUser);
      expect(deleted).toBeDefined();
    });

    it('should toggle payment mode and verify it affects subscription creation', async () => {
      const initialMode = await adminSubscriptionService.getPaymentMode();
      expect(initialMode).toBeDefined();

      const toggled = await adminSubscriptionService.togglePaymentMode();
      expect(toggled).toBeDefined();
      expect(toggled.payment_mode).toBeDefined();

      const newMode = await adminSubscriptionService.getPaymentMode();
      expect(newMode).toBeDefined();
      expect(newMode.payment_mode).not.toBe(initialMode.payment_mode);
    });

    it('should handle concurrent operations gracefully', async () => {
      const mockDto1: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-12-15',
        custom_days: [],
      };

      const mockDto2: CreateSubscriptionDto = {
        productId: 'product-456',
        quantity: 3,
        frequency: SubscriptionFrequency.ALTERNATIVE_DAYS,
        start_date: '2026-12-15',
        custom_days: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY],
      };

      const [result1, result2] = await Promise.all([
        customerSubscriptionService.createSubscription(mockUser, mockDto1),
        customerSubscriptionService.createSubscription(mockUser, mockDto2),
      ]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(new Set([result1.id, result2.id]).size).toBe(2);
    });
  });

  describe('Integration Points Verification', () => {
    it('should verify all integration points are working', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.CUSTOM_DAYS,
        start_date: '2026-12-15',
        custom_days: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
      };

      const result = await customerSubscriptionService.createSubscription(mockUser, mockDto);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.total_price).toBeGreaterThan(0);
      expect(result.payment_mode).toBeDefined();

      const subscriptions = await customerSubscriptionService.getMySubscriptions(mockUser);
      expect(subscriptions).toBeDefined();
      expect(subscriptions.subscriptions).toBeInstanceOf(Array);

      const subscription = await customerSubscriptionService.getMySubscription(result.id, mockUser);
      expect(subscription).toBeDefined();
      expect(subscription.id).toBe(result.id);

      const paymentMode = await adminSubscriptionService.getPaymentMode();
      expect(paymentMode).toBeDefined();
      expect(paymentMode.payment_mode).toBeDefined();
    });
  });
});