import { Test, TestingModule } from '@nestjs/testing';
import { VendorOrderService } from '../../src/order/services/vendor-order.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { CartService } from '../../src/cart/services/cart.service';
import { OrderNotificationOrchestrator } from '../../src/notification/services/orchestrators/order-notification.orchestrator';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMode } from '@prisma/client';

/**
 * Mock user object matching the JWT strategy return format.
 * The role is a string as returned by the UnifiedJwtStrategy.
 */
interface MockUser {
  id: string;
  email?: string;
  phone?: string;
  role: string;
  vendorId?: string;
  customerId?: string;
  riderId?: string;
  adminId?: string;
}

describe('VendorOrderService', () => {
  let service: VendorOrderService;
  let prismaService: PrismaService;
  let notificationOrchestrator: OrderNotificationOrchestrator;

  const mockUser: MockUser = {
    id: 'vendor-123',
    phone: '1234567890',
    role: 'vendor',
    vendorId: 'vendor-123',
    customerId: undefined,
    riderId: undefined,
    adminId: undefined,
  };

  const mockOrder = {
    id: 'order-123',
    orderNo: 'ORD-001',
    vendorId: 'vendor-123',
    customerId: 'customer-123',
    delivery_status: 'OUT_FOR_DELIVERY',
    delivery_otp: '1234',
    payment_mode: PaymentMode.COD,
    payment_status: 'PENDING',
    orderItems: [
      {
        id: 'order-item-1',
        price: 100,
        quantity: 2,
        product: { categoryId: 'category-1' },
      },
      {
        id: 'order-item-2',
        price: 50,
        quantity: 1,
        product: { categoryId: 'category-2' },
      },
    ],
  };

  const mockOrderWithOnlinePayment = {
    id: 'order-456',
    orderNo: 'ORD-002',
    vendorId: 'vendor-123',
    customerId: 'customer-123',
    delivery_status: 'OUT_FOR_DELIVERY',
    delivery_otp: '5678',
    payment_mode: PaymentMode.ONLINE,
    payment_status: 'PAID',
    orderItems: [
      {
        id: 'order-item-3',
        price: 200,
        quantity: 1,
        product: { categoryId: 'category-1' },
      },
    ],
  };

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    platformFee: {
      findFirst: jest.fn(),
    },
    ledger: {
      create: jest.fn(),
    },
  };

  const mockCartService = {};

  const mockNotificationOrchestrator = {
    sendOrderDeliveredNotifications: jest.fn().mockResolvedValue({
      customerEmailSent: true,
      customerPushSent: true,
      vendorEmailSent: true,
      vendorPushSent: true,
      adminEmailSent: true,
      errors: [],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorOrderService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: CartService,
          useValue: mockCartService,
        },
        {
          provide: OrderNotificationOrchestrator,
          useValue: mockNotificationOrchestrator,
        },
      ],
    }).compile();

    service = module.get<VendorOrderService>(VendorOrderService);
    prismaService = module.get<PrismaService>(PrismaService);
    notificationOrchestrator = module.get<OrderNotificationOrchestrator>(OrderNotificationOrchestrator);
    jest.clearAllMocks();
  });

  describe('verifyDeliveryOtp', () => {
    it('should successfully verify OTP, mark order as delivered, and create ledger entries for COD payment', async () => {
      // Mock platform fee lookup (returns null = use default 10%)
      mockPrisma.platformFee.findFirst.mockResolvedValue(null);
      
      // Mock ledger creation
      mockPrisma.ledger.create.mockResolvedValue({ id: 'ledger-1' });
      
      // Mock order update
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        delivery_status: 'DELIVERED',
        delivery_otp: null,
        otp_verified: true,
        payment_status: 'PAID',
      });

      const result = await service.verifyDeliveryOtp('order-123', '1234', mockUser as any);

      expect(result.success).toBe(true);
      expect(result.platformFees).toHaveLength(2);
      expect(result.platformFees[0]).toEqual({
        orderItemId: 'order-item-1',
        listingFee: 20, // 100 * 2 * 10% = 20
      });
      expect(result.platformFees[1]).toEqual({
        orderItemId: 'order-item-2',
        listingFee: 5, // 50 * 1 * 10% = 5
      });
      
      // Verify order update was called
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: expect.objectContaining({
          delivery_status: 'DELIVERED',
          payment_status: 'PAID',
        }),
      });
      
      // Verify ledger entries were created
      expect(mockPrisma.ledger.create).toHaveBeenCalledTimes(2);
      
      // Verify notification was sent
      expect(mockNotificationOrchestrator.sendOrderDeliveredNotifications).toHaveBeenCalledWith('order-123');
    });

    it('should verify OTP and mark order as delivered without changing ONLINE payment status', async () => {
      // Mock platform fee lookup
      mockPrisma.platformFee.findFirst.mockResolvedValue({
        product_listing_fee: 5, // 5% fee
      });
      
      // Mock ledger creation
      mockPrisma.ledger.create.mockResolvedValue({ id: 'ledger-2' });
      
      // Mock order update
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrderWithOnlinePayment,
        delivery_status: 'DELIVERED',
        delivery_otp: null,
        otp_verified: true,
      });

      const result = await service.verifyDeliveryOtp('order-456', '5678', mockUser as any);

      expect(result.success).toBe(true);
      expect(result.platformFees).toHaveLength(1);
      expect(result.platformFees[0]).toEqual({
        orderItemId: 'order-item-3',
        listingFee: 10, // 200 * 1 * 5% = 10
      });
      
      // Verify order update was called without changing payment_status
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-456' },
        data: expect.objectContaining({
          delivery_status: 'DELIVERED',
        }),
      });
    });

    it('should throw ForbiddenException when order does not belong to vendor', async () => {
      const unauthorizedOrder = { ...mockOrder, vendorId: 'different-vendor' };
      mockPrisma.order.findUnique.mockResolvedValue(unauthorizedOrder);

      await expect(
        service.verifyDeliveryOtp('order-123', '1234', mockUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when OTP is invalid', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.verifyDeliveryOtp('order-123', '9999', mockUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order is already delivered', async () => {
      const deliveredOrder = { ...mockOrder, delivery_status: 'DELIVERED' };
      mockPrisma.order.findUnique.mockResolvedValue(deliveredOrder);

      await expect(
        service.verifyDeliveryOtp('order-123', '1234', mockUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order has not been marked for delivery', async () => {
      const pendingOrder = { ...mockOrder, delivery_status: 'PENDING' };
      mockPrisma.order.findUnique.mockResolvedValue(pendingOrder);

      await expect(
        service.verifyDeliveryOtp('order-123', '1234', mockUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyDeliveryOtp('non-existent-order', '1234', mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should continue processing even if ledger creation fails for one item', async () => {
      // Mock platform fee lookup
      mockPrisma.platformFee.findFirst.mockResolvedValue(null);
      
      // Mock ledger creation - fail for first item, succeed for second
      mockPrisma.ledger.create
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValue({ id: 'ledger-3' });
      
      // Mock order update
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        delivery_status: 'DELIVERED',
        delivery_otp: null,
        otp_verified: true,
        payment_status: 'PAID',
      });

      const result = await service.verifyDeliveryOtp('order-123', '1234', mockUser as any);

      expect(result.success).toBe(true);
      expect(result.platformFees).toHaveLength(1);
      expect(result.platformFees[0]).toEqual({
        orderItemId: 'order-item-2',
        listingFee: 5,
      });
    });

    it('should skip items with zero or negative listing fee', async () => {
      const orderWithZeroPrice = {
        ...mockOrder,
        orderItems: [
          {
            id: 'order-item-zero',
            price: 0,
            quantity: 1,
            product: { categoryId: 'category-1' },
          },
        ],
      };
      
      mockPrisma.order.findUnique.mockResolvedValue(orderWithZeroPrice);
      mockPrisma.order.update.mockResolvedValue({
        ...orderWithZeroPrice,
        delivery_status: 'DELIVERED',
        delivery_otp: null,
        otp_verified: true,
        payment_status: 'PAID',
      });

      const result = await service.verifyDeliveryOtp('order-123', '1234', mockUser as any);

      expect(result.success).toBe(true);
      expect(result.platformFees).toHaveLength(0);
      expect(mockPrisma.ledger.create).not.toHaveBeenCalled();
    });

    it('should handle notification errors gracefully', async () => {
      // Mock platform fee lookup
      mockPrisma.platformFee.findFirst.mockResolvedValue(null);
      
      // Mock ledger creation
      mockPrisma.ledger.create.mockResolvedValue({ id: 'ledger-4' });
      
      // Mock order update
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        delivery_status: 'DELIVERED',
        delivery_otp: null,
        otp_verified: true,
        payment_status: 'PAID',
      });
      
      // Mock notification error
      mockNotificationOrchestrator.sendOrderDeliveredNotifications.mockRejectedValue(
        new Error('Notification service unavailable'),
      );

      const result = await service.verifyDeliveryOtp('order-123', '1234', mockUser as any);

      // Should still return success even if notification fails
      expect(result.success).toBe(true);
      expect(result.platformFees).toHaveLength(2);
    });
  });
});
