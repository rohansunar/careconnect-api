import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '../../../src/payment/services/payment.service';
import { PrismaService } from '../../../src/common/database/prisma.service';
import { PaymentProviderService } from '../../../src/payment/services/payment-provider.service';
import { PaymentStatus, SubscriptionStatus, PaymentMode } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock data
const mockPayment = {
  id: 'payment-123',
  amount: new Decimal(1000),
  currency: 'INR',
  provider: 'RAZORPAY',
  provider_payment_id: 'pay_abc123',
  status: PaymentStatus.PENDING,
  initiated_at: new Date(),
  completed_at: null,
  reconciled: false,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockOrder = {
  id: 'order-123',
  orderNo: 'ORD-001',
  customerId: 'customer-123',
  vendorId: 'vendor-123',
  addressId: 'address-123',
  total_amount: new Decimal(1000),
  payment_status: 'PENDING',
  payment_mode: PaymentMode.ONLINE,
  delivery_status: 'PENDING',
  created_at: new Date(),
  updated_at: new Date(),
  orderItems: [
    {
      id: 'orderItem-123',
      orderId: 'order-123',
      productId: 'product-123',
      quantity: 2,
      price: new Decimal(500),
      deposit: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      product: {
        id: 'product-123',
        categoryId: 'category-123',
        name: 'Test Product',
      },
    },
  ],
  vendor: {
    id: 'vendor-123',
    name: 'Test Vendor',
  },
};

const mockPlatformFee = {
  id: 'platformFee-123',
  categoryId: 'category-123',
  product_listing_fee: new Decimal(5.00),
  platform_fee: new Decimal(5.00),
  transaction_fee: new Decimal(2.00),
  sms_fee: new Decimal(1.00),
  whatsapp_fee: new Decimal(2.00),
  created_at: new Date(),
  updated_at: new Date(),
};

// Mock ledger create function tracking
const ledgerCreateMock = jest.fn().mockResolvedValue({ id: 'ledger-123' });

describe('PaymentService', () => {
  let service: PaymentService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      payment: {
        update: jest.fn().mockResolvedValue(mockPayment),
      },
      order: {
        update: jest.fn().mockResolvedValue(mockOrder),
        findUnique: jest.fn().mockResolvedValue(mockOrder),
      },
      subscription: {
        update: jest.fn().mockResolvedValue({}),
      },
      ledger: {
        create: ledgerCreateMock,
      },
      platformFee: {
        findFirst: jest.fn().mockResolvedValue(mockPlatformFee),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const mockPaymentProvider = {
      initiatePayment: jest.fn(),
      verifyWebhook: jest.fn(),
      initiateRefund: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: PaymentProviderService,
          useValue: mockPaymentProvider,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prismaService = module.get(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('handleSuccessfulPayment', () => {
    it('should update payment status to PAID', async () => {
      const mockPrisma = {
        payment: {
          update: jest.fn().mockResolvedValue(mockPayment),
        },
        order: {
          update: jest.fn().mockResolvedValue(mockOrder),
          findUnique: jest.fn().mockResolvedValue(mockOrder),
        },
        subscription: {
          update: jest.fn().mockResolvedValue({}),
        },
        ledger: {
          create: ledgerCreateMock,
        },
        platformFee: {
          findFirst: jest.fn().mockResolvedValue(mockPlatformFee),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
      };

      (prismaService as any).$transaction = mockPrisma.$transaction;

      const webhookData = {
        payload: {
          payment: {
            entity: {
              notes: {
                orderId: 'order-123',
              },
            },
          },
        },
      };

      const result = await (service as any).handleSuccessfulPayment(
        mockPayment,
        webhookData,
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-123' },
        data: {
          status: PaymentStatus.PAID,
          completed_at: expect.any(Date),
          provider_payload: webhookData,
        },
      });
    });

    it('should update order payment status to PAID', async () => {
      const mockPrisma = {
        payment: {
          update: jest.fn().mockResolvedValue(mockPayment),
        },
        order: {
          update: jest.fn().mockResolvedValue(mockOrder),
          findUnique: jest.fn().mockResolvedValue(mockOrder),
        },
        subscription: {
          update: jest.fn().mockResolvedValue({}),
        },
        ledger: {
          create: ledgerCreateMock,
        },
        platformFee: {
          findFirst: jest.fn().mockResolvedValue(mockPlatformFee),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
      };

      (prismaService as any).$transaction = mockPrisma.$transaction;

      const webhookData = {
        payload: {
          payment: {
            entity: {
              notes: {
                orderId: 'order-123',
              },
            },
          },
        },
      };

      await (service as any).handleSuccessfulPayment(mockPayment, webhookData);

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: { payment_status: 'PAID' },
      });
    });

    it('should create SALE ledger entry for each order item', async () => {
      const mockPrisma = {
        payment: {
          update: jest.fn().mockResolvedValue(mockPayment),
        },
        order: {
          update: jest.fn().mockResolvedValue(mockOrder),
          findUnique: jest.fn().mockResolvedValue(mockOrder),
        },
        subscription: {
          update: jest.fn().mockResolvedValue({}),
        },
        ledger: {
          create: ledgerCreateMock,
        },
        platformFee: {
          findFirst: jest.fn().mockResolvedValue(mockPlatformFee),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
      };

      (prismaService as any).$transaction = mockPrisma.$transaction;

      const webhookData = {
        payload: {
          payment: {
            entity: {
              notes: {
                orderId: 'order-123',
              },
            },
          },
        },
      };

      await (service as any).handleSuccessfulPayment(mockPayment, webhookData);

      // Should create SALE entry for the order item (price * quantity = 500 * 2 = 1000)
      expect(mockPrisma.ledger.create).toHaveBeenCalledWith({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: 'SALE',
          amount: new Decimal(1000),
          paymentMode: PaymentMode.ONLINE,
        },
      });
    });

    it('should create PLATFORM_FEE ledger entries for online payments', async () => {
      const mockPrisma = {
        payment: {
          update: jest.fn().mockResolvedValue(mockPayment),
        },
        order: {
          update: jest.fn().mockResolvedValue(mockOrder),
          findUnique: jest.fn().mockResolvedValue(mockOrder),
        },
        subscription: {
          update: jest.fn().mockResolvedValue({}),
        },
        ledger: {
          create: ledgerCreateMock,
        },
        platformFee: {
          findFirst: jest.fn().mockResolvedValue(mockPlatformFee),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
      };

      (prismaService as any).$transaction = mockPrisma.$transaction;

      const webhookData = {
        payload: {
          payment: {
            entity: {
              notes: {
                orderId: 'order-123',
              },
            },
          },
        },
      };

      await (service as any).handleSuccessfulPayment(mockPayment, webhookData);

      // For online payment, should create:
      // 1. Product listing fee (5% of 1000 = 50)
      // 2. Platform fee (5.00)
      // 3. Transaction fee (2.00)
      // 4. Combined SMS/WhatsApp fee (1.00 + 2.00 = 3.00)
      const ledgerCalls = mockPrisma.ledger.create.mock.calls;
      const platformFeeCalls = ledgerCalls.filter(
        (call: any[]) => call[0].data.type === 'PLATFORM_FEE',
      );

      expect(platformFeeCalls.length).toBe(4);
    });

    it('should not create transaction fee for COD payments', async () => {
      const codOrder = {
        ...mockOrder,
        payment_mode: PaymentMode.COD,
      };

      const mockPrisma = {
        payment: {
          update: jest.fn().mockResolvedValue(mockPayment),
        },
        order: {
          update: jest.fn().mockResolvedValue(mockOrder),
          findUnique: jest.fn().mockResolvedValue(codOrder),
        },
        subscription: {
          update: jest.fn().mockResolvedValue({}),
        },
        ledger: {
          create: ledgerCreateMock,
        },
        platformFee: {
          findFirst: jest.fn().mockResolvedValue(mockPlatformFee),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
      };

      (prismaService as any).$transaction = mockPrisma.$transaction;

      const webhookData = {
        payload: {
          payment: {
            entity: {
              notes: {
                orderId: 'order-123',
              },
            },
          },
        },
      };

      await (service as any).handleSuccessfulPayment(mockPayment, webhookData);

      // For COD, should create:
      // 1. Product listing fee (5% of 1000 = 50)
      // 2. Platform fee (5.00)
      // 3. Combined SMS/WhatsApp fee (1.00 + 2.00 = 3.00)
      // No transaction fee for COD
      const ledgerCalls = mockPrisma.ledger.create.mock.calls;
      const platformFeeCalls = ledgerCalls.filter(
        (call: any[]) => call[0].data.type === 'PLATFORM_FEE',
      );

      expect(platformFeeCalls.length).toBe(3);
    });

    it('should update subscription status when subscribeID is provided', async () => {
      const mockPrisma = {
        payment: {
          update: jest.fn().mockResolvedValue(mockPayment),
        },
        order: {
          update: jest.fn().mockResolvedValue(mockOrder),
          findUnique: jest.fn().mockResolvedValue(mockOrder),
        },
        subscription: {
          update: jest.fn().mockResolvedValue({}),
        },
        ledger: {
          create: ledgerCreateMock,
        },
        platformFee: {
          findFirst: jest.fn().mockResolvedValue(mockPlatformFee),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
      };

      (prismaService as any).$transaction = mockPrisma.$transaction;

      const webhookData = {
        payload: {
          payment: {
            entity: {
              notes: {
                orderId: 'order-123',
                subscribeID: 'subscription-123',
              },
            },
          },
        },
      };

      await (service as any).handleSuccessfulPayment(mockPayment, webhookData);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'subscription-123' },
        data: { status: SubscriptionStatus.ACTIVE },
      });
    });

    it('should use default platform fees when category-specific fees not found', async () => {
      const mockPrisma = {
        payment: {
          update: jest.fn().mockResolvedValue(mockPayment),
        },
        order: {
          update: jest.fn().mockResolvedValue(mockOrder),
          findUnique: jest.fn().mockResolvedValue(mockOrder),
        },
        subscription: {
          update: jest.fn().mockResolvedValue({}),
        },
        ledger: {
          create: ledgerCreateMock,
        },
        platformFee: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
      };

      (prismaService as any).$transaction = mockPrisma.$transaction;

      const webhookData = {
        payload: {
          payment: {
            entity: {
              notes: {
                orderId: 'order-123',
              },
            },
          },
        },
      };

      await (service as any).handleSuccessfulPayment(mockPayment, webhookData);

      // Should still create ledger entries using default fees
      expect(mockPrisma.ledger.create).toHaveBeenCalled();
    });

    it('should handle errors gracefully without failing payment processing', async () => {
      const mockPrisma = {
        payment: {
          update: jest.fn().mockResolvedValue(mockPayment),
        },
        order: {
          update: jest.fn().mockResolvedValue(mockOrder),
          findUnique: jest.fn().mockRejectedValue(new Error('Database error')),
        },
        subscription: {
          update: jest.fn().mockResolvedValue({}),
        },
        ledger: {
          create: ledgerCreateMock,
        },
        platformFee: {
          findFirst: jest.fn().mockResolvedValue(mockPlatformFee),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
      };

      (prismaService as any).$transaction = mockPrisma.$transaction;

      const webhookData = {
        payload: {
          payment: {
            entity: {
              notes: {
                orderId: 'order-123',
              },
            },
          },
        },
      };

      const result = await (service as any).handleSuccessfulPayment(
        mockPayment,
        webhookData,
      );

      // Should return success even if ledger creation fails
      expect(result.success).toBe(true);
      expect(result.action).toBe('payment_success_ledger_error');
    });
  });
});
