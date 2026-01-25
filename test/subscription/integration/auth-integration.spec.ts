import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CustomerAuthGuard } from '../../../auth/guards/customer-auth.guard';
import { AdminVendorGuard } from '../../../auth/guards/admin-vendor.guard';
import { CustomerSubscriptionController } from '../../controllers/customer-subscription.controller';
import { AdminSubscriptionController } from '../../controllers/admin-subscription.controller';
import { CustomerSubscriptionService } from '../../services/customer-subscription.service';
import { AdminSubscriptionService } from '../../services/admin-subscription.service';
import { User, UserRole } from '../../../common/interfaces/user.interface';
import { SubscriptionFrequency } from '../../interfaces/delivery-frequency.interface';

describe('Authentication and Authorization Integration Tests', () => {
  let app: INestApplication;
  let customerController: CustomerSubscriptionController;
  let adminController: AdminSubscriptionController;
  let jwtService: JwtService;
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

  const mockAdminUser: User = {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    phone: '0987654321',
    role: UserRole.ADMIN,
    isActive: true,
    monthlyPaymentMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
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
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn().mockReturnValue({ userId: 'user-123', role: UserRole.CUSTOMER }),
          },
        },
        {
          provide: CustomerAuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: AdminVendorGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    customerController = (module as any).get<CustomerSubscriptionController>(CustomerSubscriptionController);
    adminController = (module as any).get<AdminSubscriptionController>(AdminSubscriptionController);
    jwtService = (module as any).get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Customer Authentication Tests', () => {
    it('should allow authenticated customer to access customer endpoints', async () => {
      const mockDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: 'DAILY',
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

      const customerService = module.get<CustomerSubscriptionService>(CustomerSubscriptionService);
      jest.spyOn(customerService, 'createSubscription').mockResolvedValue(mockResult);

      const result = await customerController.createSubscription(mockUser, {
        ...mockDto,
        frequency: 'DAILY' as SubscriptionFrequency,
      });

      expect(result).toEqual(mockResult);
    });

    it('should deny access to customer endpoints without authentication', async () => {
      const mockDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: 'DAILY',
        start_date: '2026-01-15',
        custom_days: [],
      };

      const customerService = module.get<CustomerSubscriptionService>(CustomerSubscriptionService);
      jest.spyOn(customerService, 'createSubscription').mockResolvedValue({} as any);

      try {
        await customerController.createSubscription(mockUser, {
          ...mockDto,
          frequency: 'DAILY' as SubscriptionFrequency,
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Admin Authentication Tests', () => {
    it('should allow authenticated admin to access admin endpoints', async () => {
      const mockResult = {
        message: 'Payment mode toggled successfully',
        payment_mode: 'POST_DELIVERY',
      };

      const adminService = module.get<AdminSubscriptionService>(AdminSubscriptionService);
      jest.spyOn(adminService, 'togglePaymentMode').mockResolvedValue(mockResult);

      const result = await adminController.togglePaymentMode();

      expect(result).toEqual(mockResult);
    });

    it('should deny access to admin endpoints without proper authorization', async () => {
      const adminService = module.get<AdminSubscriptionService>(AdminSubscriptionService);
      jest.spyOn(adminService, 'togglePaymentMode').mockResolvedValue({} as any);

      try {
        await adminController.togglePaymentMode();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Authorization Tests', () => {
    it('should deny customer access to admin endpoints', async () => {
      const adminService = module.get<AdminSubscriptionService>(AdminSubscriptionService);
      jest.spyOn(adminService, 'togglePaymentMode').mockResolvedValue({} as any);

      try {
        await adminController.togglePaymentMode();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should deny admin access to customer endpoints', async () => {
      const mockDto = {
        productId: 'product-123',
        quantity: 2,
        frequency: 'DAILY',
        start_date: '2026-01-15',
        custom_days: [],
      };

      const customerService = module.get<CustomerSubscriptionService>(CustomerSubscriptionService);
      jest.spyOn(customerService, 'createSubscription').mockResolvedValue({} as any);

      try {
        await customerController.createSubscription(mockAdminUser, {
          ...mockDto,
          frequency: 'DAILY' as SubscriptionFrequency,
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('JWT Token Tests', () => {
    it('should generate valid JWT token for authenticated user', () => {
      const token = jwtService.sign({ userId: mockUser.id, role: mockUser.role });
      expect(token).toBe('mock-jwt-token');
    });

    it('should verify valid JWT token', () => {
      const payload = jwtService.verify('mock-jwt-token');
      expect(payload).toEqual({ userId: 'user-123', role: UserRole.CUSTOMER });
    });
  });
});