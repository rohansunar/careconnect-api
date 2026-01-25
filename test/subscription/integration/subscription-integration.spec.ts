import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { CustomerSubscriptionService } from '../../services/customer-subscription.service';
import { SubscriptionRepositoryService } from '../../repositories/subscription.repository';
import { DeliveryFrequencyService } from '../../services/delivery-frequency.service';
import { DeliveryFrequencyFactoryService } from '../../services/delivery-frequency/delivery-frequency.factory';
import { PriceCalculationService } from '../../services/price-calculation.service';
import { PriceCalculatorFactoryService } from '../../services/price-calculation/price-calculator.factory';
import { PaymentModeService } from '../../services/payment-mode.service';
import { JsonPaymentModeRepository } from '../../services/payment-mode/payment-mode.repository';
import { SubscriptionValidationService } from '../../services/subscription-validation.service';
import { CreateSubscriptionDto } from '../../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../../dto/update-subscription.dto';
import {
  SubscriptionFrequency,
  DayOfWeek,
} from '../../interfaces/delivery-frequency.interface';
import { User, UserRole } from '../../../common/interfaces/user.interface';

describe('Subscription Integration Tests', () => {
  let app: INestApplication;
  let customerSubscriptionService: CustomerSubscriptionService;
  let prisma: PrismaService;
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

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        CustomerSubscriptionService,
        SubscriptionRepositoryService,
        DeliveryFrequencyService,
        DeliveryFrequencyFactoryService,
        PriceCalculationService,
        PriceCalculatorFactoryService,
        PaymentModeService,
        JsonPaymentModeRepository,
        SubscriptionValidationService,
        PrismaService,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    customerSubscriptionService = module.get<CustomerSubscriptionService>(
      CustomerSubscriptionService,
    );
    prisma = module.get<PrismaService>(PrismaService);

    // Mock validation to bypass DB checks
    const validationService = module.get<SubscriptionValidationService>(
      SubscriptionValidationService,
    );
    jest
      .spyOn(validationService, 'validateInputs')
      .mockResolvedValue({ isValid: true });

    // Mock prisma for address and product checks
    jest.spyOn(prisma.customerAddress, 'findFirst').mockResolvedValue({
      id: 'addr-123',
      customerId: mockUser.id,
      is_active: true,
      isDefault: true,
    } as any);
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 'product-123',
      price: 100,
      is_schedulable: true,
    } as any);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Database Integration Tests', () => {
    it('should create a subscription and verify database interactions', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-02-15',
        custom_days: [],
      };

      const result = await customerSubscriptionService.createSubscription(
        mockUser,
        mockDto,
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.total_price).toBeGreaterThan(0);
      expect(result.payment_mode).toBeDefined();

      const createdSubscription = await prisma.subscription.findUnique({
        where: { id: result.id },
      });

      expect(createdSubscription).toBeDefined();
      if (createdSubscription) {
        expect(createdSubscription.customerAddressId).toBeDefined();
        expect(createdSubscription.productId).toBe(mockDto.productId);
        expect(createdSubscription.quantity).toBe(mockDto.quantity);
      }
    });

    it('should retrieve subscriptions from database', async () => {
      const result =
        await customerSubscriptionService.getMySubscriptions(mockUser);

      expect(result).toBeDefined();
      expect(result.subscriptions).toBeInstanceOf(Array);
      expect(result.total).toBeDefined();
      expect(result.page).toBeDefined();
      expect(result.limit).toBeDefined();
    });

    it('should update subscription and verify database changes', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-02-15',
        custom_days: [],
      };

      const created = await customerSubscriptionService.createSubscription(
        mockUser,
        mockDto,
      );

      const updateDto: UpdateSubscriptionDto = {
        quantity: 3,
        frequency: SubscriptionFrequency.ALTERNATIVE_DAYS,
        custom_days: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY],
        start_date: new Date('2026-02-15'),
      };

      const updated = await customerSubscriptionService.updateMySubscription(
        created.id,
        updateDto,
        mockUser,
      );

      expect(updated).toBeDefined();
      expect(updated.quantity).toBe(updateDto.quantity);

      const dbSubscription = await prisma.subscription.findUnique({
        where: { id: created.id },
      });

      expect(dbSubscription).toBeDefined();
      if (dbSubscription) {
        expect(dbSubscription.quantity).toBe(updateDto.quantity);
      }
    });

    it('should delete subscription and verify database removal', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-02-15',
        custom_days: [],
      };

      const created = await customerSubscriptionService.createSubscription(
        mockUser,
        mockDto,
      );

      const deleted = await customerSubscriptionService.deleteMySubscription(
        created.id,
        mockUser,
      );

      expect(deleted).toBeDefined();

      const dbSubscription = await prisma.subscription.findUnique({
        where: { id: created.id },
      });

      expect(dbSubscription).toBeNull();
    });
  });

  describe('Service-to-Service Communication Tests', () => {
    it('should integrate delivery frequency service correctly', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.CUSTOM_DAYS,
        start_date: '2026-12-15',
        custom_days: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
      };

      const result = await customerSubscriptionService.createSubscription(
        mockUser,
        mockDto,
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      const dbSubscription = await prisma.subscription.findUnique({
        where: { id: result.id },
      });

      expect(dbSubscription).toBeDefined();
      if (dbSubscription) {
        expect(dbSubscription.custom_days).toHaveLength(3);
      }
    });

    it('should integrate price calculation service correctly', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-02-15',
        custom_days: [],
      };

      const result = await customerSubscriptionService.createSubscription(
        mockUser,
        mockDto,
      );

      expect(result).toBeDefined();
      expect(result.total_price).toBeGreaterThan(0);
    });

    it('should integrate payment mode service correctly', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-12-15',
        custom_days: [],
      };

      const result = await customerSubscriptionService.createSubscription(
        mockUser,
        mockDto,
      );

      expect(result).toBeDefined();
      expect(result.payment_mode).toBeDefined();
      expect(['UPFRONT', 'POST_DELIVERY']).toContain(result.payment_mode);
    });
  });
});
