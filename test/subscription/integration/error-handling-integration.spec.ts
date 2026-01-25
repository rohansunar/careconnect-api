import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CustomerSubscriptionService } from '../../services/customer-subscription.service';
import { SubscriptionRepositoryService } from '../../repositories/subscription.repository';
import { DeliveryFrequencyService } from '../../services/delivery-frequency.service';
import { DeliveryFrequencyFactoryService } from '../../services/delivery-frequency/delivery-frequency.factory';
import { PriceCalculationService } from '../../services/price-calculation.service';
import { PriceCalculatorFactoryService } from '../../services/price-calculation/price-calculator.factory';
import { PaymentModeService } from '../../services/payment-mode.service';
import { JsonPaymentModeRepository } from '../../services/payment-mode/payment-mode.repository';
import { SubscriptionValidationService } from '../../services/subscription-validation.service';
import { PrismaService } from '../../../common/database/prisma.service';
import { CreateSubscriptionDto } from '../../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../../dto/update-subscription.dto';
import { SubscriptionFrequency, DayOfWeek } from '../../interfaces/delivery-frequency.interface';
import { User, UserRole } from '../../../common/interfaces/user.interface';
import { NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';

describe('Error Handling Integration Tests', () => {
  let app: INestApplication;
  let customerSubscriptionService: CustomerSubscriptionService;
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
        DeliveryFrequencyService,
        PriceCalculationService,
        PaymentModeService,
        SubscriptionValidationService,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    customerSubscriptionService = module.get<CustomerSubscriptionService>(CustomerSubscriptionService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Error Handling Tests', () => {
    it('should throw NotFoundException when customer address not found', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-01-15',
        custom_days: [],
      };

      try {
        await customerSubscriptionService.createSubscription(mockUser, mockDto);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Customer Address not found');
      }
    });

    it('should throw NotFoundException when product not found', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'non-existent-product',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-01-15',
        custom_days: [],
      };

      const prisma = module.get<PrismaService>(PrismaService);
      jest.spyOn(prisma.customerAddress, 'findFirst').mockResolvedValue({
        id: 'address-123',
        customerId: mockUser.id,
        is_active: true,
        isDefault: true,
      } as any);
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

      try {
        await customerSubscriptionService.createSubscription(mockUser, mockDto);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Product not found or cannot be subscribed');
      }
    });

    it('should throw BadRequestException when start date is in the past', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2020-01-01',
        custom_days: [],
      };

      const prisma = module.get<PrismaService>(PrismaService);
      jest.spyOn(prisma.customerAddress, 'findFirst').mockResolvedValue({
        id: 'address-123',
        customerId: mockUser.id,
        is_active: true,
        isDefault: true,
      } as any);
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
        id: 'product-123',
        price: 100,
        is_schedulable: true,
      } as any);

      try {
        await customerSubscriptionService.createSubscription(mockUser, mockDto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Start date cannot be in the past');
      }
    });

    it('should throw ConflictException when duplicate subscription exists', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-02-15',
        custom_days: [],
      };

      const prisma = module.get<PrismaService>(PrismaService);
      jest.spyOn(prisma.customerAddress, 'findFirst').mockResolvedValue({
        id: 'address-123',
        customerId: mockUser.id,
        is_active: true,
        isDefault: true,
      } as any);
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
        id: 'product-123',
        price: 100,
        is_schedulable: true,
      } as any);

      const subscriptionRepository = module.get<SubscriptionRepositoryService>(SubscriptionRepositoryService);
      jest.spyOn(subscriptionRepository, 'findByCustomerAndProduct').mockResolvedValue([
        {
          id: 'existing-sub',
          customerId: 'address-123', // note: it's customerAddress.id
          productId: mockDto.productId,
          quantity: 1,
          price: 100,
          frequency: SubscriptionFrequency.DAILY,
          customDays: [],
          startDate: new Date(),
          nextDeliveryDate: new Date(),
          endDate: undefined,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      try {
        await customerSubscriptionService.createSubscription(mockUser, mockDto);
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.message).toContain('A subscription for this product already exists');
      }
    });

    it('should throw NotFoundException when subscription not found', async () => {
      try {
        await customerSubscriptionService.getMySubscription('non-existent-sub', mockUser);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Subscription not found');
      }
    });

    it('should throw ForbiddenException when user does not own subscription', async () => {
      const subscriptionRepository = module.get<SubscriptionRepositoryService>(SubscriptionRepositoryService);
      jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue({
        id: 'sub-123',
        customerId: 'other-user',
        productId: 'product-123',
        quantity: 2,
        price: 200,
        frequency: SubscriptionFrequency.DAILY,
        customDays: [],
        startDate: new Date(),
        nextDeliveryDate: new Date(),
        endDate: undefined,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      try {
        await customerSubscriptionService.getMySubscription('sub-123', mockUser);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('Access denied');
      }
    });

    it('should throw NotFoundException when updating non-existent subscription', async () => {
      const updateDto: UpdateSubscriptionDto = {
        quantity: 3,
        frequency: SubscriptionFrequency.ALTERNATIVE_DAYS,
        custom_days: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY],
        start_date: new Date('2026-01-15'),
      };

      const subscriptionRepository = module.get<SubscriptionRepositoryService>(SubscriptionRepositoryService);
      jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue(null);

      try {
        await customerSubscriptionService.updateMySubscription('non-existent-sub', updateDto, mockUser);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Subscription not found');
      }
    });

    it('should throw ForbiddenException when user does not own subscription being updated', async () => {
      const subscriptionRepository = module.get<SubscriptionRepositoryService>(SubscriptionRepositoryService);
      jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue({
        id: 'sub-123',
        customerId: 'other-user',
        productId: 'product-123',
        quantity: 2,
        price: 200,
        frequency: SubscriptionFrequency.DAILY,
        customDays: [],
        startDate: new Date(),
        nextDeliveryDate: new Date(),
        endDate: undefined,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updateDto: UpdateSubscriptionDto = {
        quantity: 3,
        frequency: SubscriptionFrequency.ALTERNATIVE_DAYS,
        custom_days: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY],
        start_date: new Date('2026-01-15'),
      };

      try {
        await customerSubscriptionService.updateMySubscription('sub-123', updateDto, mockUser);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('Access denied');
      }
    });

    it('should throw NotFoundException when toggling non-existent subscription', async () => {
      const subscriptionRepository = module.get<SubscriptionRepositoryService>(SubscriptionRepositoryService);
      jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue(null);

      try {
        await customerSubscriptionService.toggleSubscriptionStatus('non-existent-sub', mockUser);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Subscription not found');
      }
    });

    it('should throw ForbiddenException when user does not own subscription being toggled', async () => {
      const subscriptionRepository = module.get<SubscriptionRepositoryService>(SubscriptionRepositoryService);
      jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue({
        id: 'sub-123',
        customerId: 'other-user',
        productId: 'product-123',
        quantity: 2,
        price: 200,
        frequency: SubscriptionFrequency.DAILY,
        customDays: [],
        startDate: new Date(),
        nextDeliveryDate: new Date(),
        endDate: undefined,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      try {
        await customerSubscriptionService.toggleSubscriptionStatus('sub-123', mockUser);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('Access denied');
      }
    });

    it('should throw NotFoundException when deleting non-existent subscription', async () => {
      const subscriptionRepository = module.get<SubscriptionRepositoryService>(SubscriptionRepositoryService);
      jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue(null);

      try {
        await customerSubscriptionService.deleteMySubscription('non-existent-sub', mockUser);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Subscription not found');
      }
    });

    it('should throw ForbiddenException when user does not own subscription being deleted', async () => {
      const subscriptionRepository = module.get<SubscriptionRepositoryService>(SubscriptionRepositoryService);
      jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue({
        id: 'sub-123',
        customerId: 'other-user',
        productId: 'product-123',
        quantity: 2,
        price: 200,
        frequency: SubscriptionFrequency.DAILY,
        customDays: [],
        startDate: new Date(),
        nextDeliveryDate: new Date(),
        endDate: undefined,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      try {
        await customerSubscriptionService.deleteMySubscription('sub-123', mockUser);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('Access denied');
      }
    });
  });

  describe('Validation Error Tests', () => {
    it('should throw BadRequestException for invalid frequency', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: 'INVALID' as SubscriptionFrequency,
        start_date: '2026-01-15',
        custom_days: [],
      };

      const prisma = module.get<PrismaService>(PrismaService);
      jest.spyOn(prisma.customerAddress, 'findFirst').mockResolvedValue({
        id: 'address-123',
        customerId: mockUser.id,
        is_active: true,
        isDefault: true,
      } as any);
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
        id: 'product-123',
        price: 100,
        is_schedulable: true,
      } as any);

      try {
        await customerSubscriptionService.createSubscription(mockUser, mockDto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should throw BadRequestException for invalid custom days', async () => {
      const mockDto: CreateSubscriptionDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: SubscriptionFrequency.CUSTOM_DAYS,
        start_date: '2026-01-15',
        custom_days: [10 as DayOfWeek],
      };

      const prisma = module.get<PrismaService>(PrismaService);
      jest.spyOn(prisma.customerAddress, 'findFirst').mockResolvedValue({
        id: 'address-123',
        customerId: mockUser.id,
        is_active: true,
        isDefault: true,
      } as any);
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
        id: 'product-123',
        price: 100,
        is_schedulable: true,
      } as any);

      try {
        await customerSubscriptionService.createSubscription(mockUser, mockDto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });
});