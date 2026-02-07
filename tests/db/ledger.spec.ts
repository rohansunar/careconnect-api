import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/common/database/prisma.service';
import { LedgerType, PlatformFeeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Mock data for Ledger tests
 */
const mockVendor = {
  id: 'vendor-123',
  name: 'Test Vendor',
  email: 'vendor@test.com',
  phone: '+1234567890',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockOrderItem = {
  id: 'orderItem-123',
  orderId: 'order-123',
  productId: 'product-123',
  quantity: 2,
  price: new Decimal(500),
  deposit: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createMockLedger = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'ledger-123',
  vendorId: 'vendor-123',
  orderItemId: 'orderItem-123',
  type: LedgerType.PLATFORM_FEE,
  amount: new Decimal(50),
  paymentMode: 'ONLINE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  vendor: mockVendor,
  orderItem: mockOrderItem,
  ...overrides,
});

describe('Ledger Model - feeType Field', () => {
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      ledger: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      vendor: {
        findUnique: jest.fn().mockResolvedValue(mockVendor),
      },
      orderItem: {
        findUnique: jest.fn().mockResolvedValue(mockOrderItem),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('feeType Field - Enum Values', () => {
    it('should create ledger with LISTING_FEE feeType', async () => {
      const mockLedger = createMockLedger({
        feeType: PlatformFeeType.LISTING_FEE,
        amount: new Decimal(25),
      });

      (prismaService as any).ledger.create.mockResolvedValue(mockLedger);

      const result = await prismaService.ledger.create({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: LedgerType.PLATFORM_FEE,
          feeType: PlatformFeeType.LISTING_FEE,
          amount: new Decimal(25),
          paymentMode: 'ONLINE' as const,
        },
      });

      expect(result.feeType).toBe(PlatformFeeType.LISTING_FEE);
      expect(prismaService.ledger.create).toHaveBeenCalledWith({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: LedgerType.PLATFORM_FEE,
          feeType: PlatformFeeType.LISTING_FEE,
          amount: new Decimal(25),
          paymentMode: 'ONLINE',
        },
      });
    });

    it('should create ledger with PAYMENT_GATEWAY_FEE feeType', async () => {
      const mockLedger = createMockLedger({
        feeType: PlatformFeeType.PAYMENT_GATEWAY_FEE,
        amount: new Decimal(10),
      });

      (prismaService as any).ledger.create.mockResolvedValue(mockLedger);

      const result = await prismaService.ledger.create({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: LedgerType.PLATFORM_FEE,
          feeType: PlatformFeeType.PAYMENT_GATEWAY_FEE,
          amount: new Decimal(10),
          paymentMode: 'ONLINE' as const,
        },
      });

      expect(result.feeType).toBe(PlatformFeeType.PAYMENT_GATEWAY_FEE);
    });

    it('should create ledger with GST feeType', async () => {
      const mockLedger = createMockLedger({
        feeType: PlatformFeeType.GST,
        amount: new Decimal(15),
      });

      (prismaService as any).ledger.create.mockResolvedValue(mockLedger);

      const result = await prismaService.ledger.create({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: LedgerType.PLATFORM_FEE,
          feeType: PlatformFeeType.GST,
          amount: new Decimal(15),
          paymentMode: 'ONLINE' as const,
        },
      });

      expect(result.feeType).toBe(PlatformFeeType.GST);
    });

    it('should create ledger with WHATSAPP_FEE feeType', async () => {
      const mockLedger = createMockLedger({
        feeType: PlatformFeeType.WHATSAPP_FEE,
        amount: new Decimal(2),
      });

      (prismaService as any).ledger.create.mockResolvedValue(mockLedger);

      const result = await prismaService.ledger.create({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: LedgerType.PLATFORM_FEE,
          feeType: PlatformFeeType.WHATSAPP_FEE,
          amount: new Decimal(2),
          paymentMode: 'ONLINE' as const,
        },
      });

      expect(result.feeType).toBe(PlatformFeeType.WHATSAPP_FEE);
    });

    it('should create ledger with SMS_FEE feeType', async () => {
      const mockLedger = createMockLedger({
        feeType: PlatformFeeType.SMS_FEE,
        amount: new Decimal(1),
      });

      (prismaService as any).ledger.create.mockResolvedValue(mockLedger);

      const result = await prismaService.ledger.create({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: LedgerType.PLATFORM_FEE,
          feeType: PlatformFeeType.SMS_FEE,
          amount: new Decimal(1),
          paymentMode: 'ONLINE' as const,
        },
      });

      expect(result.feeType).toBe(PlatformFeeType.SMS_FEE);
    });

    it('should create ledger with ADJUSTMENT feeType', async () => {
      const mockLedger = createMockLedger({
        feeType: PlatformFeeType.ADJUSTMENT,
        amount: new Decimal(-5),
      });

      (prismaService as any).ledger.create.mockResolvedValue(mockLedger);

      const result = await prismaService.ledger.create({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: LedgerType.PLATFORM_FEE,
          feeType: PlatformFeeType.ADJUSTMENT,
          amount: new Decimal(-5),
          paymentMode: 'ONLINE' as const,
        },
      });

      expect(result.feeType).toBe(PlatformFeeType.ADJUSTMENT);
    });
  });

  describe('feeType Field - Nullable', () => {
    it('should create ledger with null feeType', async () => {
      const mockLedger = createMockLedger({
        feeType: null,
        type: LedgerType.SALE,
        amount: new Decimal(1000),
      });

      (prismaService as any).ledger.create.mockResolvedValue(mockLedger);

      const result = await prismaService.ledger.create({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: LedgerType.SALE,
          feeType: null,
          amount: new Decimal(1000),
          paymentMode: 'ONLINE' as const,
        },
      });

      expect(result.feeType).toBeNull();
      expect(prismaService.ledger.create).toHaveBeenCalledWith({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: LedgerType.SALE,
          feeType: null,
          amount: new Decimal(1000),
          paymentMode: 'ONLINE',
        },
      });
    });

    it('should create ledger without feeType field (undefined)', async () => {
      const mockLedger = createMockLedger({
        feeType: null,
        type: LedgerType.SALE,
        amount: new Decimal(1000),
      });

      (prismaService as any).ledger.create.mockResolvedValue(mockLedger);

      const result = await prismaService.ledger.create({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: LedgerType.SALE,
          amount: new Decimal(1000),
          paymentMode: 'ONLINE' as const,
        },
      });

      expect(result.feeType).toBeNull();
    });

    it('should find ledger by id with feeType field', async () => {
      const mockLedger = createMockLedger({
        feeType: PlatformFeeType.GST,
        amount: new Decimal(15),
      });

      (prismaService as any).ledger.findUnique.mockResolvedValue(mockLedger);

      const result = await prismaService.ledger.findUnique({
        where: { id: 'ledger-123' },
      });

      expect(result).toBeDefined();
      expect(result?.feeType).toBe(PlatformFeeType.GST);
      expect(prismaService.ledger.findUnique).toHaveBeenCalledWith({
        where: { id: 'ledger-123' },
      });
    });
  });

  describe('feeType Field - CRUD Operations', () => {
    it('should create ledger with all enum values in a batch', async () => {
      const feeTypes = [
        PlatformFeeType.LISTING_FEE,
        PlatformFeeType.PAYMENT_GATEWAY_FEE,
        PlatformFeeType.GST,
        PlatformFeeType.WHATSAPP_FEE,
        PlatformFeeType.SMS_FEE,
        PlatformFeeType.ADJUSTMENT,
      ];

      const mockLedgers = feeTypes.map((feeType, index) =>
        createMockLedger({
          id: `ledger-${index}`,
          feeType,
          amount: new Decimal(10 * (index + 1)),
        }),
      );

      (prismaService as any).ledger.create.mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => {
          const index = feeTypes.indexOf(data.feeType as PlatformFeeType);
          return mockLedgers[index];
        },
      );

      for (let i = 0; i < feeTypes.length; i++) {
        const result = await prismaService.ledger.create({
          data: {
            vendorId: 'vendor-123',
            orderItemId: 'orderItem-123',
            type: LedgerType.PLATFORM_FEE,
            feeType: feeTypes[i],
            amount: new Decimal(10 * (i + 1)),
            paymentMode: 'ONLINE' as const,
          },
        });
        expect(result.feeType).toBe(feeTypes[i]);
      }
    });

    it('should update feeType field', async () => {
      const updatedLedger = createMockLedger({
        feeType: PlatformFeeType.ADJUSTMENT,
        amount: new Decimal(-10),
      });

      (prismaService as any).ledger.update.mockResolvedValue(updatedLedger);

      const result = await prismaService.ledger.update({
        where: { id: 'ledger-123' },
        data: {
          feeType: PlatformFeeType.ADJUSTMENT,
          amount: new Decimal(-10),
        },
      });

      expect(result.feeType).toBe(PlatformFeeType.ADJUSTMENT);
      expect(prismaService.ledger.update).toHaveBeenCalledWith({
        where: { id: 'ledger-123' },
        data: {
          feeType: PlatformFeeType.ADJUSTMENT,
          amount: new Decimal(-10),
        },
      });
    });

    it('should filter ledger by feeType', async () => {
      const mockLedgers = [
        createMockLedger({
          id: 'ledger-1',
          feeType: PlatformFeeType.GST,
          amount: new Decimal(15),
        }),
        createMockLedger({
          id: 'ledger-2',
          feeType: PlatformFeeType.GST,
          amount: new Decimal(20),
        }),
      ];

      (prismaService as any).ledger.findMany.mockResolvedValue(mockLedgers);

      const result = await prismaService.ledger.findMany({
        where: {
          feeType: PlatformFeeType.GST,
        },
      });

      expect(result).toHaveLength(2);
      expect(result.every((l) => l.feeType === PlatformFeeType.GST)).toBe(true);
      expect(prismaService.ledger.findMany).toHaveBeenCalledWith({
        where: {
          feeType: PlatformFeeType.GST,
        },
      });
    });

    it('should filter ledger with feeType is null', async () => {
      const mockLedgers = [
        createMockLedger({
          id: 'ledger-1',
          feeType: null,
          type: LedgerType.SALE,
        }),
        createMockLedger({
          id: 'ledger-2',
          feeType: null,
          type: LedgerType.SALE,
        }),
      ];

      (prismaService as any).ledger.findMany.mockResolvedValue(mockLedgers);

      const result = await prismaService.ledger.findMany({
        where: {
          feeType: null,
        },
      });

      expect(result).toHaveLength(2);
      expect(result.every((l) => l.feeType === null)).toBe(true);
    });

    it('should delete ledger with feeType', async () => {
      const deletedLedger = createMockLedger({
        feeType: PlatformFeeType.SMS_FEE,
      });

      (prismaService as any).ledger.delete.mockResolvedValue(deletedLedger);

      const result = await prismaService.ledger.delete({
        where: { id: 'ledger-123' },
      });

      expect(result.feeType).toBe(PlatformFeeType.SMS_FEE);
      expect(prismaService.ledger.delete).toHaveBeenCalledWith({
        where: { id: 'ledger-123' },
      });
    });
  });

  describe('feeType Field - Integration Scenarios', () => {
    it('should create multiple platform fee ledger entries with different feeTypes', async () => {
      const platformFeeEntries = [
        {
          feeType: PlatformFeeType.LISTING_FEE,
          amount: new Decimal(50),
        },
        {
          feeType: PlatformFeeType.PAYMENT_GATEWAY_FEE,
          amount: new Decimal(10),
        },
        {
          feeType: PlatformFeeType.GST,
          amount: new Decimal(15),
        },
        {
          feeType: PlatformFeeType.WHATSAPP_FEE,
          amount: new Decimal(2),
        },
        {
          feeType: PlatformFeeType.SMS_FEE,
          amount: new Decimal(1),
        },
      ];

      (prismaService as any).ledger.create.mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => {
          return createMockLedger({
            feeType: data.feeType as PlatformFeeType,
            amount: data.amount as Decimal,
          });
        },
      );

      for (const entry of platformFeeEntries) {
        const result = await prismaService.ledger.create({
          data: {
            vendorId: 'vendor-123',
            orderItemId: 'orderItem-123',
            type: LedgerType.PLATFORM_FEE,
            feeType: entry.feeType,
            amount: entry.amount,
            paymentMode: 'ONLINE' as const,
          },
        });
        expect(result.feeType).toBe(entry.feeType);
      }

      expect(prismaService.ledger.create).toHaveBeenCalledTimes(
        platformFeeEntries.length,
      );
    });

    it('should create SALE ledger entry without feeType', async () => {
      const mockLedger = createMockLedger({
        feeType: null,
        type: LedgerType.SALE,
        amount: new Decimal(1000),
      });

      (prismaService as any).ledger.create.mockResolvedValue(mockLedger);

      const result = await prismaService.ledger.create({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: LedgerType.SALE,
          amount: new Decimal(1000),
          paymentMode: 'ONLINE' as const,
        },
      });

      expect(result.type).toBe(LedgerType.SALE);
      expect(result.feeType).toBeNull();
      expect(result.amount.toString()).toBe('1000');
    });

    it('should create REFUND ledger entry without feeType', async () => {
      const mockLedger = createMockLedger({
        feeType: null,
        type: LedgerType.REFUND,
        amount: new Decimal(-500),
      });

      (prismaService as any).ledger.create.mockResolvedValue(mockLedger);

      const result = await prismaService.ledger.create({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: LedgerType.REFUND,
          amount: new Decimal(-500),
          paymentMode: 'ONLINE' as const,
        },
      });

      expect(result.type).toBe(LedgerType.REFUND);
      expect(result.feeType).toBeNull();
      expect(result.amount.toString()).toBe('-500');
    });

    it('should create PAYOUT ledger entry without feeType', async () => {
      const mockLedger = createMockLedger({
        feeType: null,
        type: LedgerType.PAYOUT,
        amount: new Decimal(800),
      });

      (prismaService as any).ledger.create.mockResolvedValue(mockLedger);

      const result = await prismaService.ledger.create({
        data: {
          vendorId: 'vendor-123',
          orderItemId: 'orderItem-123',
          type: LedgerType.PAYOUT,
          amount: new Decimal(800),
          paymentMode: 'ONLINE' as const,
        },
      });

      expect(result.type).toBe(LedgerType.PAYOUT);
      expect(result.feeType).toBeNull();
      expect(result.amount.toString()).toBe('800');
    });

    it('should query ledger with mixed feeType and non-feeType entries', async () => {
      const mockLedgers = [
        createMockLedger({
          id: 'ledger-1',
          type: LedgerType.SALE,
          feeType: null,
          amount: new Decimal(1000),
        }),
        createMockLedger({
          id: 'ledger-2',
          type: LedgerType.PLATFORM_FEE,
          feeType: PlatformFeeType.GST,
          amount: new Decimal(15),
        }),
        createMockLedger({
          id: 'ledger-3',
          type: LedgerType.REFUND,
          feeType: null,
          amount: new Decimal(-500),
        }),
        createMockLedger({
          id: 'ledger-4',
          type: LedgerType.PLATFORM_FEE,
          feeType: PlatformFeeType.PAYMENT_GATEWAY_FEE,
          amount: new Decimal(10),
        }),
      ];

      (prismaService as any).ledger.findMany.mockResolvedValue(mockLedgers);

      const result = await prismaService.ledger.findMany({
        orderBy: { id: 'asc' },
      });

      expect(result).toHaveLength(4);
      expect(result[0].feeType).toBeNull();
      expect(result[1].feeType).toBe(PlatformFeeType.GST);
      expect(result[2].feeType).toBeNull();
      expect(result[3].feeType).toBe(PlatformFeeType.PAYMENT_GATEWAY_FEE);
    });
  });
});
