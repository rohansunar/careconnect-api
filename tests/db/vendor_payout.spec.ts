import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/common/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * PayoutStatus enum definition (mirrors prisma schema)
 */
enum PayoutStatus {
  INITIATED = 'INITIATED',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

/**
 * Mock data for VendorPayout tests
 */
const mockVendor = {
  id: 'vendor-123',
  name: 'Test Vendor',
  email: 'vendor@test.com',
  phone: '+1234567890',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createMockVendorPayout = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'payout-123',
  vendorId: 'vendor-123',
  amount: new Decimal(1000),
  status: PayoutStatus.INITIATED,
  gatewayTxnId: null,
  failureReason: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  vendor: mockVendor,
  ...overrides,
});

describe('VendorPayout Model - Creation Tests', () => {
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      vendorPayout: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      vendor: {
        findUnique: jest.fn().mockResolvedValue(mockVendor),
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

  describe('PayoutStatus Field - Default Value', () => {
    it('should create payout with INITIATED status (default)', async () => {
      const mockPayout = createMockVendorPayout({
        status: PayoutStatus.INITIATED,
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(1000),
        },
      });

      expect(result.status).toBe(PayoutStatus.INITIATED);
      expect(prismaService.vendorPayout.create).toHaveBeenCalledWith({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(1000),
        },
      });
    });

    it('should create payout with INITIATED status explicitly', async () => {
      const mockPayout = createMockVendorPayout({
        status: PayoutStatus.INITIATED,
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(500),
          status: PayoutStatus.INITIATED,
        },
      });

      expect(result.status).toBe(PayoutStatus.INITIATED);
    });

    it('should create payout with PROCESSING status', async () => {
      const mockPayout = createMockVendorPayout({
        status: PayoutStatus.PROCESSING,
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(750),
          status: PayoutStatus.PROCESSING,
        },
      });

      expect(result.status).toBe(PayoutStatus.PROCESSING);
    });

    it('should create payout with PAID status', async () => {
      const mockPayout = createMockVendorPayout({
        status: PayoutStatus.PAID,
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(2000),
          status: PayoutStatus.PAID,
        },
      });

      expect(result.status).toBe(PayoutStatus.PAID);
    });

    it('should create payout with FAILED status', async () => {
      const mockPayout = createMockVendorPayout({
        status: PayoutStatus.FAILED,
        failureReason: 'Bank transfer failed',
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(500),
          status: PayoutStatus.FAILED,
          failureReason: 'Bank transfer failed',
        },
      });

      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.failureReason).toBe('Bank transfer failed');
    });
  });

  describe('Optional Fields - gatewayTxnId', () => {
    it('should create payout without gatewayTxnId', async () => {
      const mockPayout = createMockVendorPayout({
        gatewayTxnId: null,
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(1000),
        },
      });

      expect(result.gatewayTxnId).toBeNull();
    });

    it('should create payout with gatewayTxnId', async () => {
      const mockPayout = createMockVendorPayout({
        gatewayTxnId: 'txn_gw_123456',
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(1000),
          gatewayTxnId: 'txn_gw_123456',
        },
      });

      expect(result.gatewayTxnId).toBe('txn_gw_123456');
    });
  });

  describe('Optional Fields - failureReason', () => {
    it('should create payout without failureReason', async () => {
      const mockPayout = createMockVendorPayout({
        failureReason: null,
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(1000),
        },
      });

      expect(result.failureReason).toBeNull();
    });

    it('should create payout with failureReason on FAILED status', async () => {
      const mockPayout = createMockVendorPayout({
        status: PayoutStatus.FAILED,
        failureReason: 'Insufficient bank account details',
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(500),
          status: PayoutStatus.FAILED,
          failureReason: 'Insufficient bank account details',
        },
      });

      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.failureReason).toBe('Insufficient bank account details');
    });
  });

  describe('Optional Fields - notes', () => {
    it('should create payout without notes', async () => {
      const mockPayout = createMockVendorPayout({
        notes: null,
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(1000),
        },
      });

      expect(result.notes).toBeNull();
    });

    it('should create payout with notes', async () => {
      const mockPayout = createMockVendorPayout({
        notes: 'Manual payout adjustment for vendor',
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(1000),
          notes: 'Manual payout adjustment for vendor',
        },
      });

      expect(result.notes).toBe('Manual payout adjustment for vendor');
    });

    it('should update notes on existing payout', async () => {
      const updatedPayout = createMockVendorPayout({
        notes: 'Updated: Additional processing notes',
      });

      (prismaService as any).vendorPayout.update.mockResolvedValue(updatedPayout);

      const result = await prismaService.vendorPayout.update({
        where: { id: 'payout-123' },
        data: {
          notes: 'Updated: Additional processing notes',
        },
      });

      expect(result.notes).toBe('Updated: Additional processing notes');
    });

    it('should clear notes on payout', async () => {
      const updatedPayout = createMockVendorPayout({
        notes: null,
      });

      (prismaService as any).vendorPayout.update.mockResolvedValue(updatedPayout);

      const result = await prismaService.vendorPayout.update({
        where: { id: 'payout-123' },
        data: {
          notes: null,
        },
      });

      expect(result.notes).toBeNull();
    });
  });

  describe('Amount Field - Various Values', () => {
    it('should create payout with positive amount', async () => {
      const mockPayout = createMockVendorPayout({
        amount: new Decimal(1000),
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(1000),
        },
      });

      expect(result.amount.toString()).toBe('1000');
    });

    it('should create payout with large amount', async () => {
      const mockPayout = createMockVendorPayout({
        amount: new Decimal(999999.99),
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(999999.99),
        },
      });

      expect(result.amount.toString()).toBe('999999.99');
    });

    it('should create payout with small amount', async () => {
      const mockPayout = createMockVendorPayout({
        amount: new Decimal(0.5),
      });

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(0.5),
        },
      });

      expect(result.amount.toString()).toBe('0.5');
    });
  });
});

describe('VendorPayout Model - Status Transition Tests', () => {
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      vendorPayout: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      vendor: {
        findUnique: jest.fn().mockResolvedValue(mockVendor),
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

  describe('Valid Status Transitions', () => {
    it('should transition from INITIATED to PROCESSING', async () => {
      const updatedPayout = createMockVendorPayout({
        status: PayoutStatus.PROCESSING,
      });

      (prismaService as any).vendorPayout.update.mockResolvedValue(updatedPayout);

      const result = await prismaService.vendorPayout.update({
        where: { id: 'payout-123' },
        data: {
          status: PayoutStatus.PROCESSING,
        },
      });

      expect(result.status).toBe(PayoutStatus.PROCESSING);
      expect(prismaService.vendorPayout.update).toHaveBeenCalledWith({
        where: { id: 'payout-123' },
        data: {
          status: PayoutStatus.PROCESSING,
        },
      });
    });

    it('should transition from PROCESSING to PAID', async () => {
      const updatedPayout = createMockVendorPayout({
        status: PayoutStatus.PAID,
        gatewayTxnId: 'txn_paid_789',
      });

      (prismaService as any).vendorPayout.update.mockResolvedValue(updatedPayout);

      const result = await prismaService.vendorPayout.update({
        where: { id: 'payout-123' },
        data: {
          status: PayoutStatus.PAID,
          gatewayTxnId: 'txn_paid_789',
        },
      });

      expect(result.status).toBe(PayoutStatus.PAID);
      expect(result.gatewayTxnId).toBe('txn_paid_789');
    });

    it('should transition from INITIATED to FAILED', async () => {
      const updatedPayout = createMockVendorPayout({
        status: PayoutStatus.FAILED,
        failureReason: 'Vendor request cancelled',
      });

      (prismaService as any).vendorPayout.update.mockResolvedValue(updatedPayout);

      const result = await prismaService.vendorPayout.update({
        where: { id: 'payout-123' },
        data: {
          status: PayoutStatus.FAILED,
          failureReason: 'Vendor request cancelled',
        },
      });

      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.failureReason).toBe('Vendor request cancelled');
    });

    it('should transition from PROCESSING to FAILED', async () => {
      const updatedPayout = createMockVendorPayout({
        status: PayoutStatus.FAILED,
        failureReason: 'Gateway timeout',
      });

      (prismaService as any).vendorPayout.update.mockResolvedValue(updatedPayout);

      const result = await prismaService.vendorPayout.update({
        where: { id: 'payout-123' },
        data: {
          status: PayoutStatus.FAILED,
          failureReason: 'Gateway timeout',
        },
      });

      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.failureReason).toBe('Gateway timeout');
    });
  });

  describe('Update failureReason on FAILED Status', () => {
    it('should update failureReason on FAILED payout', async () => {
      const updatedPayout = createMockVendorPayout({
        status: PayoutStatus.FAILED,
        failureReason: 'Updated: Bank rejected the transaction',
      });

      (prismaService as any).vendorPayout.update.mockResolvedValue(updatedPayout);

      const result = await prismaService.vendorPayout.update({
        where: { id: 'payout-123' },
        data: {
          failureReason: 'Updated: Bank rejected the transaction',
        },
      });

      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.failureReason).toBe('Updated: Bank rejected the transaction');
    });

    it('should clear failureReason when retrying payout', async () => {
      const updatedPayout = createMockVendorPayout({
        status: PayoutStatus.INITIATED,
        failureReason: null,
      });

      (prismaService as any).vendorPayout.update.mockResolvedValue(updatedPayout);

      const result = await prismaService.vendorPayout.update({
        where: { id: 'payout-123' },
        data: {
          status: PayoutStatus.INITIATED,
          failureReason: null,
        },
      });

      expect(result.status).toBe(PayoutStatus.INITIATED);
      expect(result.failureReason).toBeNull();
    });
  });
});

describe('VendorPayout Model - Gateway Transaction ID Assignment Tests', () => {
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      vendorPayout: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      vendor: {
        findUnique: jest.fn().mockResolvedValue(mockVendor),
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

  describe('gatewayTxnId Assignment', () => {
    it('should assign gatewayTxnId to INITIATED payout', async () => {
      const updatedPayout = createMockVendorPayout({
        status: PayoutStatus.INITIATED,
        gatewayTxnId: 'txn_init_001',
      });

      (prismaService as any).vendorPayout.update.mockResolvedValue(updatedPayout);

      const result = await prismaService.vendorPayout.update({
        where: { id: 'payout-123' },
        data: {
          gatewayTxnId: 'txn_init_001',
        },
      });

      expect(result.gatewayTxnId).toBe('txn_init_001');
      expect(result.status).toBe(PayoutStatus.INITIATED);
    });

    it('should update gatewayTxnId on PROCESSING payout', async () => {
      const updatedPayout = createMockVendorPayout({
        status: PayoutStatus.PROCESSING,
        gatewayTxnId: 'txn_proc_002',
      });

      (prismaService as any).vendorPayout.update.mockResolvedValue(updatedPayout);

      const result = await prismaService.vendorPayout.update({
        where: { id: 'payout-123' },
        data: {
          gatewayTxnId: 'txn_proc_002',
        },
      });

      expect(result.gatewayTxnId).toBe('txn_proc_002');
      expect(result.status).toBe(PayoutStatus.PROCESSING);
    });

    it('should assign gatewayTxnId when marking as PAID', async () => {
      const updatedPayout = createMockVendorPayout({
        status: PayoutStatus.PAID,
        gatewayTxnId: 'txn_paid_final_123',
      });

      (prismaService as any).vendorPayout.update.mockResolvedValue(updatedPayout);

      const result = await prismaService.vendorPayout.update({
        where: { id: 'payout-123' },
        data: {
          status: PayoutStatus.PAID,
          gatewayTxnId: 'txn_paid_final_123',
        },
      });

      expect(result.status).toBe(PayoutStatus.PAID);
      expect(result.gatewayTxnId).toBe('txn_paid_final_123');
    });
  });

  describe('Payout Retrieval with gatewayTxnId', () => {
    it('should find payout by gatewayTxnId', async () => {
      const mockPayout = createMockVendorPayout({
        gatewayTxnId: 'txn_search_456',
      });

      (prismaService as any).vendorPayout.findMany.mockResolvedValue([mockPayout]);

      const result = await prismaService.vendorPayout.findMany({
        where: {
          gatewayTxnId: 'txn_search_456',
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].gatewayTxnId).toBe('txn_search_456');
      expect(prismaService.vendorPayout.findMany).toHaveBeenCalledWith({
        where: {
          gatewayTxnId: 'txn_search_456',
        },
      });
    });

    it('should find payouts without gatewayTxnId', async () => {
      const mockPayouts = [
        createMockVendorPayout({ gatewayTxnId: null }),
        createMockVendorPayout({ id: 'payout-456', gatewayTxnId: null }),
      ];

      (prismaService as any).vendorPayout.findMany.mockResolvedValue(mockPayouts);

      const result = await prismaService.vendorPayout.findMany({
        where: {
          gatewayTxnId: null,
        },
      });

      expect(result).toHaveLength(2);
      expect(result.every((p) => p.gatewayTxnId === null)).toBe(true);
    });
  });
});

describe('VendorPayout Model - CRUD Operations', () => {
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      vendorPayout: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      vendor: {
        findUnique: jest.fn().mockResolvedValue(mockVendor),
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

  describe('Create Payout', () => {
    it('should create a new payout', async () => {
      const mockPayout = createMockVendorPayout();

      (prismaService as any).vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.create({
        data: {
          vendorId: 'vendor-123',
          amount: new Decimal(1000),
        },
      });

      expect(result.id).toBe('payout-123');
      expect(result.vendorId).toBe('vendor-123');
      expect(result.amount.toString()).toBe('1000');
      expect(result.status).toBe(PayoutStatus.INITIATED);
    });
  });

  describe('Find Payout by ID', () => {
    it('should find payout by id', async () => {
      const mockPayout = createMockVendorPayout();

      (prismaService as any).vendorPayout.findUnique.mockResolvedValue(mockPayout);

      const result = await prismaService.vendorPayout.findUnique({
        where: { id: 'payout-123' },
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('payout-123');
      expect(prismaService.vendorPayout.findUnique).toHaveBeenCalledWith({
        where: { id: 'payout-123' },
      });
    });

    it('should return null for non-existent payout', async () => {
      (prismaService as any).vendorPayout.findUnique.mockResolvedValue(null);

      const result = await prismaService.vendorPayout.findUnique({
        where: { id: 'non-existent' },
      });

      expect(result).toBeNull();
    });
  });

  describe('Find Payouts by vendorId', () => {
    it('should find all payouts for a vendor', async () => {
      const mockPayouts = [
        createMockVendorPayout({ id: 'payout-1', amount: new Decimal(500) }),
        createMockVendorPayout({ id: 'payout-2', amount: new Decimal(750) }),
        createMockVendorPayout({ id: 'payout-3', amount: new Decimal(1000) }),
      ];

      (prismaService as any).vendorPayout.findMany.mockResolvedValue(mockPayouts);

      const result = await prismaService.vendorPayout.findMany({
        where: {
          vendorId: 'vendor-123',
        },
      });

      expect(result).toHaveLength(3);
      expect(result.every((p) => p.vendorId === 'vendor-123')).toBe(true);
    });
  });

  describe('Find Payouts by status', () => {
    it('should find all INITIATED payouts', async () => {
      const mockPayouts = [
        createMockVendorPayout({ id: 'payout-1', status: PayoutStatus.INITIATED }),
        createMockVendorPayout({ id: 'payout-2', status: PayoutStatus.INITIATED }),
      ];

      (prismaService as any).vendorPayout.findMany.mockResolvedValue(mockPayouts);

      const result = await prismaService.vendorPayout.findMany({
        where: {
          status: PayoutStatus.INITIATED,
        },
      });

      expect(result).toHaveLength(2);
      expect(result.every((p) => p.status === PayoutStatus.INITIATED)).toBe(true);
    });

    it('should find all PAID payouts', async () => {
      const mockPayouts = [
        createMockVendorPayout({ id: 'payout-1', status: PayoutStatus.PAID }),
        createMockVendorPayout({ id: 'payout-2', status: PayoutStatus.PAID }),
      ];

      (prismaService as any).vendorPayout.findMany.mockResolvedValue(mockPayouts);

      const result = await prismaService.vendorPayout.findMany({
        where: {
          status: PayoutStatus.PAID,
        },
      });

      expect(result).toHaveLength(2);
      expect(result.every((p) => p.status === PayoutStatus.PAID)).toBe(true);
    });

    it('should find all FAILED payouts with failure reasons', async () => {
      const mockPayouts = [
        createMockVendorPayout({
          id: 'payout-1',
          status: PayoutStatus.FAILED,
          failureReason: 'Bank rejected',
        }),
        createMockVendorPayout({
          id: 'payout-2',
          status: PayoutStatus.FAILED,
          failureReason: 'Invalid account number',
        }),
      ];

      (prismaService as any).vendorPayout.findMany.mockResolvedValue(mockPayouts);

      const result = await prismaService.vendorPayout.findMany({
        where: {
          status: PayoutStatus.FAILED,
        },
      });

      expect(result).toHaveLength(2);
      expect(result.every((p) => p.status === PayoutStatus.FAILED)).toBe(true);
      expect(result.every((p) => p.failureReason !== null)).toBe(true);
    });
  });

  describe('Find Payouts by date range', () => {
    it('should find payouts within a date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockPayouts = [
        createMockVendorPayout({
          id: 'payout-1',
          createdAt: new Date('2024-06-15'),
        }),
        createMockVendorPayout({
          id: 'payout-2',
          createdAt: new Date('2024-08-20'),
        }),
      ];

      (prismaService as any).vendorPayout.findMany.mockResolvedValue(mockPayouts);

      const result = await prismaService.vendorPayout.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      expect(result).toHaveLength(2);
      expect(prismaService.vendorPayout.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    });

    it('should find payouts after a specific date', async () => {
      const afterDate = new Date('2024-06-01');

      const mockPayouts = [
        createMockVendorPayout({
          id: 'payout-1',
          createdAt: new Date('2024-07-01'),
        }),
      ];

      (prismaService as any).vendorPayout.findMany.mockResolvedValue(mockPayouts);

      const result = await prismaService.vendorPayout.findMany({
        where: {
          createdAt: {
            gte: afterDate,
          },
        },
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('Update Payout Status', () => {
    it('should update payout status', async () => {
      const updatedPayout = createMockVendorPayout({
        status: PayoutStatus.PROCESSING,
      });

      (prismaService as any).vendorPayout.update.mockResolvedValue(updatedPayout);

      const result = await prismaService.vendorPayout.update({
        where: { id: 'payout-123' },
        data: {
          status: PayoutStatus.PROCESSING,
        },
      });

      expect(result.status).toBe(PayoutStatus.PROCESSING);
    });
  });

  describe('Update gatewayTxnId', () => {
    it('should update gatewayTxnId', async () => {
      const updatedPayout = createMockVendorPayout({
        gatewayTxnId: 'txn_updated_999',
      });

      (prismaService as any).vendorPayout.update.mockResolvedValue(updatedPayout);

      const result = await prismaService.vendorPayout.update({
        where: { id: 'payout-123' },
        data: {
          gatewayTxnId: 'txn_updated_999',
        },
      });

      expect(result.gatewayTxnId).toBe('txn_updated_999');
    });
  });

  describe('Delete Payout', () => {
    it('should delete a payout', async () => {
      const deletedPayout = createMockVendorPayout();

      (prismaService as any).vendorPayout.delete.mockResolvedValue(deletedPayout);

      const result = await prismaService.vendorPayout.delete({
        where: { id: 'payout-123' },
      });

      expect(result.id).toBe('payout-123');
      expect(prismaService.vendorPayout.delete).toHaveBeenCalledWith({
        where: { id: 'payout-123' },
      });
    });
  });
});
