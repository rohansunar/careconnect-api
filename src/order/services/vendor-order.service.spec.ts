import { Test, TestingModule } from '@nestjs/testing';
import { VendorOrderService } from './vendor-order.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
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
  };

  const mockUpdatedOrder = {
    ...mockOrder,
    delivery_status: 'DELIVERED',
    delivery_otp: null,
    otp_verified: true,
    payment_status: 'PAID',
  };

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCartService = {};

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
      ],
    }).compile();

    service = module.get<VendorOrderService>(VendorOrderService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('verifyDeliveryOtp', () => {
    it('should successfully verify OTP and mark order as delivered with COD payment marked as PAID', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockUpdatedOrder);

      const result = await service.verifyDeliveryOtp('order-123', '1234', mockUser as any);

      expect(result.success).toBe(true);
      expect(result.order.delivery_status).toBe('DELIVERED');
      expect(result.order.payment_status).toBe('PAID');
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: expect.objectContaining({
          delivery_status: 'DELIVERED',
          payment_status: 'PAID',
        }),
        include: expect.any(Object),
      });
    });

    it('should verify OTP and mark order as delivered without changing ONLINE payment status', async () => {
      const onlineOrder = { ...mockOrderWithOnlinePayment };
      const updatedOnlineOrder = {
        ...onlineOrder,
        delivery_status: 'DELIVERED',
        delivery_otp: null,
        otp_verified: true,
      };

      mockPrisma.order.findUnique.mockResolvedValue(onlineOrder);
      mockPrisma.order.update.mockResolvedValue(updatedOnlineOrder);

      const result = await service.verifyDeliveryOtp('order-456', '5678', mockUser as any);

      expect(result.success).toBe(true);
      expect(result.order.delivery_status).toBe('DELIVERED');
      // For ONLINE payment, payment_status should remain as is
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-456' },
        data: expect.objectContaining({
          delivery_status: 'DELIVERED',
        }),
        include: expect.any(Object),
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
  });
});
