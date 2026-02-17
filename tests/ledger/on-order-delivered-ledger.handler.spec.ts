import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMode } from '@prisma/client';
import { OnOrderDeliveredLedgerHandler } from '../../src/ledger/services/handlers/on-order-delivered-ledger.handler';
import { PrismaService } from '../../src/common/database/prisma.service';
import { OrderDeliveredEvent } from '../../src/order/events/order-delivered.event';

/**
 * FeeName enum values (matching Prisma schema)
 */
const FeeName = {
  PRODUCT_LISTING: 'PRODUCT_LISTING',
  PLATFORM_FEE: 'PLATFORM_FEE',
  TRANSACTION_FEE: 'TRANSACTION_FEE',
  GST: 'GST',
  DELIVERY_FEE: 'DELIVERY_FEE',
  PROCESSING_FEE: 'PROCESSING_FEE',
  SERVICE_FEE: 'SERVICE_FEE',
  PACKAGING_FEE: 'PACKAGING_FEE',
};

/**
 * Mock factory functions for creating test data
 */
const createMockPlatformFee = (overrides: Partial<{
  id: string;
  feeName: string;
  value: Decimal;
  calculationType: 'PERCENTAGE' | 'FIXED';
  categoryId: string;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  applyOnFeeCode: string | null;
}> = {}) => ({
  id: 'platform-fee-id-1',
  feeName: FeeName.PRODUCT_LISTING,
  value: new Decimal(10),
  calculationType: 'PERCENTAGE' as const,
  categoryId: 'category-1',
  isActive: true,
  effectiveFrom: new Date('2024-01-01'),
  effectiveTo: null,
  applyOnFeeCode: null,
  ...overrides,
});

const createMockLedgerEntry = (overrides: Partial<{
  id: string;
  vendorId: string;
  orderItemId: string;
  type: 'SALE' | 'PLATFORM_FEE' | 'REFUND' | 'PAYOUT';
  feeType: string;
  amount: Decimal;
  paymentMode: PaymentMode;
  description: string | null;
  deliveryTimestamp: Date | null;
}> = {}) => ({
  id: 'ledger-id-1',
  vendorId: 'vendor-1',
  orderItemId: 'order-item-1',
  type: 'SALE' as const,
  feeType: 'SALE',
  amount: new Decimal(100),
  paymentMode: PaymentMode.COD,
  description: 'Test entry',
  deliveryTimestamp: new Date(),
  createdAt: new Date(),
  ...overrides,
});

const createOrderDeliveredEvent = (overrides: Partial<{
  orderId: string;
  orderNo: string;
  vendorId: string;
  orderItems: Array<{
    id: string;
    price: Decimal;
    quantity: number;
    product: { categoryId: string };
  }>;
  paymentMode: PaymentMode;
  deliveryTimestamp: Date;
}> = {}) => {
  const deliveryTimestamp = new Date();
  return new OrderDeliveredEvent(
    overrides.orderId ?? 'order-1',
    overrides.orderNo ?? 'ORD-001',
    overrides.vendorId ?? 'vendor-1',
    overrides.orderItems ?? [
      {
        id: 'order-item-1',
        price: new Decimal(100),
        quantity: 2,
        product: { categoryId: 'category-1' },
      },
    ],
    overrides.paymentMode ?? PaymentMode.COD,
    overrides.deliveryTimestamp ?? deliveryTimestamp,
  );
};

/**
 * Unit tests for OnOrderDeliveredLedgerHandler
 * Tests ledger entry creation when an order is delivered
 */
describe('OnOrderDeliveredLedgerHandler', () => {
  let handler: OnOrderDeliveredLedgerHandler;
  let prismaService: jest.Mocked<PrismaService>;
  let mockTx: any;

  /**
   * Setup mock PrismaService before each test
   */
  beforeEach(async () => {
    // Create mock transaction client
    mockTx = {
      ledger: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      platformFee: {
        findMany: jest.fn(),
      },
    };

    // Create mock PrismaService
    const mockPrismaService = {
      $transaction: jest.fn((callback) => callback(mockTx)),
      ledger: mockTx.ledger,
      platformFee: mockTx.platformFee,
    } as unknown as jest.Mocked<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnOrderDeliveredLedgerHandler,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    handler = module.get<OnOrderDeliveredLedgerHandler>(
      OnOrderDeliveredLedgerHandler,
    );
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    /**
     * Positive Test: Successful order delivery ledger update (COD)
     * Tests that ledger entries are created correctly when a COD order is delivered
     * COD: Only PRODUCT_LISTING fee is created (no SALE entry for COD)
     */
    it('should create ledger entries when COD order is delivered successfully', async () => {
      // Arrange
      const event = createOrderDeliveredEvent({
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(100),
            quantity: 2,
            product: { categoryId: 'category-1' },
          },
        ],
        paymentMode: PaymentMode.COD,
      });

      // Mock: No existing ledger entries (idempotency check passes)
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Return platform fees
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert
      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(mockTx.ledger.findFirst).toHaveBeenCalledWith({
        where: { orderItemId: 'order-item-1', type: 'SALE' },
      });
      expect(mockTx.platformFee.findMany).toHaveBeenCalled();
      // COD: Only PRODUCT_LISTING (no SALE entry for COD)
      expect(mockTx.ledger.create).toHaveBeenCalledTimes(1);
    });

    /**
     * Positive Test: Multiple order items (COD)
     * Tests that ledger entries are created for each order item
     * COD: Only PRODUCT_LISTING fee per item (no SALE entry for COD)
     */
    it('should create ledger entries for each order item (COD)', async () => {
      // Arrange
      const event = createOrderDeliveredEvent({
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(50),
            quantity: 2,
            product: { categoryId: 'category-1' },
          },
          {
            id: 'order-item-2',
            price: new Decimal(75),
            quantity: 1,
            product: { categoryId: 'category-1' },
          },
        ],
        paymentMode: PaymentMode.COD,
      });

      // Mock: No existing entries for either item
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Return platform fees
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert
      expect(mockTx.ledger.findFirst).toHaveBeenCalledTimes(2);
      // COD: Only PRODUCT_LISTING per item (no SALE entry for COD)
      expect(mockTx.ledger.create).toHaveBeenCalledTimes(2); // 2 items × 1 entry each
    });

    /**
     * Positive Test: Online payment mode with all fees
     * Tests that all fee types are created for ONLINE payment mode
     */
    it('should create all fee entries for ONLINE payment mode', async () => {
      // Arrange
      const event = createOrderDeliveredEvent({
        paymentMode: PaymentMode.ONLINE,
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(100),
            quantity: 1,
            product: { categoryId: 'category-1' },
          },
        ],
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Return all platform fees
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
        createMockPlatformFee({
          feeName: FeeName.TRANSACTION_FEE,
          value: new Decimal(2),
          calculationType: 'PERCENTAGE',
        }),
        createMockPlatformFee({
          feeName: FeeName.GST,
          value: new Decimal(18),
          calculationType: 'PERCENTAGE',
          applyOnFeeCode: FeeName.TRANSACTION_FEE,
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert: PRODUCT_LISTING + TRANSACTION_FEE + GST + SALE = 4 entries
      expect(mockTx.ledger.create).toHaveBeenCalledTimes(4);
    });

    /**
     * Negative Test: Duplicate delivery events
     * Tests that existing ledger entries prevent duplicate creation (idempotency)
     */
    it('should skip creating entries when duplicate delivery event is received', async () => {
      // Arrange
      const event = createOrderDeliveredEvent({
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(100),
            quantity: 1,
            product: { categoryId: 'category-1' },
          },
        ],
      });

      // Mock: Existing ledger entry found (idempotency check fails)
      mockTx.ledger.findFirst.mockResolvedValue(
        createMockLedgerEntry({ type: 'SALE' }),
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockTx.ledger.findFirst).toHaveBeenCalled();
      expect(mockTx.platformFee.findMany).not.toHaveBeenCalled();
      expect(mockTx.ledger.create).not.toHaveBeenCalled();
    });

    /**
     * Negative Test: Invalid order data - missing order ID
     * Tests handler handles missing order ID gracefully
     */
    it('should skip processing when order ID is missing', async () => {
      // Arrange
      const event = createOrderDeliveredEvent({
        orderId: '',
      } as any);

      // Act
      await handler.handle(event);

      // Assert - should not create any entries
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    /**
     * Negative Test: Invalid order data - empty order items
     * Tests handler handles empty order items array gracefully
     */
    it('should skip processing when order items are empty', async () => {
      // Arrange
      const event = createOrderDeliveredEvent({
        orderItems: [],
      });

      // Act
      await handler.handle(event);

      // Assert - should not create any entries
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    /**
     * Negative Test: Database error during transaction (ONLINE)
     * Tests that errors are properly thrown and logged
     * Note: Error handling is tested with ONLINE payment mode since that creates SALE entry
     */
    it('should throw error when database operation fails', async () => {
      // Arrange - Use ONLINE to trigger SALE entry creation
      const event = createOrderDeliveredEvent({
        paymentMode: PaymentMode.ONLINE,
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Platform fees found
      mockTx.platformFee.findMany.mockResolvedValue([]);

      // Mock: Database error
      const dbError = new Error('Database connection failed');
      mockTx.ledger.create.mockRejectedValue(dbError);

      // Act & Assert
      await expect(handler.handle(event)).rejects.toThrow(
        'Database connection failed',
      );
    });

    /**
     * Edge Case: Zero listing fee
     * Tests that no listing fee entry is created when fee is zero
     */
    it('should not create listing fee entry when fee is zero', async () => {
      // Arrange
      const event = createOrderDeliveredEvent();

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Zero platform fee
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(0),
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds for sale
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Only SALE entry should be created
      const ledgerCreates = mockTx.ledger.create.mock.calls;
      const listingFeeCreates = ledgerCreates.filter((call: any) =>
        call[0]?.data?.feeType === FeeName.PRODUCT_LISTING,
      );
      expect(listingFeeCreates).toHaveLength(0);
    });

    /**
     * Edge Case: Payment gateway fee only for ONLINE payments
     * Tests that payment gateway fee is only applied for ONLINE orders
     * COD: Query filter ensures only PRODUCT_LISTING is fetched
     */
    it('should not create payment gateway fee for COD orders', async () => {
      // Arrange
      const event = createOrderDeliveredEvent({
        paymentMode: PaymentMode.COD,
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Query filter ensures only PRODUCT_LISTING is returned for COD
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Verify query was called with feeName filter for COD
      expect(mockTx.platformFee.findMany).toHaveBeenCalledWith({
        where: {
          categoryId: 'category-1',
          isActive: true,
          effectiveFrom: { lte: expect.any(Date) },
          feeName: FeeName.PRODUCT_LISTING,
        },
      });

      // Verify only PRODUCT_LISTING is created (no TRANSACTION_FEE)
      const ledgerCreates = mockTx.ledger.create.mock.calls;
      const transactionFeeCreates = ledgerCreates.filter(
        (call: any) => call[0]?.data?.feeType === FeeName.TRANSACTION_FEE,
      );
      expect(transactionFeeCreates).toHaveLength(0);
    });

    /**
     * Edge Case: Platform fee with FIXED calculation type
     * Tests that fixed fees are calculated correctly
     */
    it('should calculate fixed fees correctly', async () => {
      // Arrange
      const event = createOrderDeliveredEvent();

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Fixed platform fee
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(50),
          calculationType: 'FIXED',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert
      const listingFeeCall = mockTx.ledger.create.mock.calls.find(
        (call: any) => call[0]?.data?.feeType === FeeName.PRODUCT_LISTING,
      );
      expect(listingFeeCall).toBeDefined();
      // Fixed fee should be applied once, not multiplied by item amount
      expect(listingFeeCall[0].data.amount.toNumber()).toBe(-50);
    });

    /**
     * Edge Case: Platform fee with PERCENTAGE calculation type
     * Tests that percentage fees are calculated correctly
     */
    it('should calculate percentage fees correctly', async () => {
      // Arrange
      const event = createOrderDeliveredEvent({
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(100),
            quantity: 2, // itemAmount = 200
            product: { categoryId: 'category-1' },
          },
        ],
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: 10% platform fee
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - 10% of 200 = 20
      const listingFeeCall = mockTx.ledger.create.mock.calls.find(
        (call: any) => call[0]?.data?.feeType === FeeName.PRODUCT_LISTING,
      );
      expect(listingFeeCall).toBeDefined();
      expect(listingFeeCall[0].data.amount.toNumber()).toBe(-20);
    });

    /**
     * Edge Case: GST calculation with applyOnFeeCode
     * Tests that GST is calculated on the correct base amount
     */
    it('should calculate GST on payment gateway fee when applyOnFeeCode is set', async () => {
      // Arrange
      const event = createOrderDeliveredEvent({
        paymentMode: PaymentMode.ONLINE,
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(100),
            quantity: 1,
            product: { categoryId: 'category-1' },
          },
        ],
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Fees with GST applying on TRANSACTION_FEE
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
        createMockPlatformFee({
          feeName: FeeName.TRANSACTION_FEE,
          value: new Decimal(2),
          calculationType: 'PERCENTAGE',
        }),
        createMockPlatformFee({
          feeName: FeeName.GST,
          value: new Decimal(18),
          calculationType: 'PERCENTAGE',
          applyOnFeeCode: FeeName.TRANSACTION_FEE,
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert
      // TRANSACTION_FEE: 2% of 100 = 2
      // GST: 18% of 2 = 0.36
      const gstCall = mockTx.ledger.create.mock.calls.find(
        (call: any) => call[0]?.data?.feeType === FeeName.GST,
      );
      expect(gstCall).toBeDefined();
      expect(gstCall[0].data.amount.toNumber()).toBeCloseTo(-0.36, 2);
    });

    /**
     * Edge Case: No platform fees configured (ONLINE)
     * Tests handler behavior when no platform fees are found
     * Uses ONLINE since that's when SALE entry is created
     */
    it('should handle missing platform fees gracefully', async () => {
      // Arrange - Use ONLINE to create SALE entry
      const event = createOrderDeliveredEvent({
        paymentMode: PaymentMode.ONLINE,
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: No platform fees found
      mockTx.platformFee.findMany.mockResolvedValue([]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Only SALE entry should be created with default (zero) fees
      const ledgerCreates = mockTx.ledger.create.mock.calls;
      expect(ledgerCreates).toHaveLength(1); // Only SALE
      expect(ledgerCreates[0][0].data.type).toBe('SALE');
    });

    /**
     * Edge Case: Order with missing category ID in product (ONLINE)
     * Tests handler behavior when order item product has no category
     * Uses ONLINE since that's when SALE entry is created
     */
    it('should handle order items with missing category gracefully', async () => {
      // Arrange - Use ONLINE to create SALE entry
      const event = createOrderDeliveredEvent({
        paymentMode: PaymentMode.ONLINE,
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(100),
            quantity: 1,
            product: { categoryId: '' }, // Empty category ID
          },
        ],
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: No platform fees (empty result for empty category)
      mockTx.platformFee.findMany.mockResolvedValue([]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Should still create SALE entry
      expect(mockTx.ledger.create).toHaveBeenCalled();
    });

    /**
     * Validation Test: Verify ledger entry creation with correct data (ONLINE)
     * Tests that created ledger entries have correct structure
     * Uses ONLINE since that's when SALE entry is created
     */
    it('should create ledger entries with correct data structure', async () => {
      // Arrange - Use ONLINE to create SALE entry
      const deliveryTimestamp = new Date('2025-01-15T10:30:00Z');
      const event = createOrderDeliveredEvent({
        deliveryTimestamp,
        paymentMode: PaymentMode.ONLINE,
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(100),
            quantity: 2,
            product: { categoryId: 'category-1' },
          },
        ],
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Platform fees
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Verify SALE entry structure
      const saleCall = mockTx.ledger.create.mock.calls.find(
        (call: any) => call[0]?.data?.type === 'SALE',
      );
      expect(saleCall).toBeDefined();

      const saleData = saleCall[0].data;
      expect(saleData.vendorId).toBe('vendor-1');
      expect(saleData.orderItemId).toBe('order-item-1');
      expect(saleData.type).toBe('SALE');
      expect(saleData.feeType).toBe('SALE');
      expect(saleData.amount.toNumber()).toBe(200); // 100 * 2
      expect(saleData.paymentMode).toBe(PaymentMode.ONLINE);
      expect(saleData.description).toContain('Sale');
      expect(saleData.description).toContain('2025-01-15');
      // Verify deliveryTimestamp is passed to SALE entry
      expect(saleData.deliveryTimestamp).toEqual(deliveryTimestamp);

      // Assert - Verify platform fee entry has deliveryTimestamp
      const platformFeeCall = mockTx.ledger.create.mock.calls.find(
        (call: any) => call[0]?.data?.feeType === FeeName.PRODUCT_LISTING,
      );
      expect(platformFeeCall).toBeDefined();
      const platformFeeData = platformFeeCall[0].data;
      expect(platformFeeData.deliveryTimestamp).toEqual(deliveryTimestamp);
    });

    /**
     * Validation Test: Verify platform fee amounts are negative
     * Tests that platform fees are recorded as negative amounts (vendor expense)
     */
    it('should create platform fee entries with negative amounts', async () => {
      // Arrange
      const event = createOrderDeliveredEvent();

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Platform fees
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10), // 10% of 100 = 10
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Platform fee should be negative
      const listingFeeCall = mockTx.ledger.create.mock.calls.find(
        (call: any) => call[0]?.data?.feeType === FeeName.PRODUCT_LISTING,
      );
      expect(listingFeeCall).toBeDefined();
      expect(listingFeeCall[0].data.amount.lt(0)).toBe(true);
    });

    /**
     * Interaction Test: Handler with Prisma transaction
     * Tests that handler correctly uses Prisma transaction
     */
    it('should use Prisma transaction for atomic operations', async () => {
      // Arrange
      const event = createOrderDeliveredEvent();

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Platform fees
      mockTx.platformFee.findMany.mockResolvedValue([]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert
      expect(prismaService.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    /**
     * Interaction Test: Multiple items with some having existing entries (ONLINE)
     * Tests that handler processes items that don't have existing entries
     * Uses ONLINE since that's when SALE entry is created
     */
    it('should process items without existing entries even when other items have entries', async () => {
      // Arrange - Use ONLINE to create SALE entry
      const event = createOrderDeliveredEvent({
        paymentMode: PaymentMode.ONLINE,
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(50),
            quantity: 1,
            product: { categoryId: 'category-1' },
          },
          {
            id: 'order-item-2',
            price: new Decimal(75),
            quantity: 1,
            product: { categoryId: 'category-1' },
          },
        ],
      });

      // Mock: First item has existing entry, second doesn't
      mockTx.ledger.findFirst
        .mockResolvedValueOnce(createMockLedgerEntry({ type: 'SALE' }))
        .mockResolvedValueOnce(null);

      // Mock: Platform fees
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Only process item 2 (item 1 has existing entry)
      expect(mockTx.ledger.findFirst).toHaveBeenCalledTimes(2);
      // ONLINE: PRODUCT_LISTING + SALE for item 2 = 2 entries
      expect(mockTx.ledger.create).toHaveBeenCalledTimes(2);
    });

    /**
     * Edge Case: Order with very large amounts (ONLINE)
     * Tests handler behavior with large decimal values
     * Uses ONLINE since that's when SALE entry is created
     */
    it('should handle large decimal values correctly', async () => {
      // Arrange - Use ONLINE to create SALE entry
      const event = createOrderDeliveredEvent({
        paymentMode: PaymentMode.ONLINE,
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(999999.99),
            quantity: 999,
            product: { categoryId: 'category-1' },
          },
        ],
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Platform fees
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Calculate correctly: 999999.99 * 999 * 10% = 999999.99 * 99.9
      const saleCall = mockTx.ledger.create.mock.calls.find(
        (call: any) => call[0]?.data?.type === 'SALE',
      );
      expect(saleCall).toBeDefined();
      // Approximate calculation: 999999.99 * 999 = 998999990.01
      expect(saleCall[0].data.amount.toNumber()).toBeCloseTo(998999990.01, 0);
    });

    /**
     * COD Specific Test: Verify query filter includes feeName for COD orders
     * Tests that the platform fee query includes feeName: PRODUCT_LISTING when paymentMode is COD
     */
    it('should filter platform fees query by PRODUCT_LISTING for COD orders', async () => {
      // Arrange
      const event = createOrderDeliveredEvent({
        paymentMode: PaymentMode.COD,
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(100),
            quantity: 1,
            product: { categoryId: 'category-1' },
          },
        ],
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Return platform fees (query should be filtered to PRODUCT_LISTING)
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Verify the query was called with feeName filter for COD
      expect(mockTx.platformFee.findMany).toHaveBeenCalledWith({
        where: {
          categoryId: 'category-1',
          isActive: true,
          effectiveFrom: { lte: expect.any(Date) },
          feeName: FeeName.PRODUCT_LISTING,
        },
      });
    });

    /**
     * COD Specific Test: Verify query has no feeName filter for ONLINE orders
     * Tests that the platform fee query does NOT include feeName filter when paymentMode is ONLINE
     */
    it('should not filter by feeName for ONLINE payment mode', async () => {
      // Arrange
      const event = createOrderDeliveredEvent({
        paymentMode: PaymentMode.ONLINE,
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(100),
            quantity: 1,
            product: { categoryId: 'category-1' },
          },
        ],
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Return platform fees
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Verify the query was called WITHOUT feeName filter for ONLINE
      expect(mockTx.platformFee.findMany).toHaveBeenCalledWith({
        where: {
          categoryId: 'category-1',
          isActive: true,
          effectiveFrom: { lte: expect.any(Date) },
        },
      });
    });

    /**
     * COD Specific Test: Verify query filter includes feeName for COD orders
     * Tests that the platform fee query includes feeName: PRODUCT_LISTING when paymentMode is COD
     * The query filter now ensures only PRODUCT_LISTING is fetched
     */
    it('should explicitly filter out non-PRODUCT_LISTING fees for COD orders', async () => {
      // Arrange
      const event = createOrderDeliveredEvent({
        paymentMode: PaymentMode.COD,
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(100),
            quantity: 1,
            product: { categoryId: 'category-1' },
          },
        ],
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Query filter ensures only PRODUCT_LISTING is returned for COD
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Verify query was called with feeName filter for COD
      expect(mockTx.platformFee.findMany).toHaveBeenCalledWith({
        where: {
          categoryId: 'category-1',
          isActive: true,
          effectiveFrom: { lte: expect.any(Date) },
          feeName: FeeName.PRODUCT_LISTING,
        },
      });

      // Only PRODUCT_LISTING should be created (COD has no SALE entry)
      const ledgerCreates = mockTx.ledger.create.mock.calls;
      const productListingCreates = ledgerCreates.filter(
        (call: any) => call[0]?.data?.feeType === FeeName.PRODUCT_LISTING,
      );
      const transactionFeeCreates = ledgerCreates.filter(
        (call: any) => call[0]?.data?.feeType === FeeName.TRANSACTION_FEE,
      );
      const gstCreates = ledgerCreates.filter(
        (call: any) => call[0]?.data?.feeType === FeeName.GST,
      );

      expect(productListingCreates).toHaveLength(1);
      expect(transactionFeeCreates).toHaveLength(0);
      expect(gstCreates).toHaveLength(0);
      // Only PRODUCT_LISTING = 1 entry (COD has no SALE)
      expect(ledgerCreates).toHaveLength(1);
    });

    /**
     * Validation Test: Verify deliveryTimestamp is passed to createSaleEntry (ONLINE)
     * Tests that the deliveryTimestamp from the event is correctly passed to the
     * createSaleEntry factory method and stored in the resulting ledger entry
     */
    it('should pass deliveryTimestamp to createSaleEntry for ONLINE payment mode', async () => {
      // Arrange
      const deliveryTimestamp = new Date('2025-06-20T14:45:00Z');
      const event = createOrderDeliveredEvent({
        deliveryTimestamp,
        paymentMode: PaymentMode.ONLINE,
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(150),
            quantity: 1,
            product: { categoryId: 'category-1' },
          },
        ],
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Platform fees
      mockTx.platformFee.findMany.mockResolvedValue([]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Find the SALE entry call
      const saleCall = mockTx.ledger.create.mock.calls.find(
        (call: any) => call[0]?.data?.type === 'SALE',
      );
      expect(saleCall).toBeDefined();

      // Verify deliveryTimestamp is passed to SALE entry
      expect(saleCall[0].data.deliveryTimestamp).toEqual(deliveryTimestamp);
      expect(saleCall[0].data.deliveryTimestamp).toBeInstanceOf(Date);
      expect(saleCall[0].data.deliveryTimestamp.toISOString()).toBe('2025-06-20T14:45:00.000Z');
    });

    /**
     * Validation Test: Verify deliveryTimestamp is passed to createPlatformFeeEntry (COD)
     * Tests that the deliveryTimestamp from the event is correctly passed to the
     * createPlatformFeeEntry factory method and stored in the resulting ledger entry
     * COD mode only creates platform fee entries (no SALE entry)
     */
    it('should pass deliveryTimestamp to createPlatformFeeEntry for COD payment mode', async () => {
      // Arrange
      const deliveryTimestamp = new Date('2025-07-10T09:00:00Z');
      const event = createOrderDeliveredEvent({
        deliveryTimestamp,
        paymentMode: PaymentMode.COD,
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(200),
            quantity: 2,
            product: { categoryId: 'category-1' },
          },
        ],
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Platform fees
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Find the PRODUCT_LISTING platform fee entry call
      const platformFeeCall = mockTx.ledger.create.mock.calls.find(
        (call: any) => call[0]?.data?.feeType === FeeName.PRODUCT_LISTING,
      );
      expect(platformFeeCall).toBeDefined();

      // Verify deliveryTimestamp is passed to platform fee entry
      expect(platformFeeCall[0].data.deliveryTimestamp).toEqual(deliveryTimestamp);
      expect(platformFeeCall[0].data.deliveryTimestamp).toBeInstanceOf(Date);
      expect(platformFeeCall[0].data.deliveryTimestamp.toISOString()).toBe('2025-07-10T09:00:00.000Z');
    });

    /**
     * Validation Test: Verify deliveryTimestamp is passed to both SALE and platform fee entries
     * Tests that deliveryTimestamp is correctly passed to both factory methods
     * for ONLINE payment mode which creates both types of entries
     */
    it('should pass deliveryTimestamp to both createSaleEntry and createPlatformFeeEntry for ONLINE mode', async () => {
      // Arrange
      const deliveryTimestamp = new Date('2025-08-05T16:30:00Z');
      const event = createOrderDeliveredEvent({
        deliveryTimestamp,
        paymentMode: PaymentMode.ONLINE,
        orderItems: [
          {
            id: 'order-item-1',
            price: new Decimal(100),
            quantity: 1,
            product: { categoryId: 'category-1' },
          },
        ],
      });

      // Mock: No existing entries
      mockTx.ledger.findFirst.mockResolvedValue(null);

      // Mock: Platform fees
      mockTx.platformFee.findMany.mockResolvedValue([
        createMockPlatformFee({
          feeName: FeeName.PRODUCT_LISTING,
          value: new Decimal(10),
          calculationType: 'PERCENTAGE',
        }),
        createMockPlatformFee({
          feeName: FeeName.TRANSACTION_FEE,
          value: new Decimal(2),
          calculationType: 'PERCENTAGE',
        }),
      ]);

      // Mock: Ledger create succeeds
      mockTx.ledger.create.mockResolvedValue(createMockLedgerEntry());

      // Act
      await handler.handle(event);

      // Assert - Find SALE entry and verify deliveryTimestamp
      const saleCall = mockTx.ledger.create.mock.calls.find(
        (call: any) => call[0]?.data?.type === 'SALE',
      );
      expect(saleCall).toBeDefined();
      expect(saleCall[0].data.deliveryTimestamp).toEqual(deliveryTimestamp);

      // Assert - Find all platform fee entries and verify deliveryTimestamp
      const platformFeeCalls = mockTx.ledger.create.mock.calls.filter(
        (call: any) => call[0]?.data?.feeType !== 'SALE',
      );
      expect(platformFeeCalls.length).toBeGreaterThan(0);
      
      // Verify each platform fee entry has the correct deliveryTimestamp
      for (const platformFeeCall of platformFeeCalls) {
        expect(platformFeeCall[0].data.deliveryTimestamp).toEqual(deliveryTimestamp);
      }
    });
  });
});
