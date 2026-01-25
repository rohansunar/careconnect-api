import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionValidationService } from '../services/subscription-validation.service';
import { PrismaService } from '../../common/database/prisma.service';
import { DeliveryFrequencyService } from '../services/delivery-frequency.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { SubscriptionFrequency, DayOfWeek } from '../interfaces/delivery-frequency.interface';
import { User, UserRole } from '../../common/interfaces/user.interface';

describe('SubscriptionValidationService', () => {
  let service: SubscriptionValidationService;
  let prisma: PrismaService;
  let deliveryFrequencyService: DeliveryFrequencyService;

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

  const mockDto: CreateSubscriptionDto = {
    productId: 'product-123',
    quantity: 2,
    frequency: SubscriptionFrequency.DAILY,
    start_date: '2026-01-15',
    custom_days: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionValidationService,
        {
          provide: PrismaService,
          useValue: {
            customerAddress: {
              findFirst: jest.fn(),
            },
            product: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: DeliveryFrequencyService,
          useValue: {
            validateFrequency: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionValidationService>(SubscriptionValidationService);
    prisma = module.get<PrismaService>(PrismaService);
    deliveryFrequencyService = module.get<DeliveryFrequencyService>(DeliveryFrequencyService);
  });

  describe('validateInputs', () => {
    it('should return valid result when all inputs are valid', async () => {
      const mockCustomerAddress = {
        id: 'address-123',
        customerId: 'user-123',
        label: null,
        address: null,
        locationId: null,
        pincode: null,
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        isDefault: true,
        isServiceable: true,
      };

      const mockProduct = {
        id: 'product-123',
        price: 10,
        is_schedulable: true,
      };

      jest.spyOn(prisma.customerAddress, 'findFirst').mockResolvedValue(mockCustomerAddress as any);
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
      jest.spyOn(deliveryFrequencyService, 'validateFrequency').mockReturnValue(undefined);

      const result = await service.validateInputs(mockDto, mockUser);

      expect(result).toEqual({ isValid: true });
    });

    it('should return invalid result when customer address is not found', async () => {
      jest.spyOn(prisma.customerAddress, 'findFirst').mockResolvedValue(null);

      const result = await service.validateInputs(mockDto, mockUser);

      expect(result).toEqual({ isValid: false, errors: ['Customer Address not found'] });
    });

    it('should return invalid result when product is not found', async () => {
      const mockCustomerAddress = {
        id: 'address-123',
        customerId: 'user-123',
        label: null,
        address: null,
        locationId: null,
        pincode: null,
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        isDefault: true,
        isServiceable: true,
      };

      jest.spyOn(prisma.customerAddress, 'findFirst').mockResolvedValue(mockCustomerAddress as any);
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

      const result = await service.validateInputs(mockDto, mockUser);

      expect(result).toEqual({ isValid: false, errors: ['Product not found or cannot be subscribed'] });
    });

    it('should return invalid result when product is not subscribable', async () => {
      const mockCustomerAddress = {
        id: 'address-123',
        customerId: 'user-123',
        label: null,
        address: null,
        locationId: null,
        pincode: null,
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        isDefault: true,
        isServiceable: true,
      };

      const mockProduct = {
        id: 'product-123',
        price: 10,
        is_schedulable: false,
      };

      jest.spyOn(prisma.customerAddress, 'findFirst').mockResolvedValue(mockCustomerAddress as any);
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);

      const result = await service.validateInputs(mockDto, mockUser);

      expect(result).toEqual({ isValid: false, errors: ['Product not found or cannot be subscribed'] });
    });

    it('should return invalid result when frequency validation fails', async () => {
      const mockCustomerAddress = {
        id: 'address-123',
        customerId: 'user-123',
        label: null,
        address: null,
        locationId: null,
        pincode: null,
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        isDefault: true,
        isServiceable: true,
      };

      const mockProduct = {
        id: 'product-123',
        price: 10,
        is_schedulable: true,
      };

      jest.spyOn(prisma.customerAddress, 'findFirst').mockResolvedValue(mockCustomerAddress as any);
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
      jest.spyOn(deliveryFrequencyService, 'validateFrequency').mockImplementation(() => {
        throw new Error('Invalid frequency');
      });

      const result = await service.validateInputs(mockDto, mockUser);

      expect(result).toEqual({ isValid: false, errors: ['Invalid frequency'] });
    });
  });
});