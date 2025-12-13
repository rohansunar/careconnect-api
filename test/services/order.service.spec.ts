import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from '../../src/order/services/order.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { CreateOrderDto } from '../../src/order/dto/create-order.dto';
import { UpdateOrderDto } from '../../src/order/dto/update-order.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  mockCustomer,
  mockVendor,
  mockAddress,
  mockProduct,
  mockOrder,
  mockCreateOrderDto,
  mockUpdateOrderDto,
  mockOrderList,
  mockMinimalOrder,
} from '../mocks/order-mocks';

/**
 * Comprehensive unit tests for OrderService.
 *
 * Rationale for comprehensive testing:
 * - Ensures reliability: By mocking PrismaService, we isolate the service logic and verify correct database interactions without external dependencies.
 * - Covers key methods: Tests for create, findAll, findOne, update, and delete methods ensure all CRUD operations are validated.
 * - Validates business logic: Tests include validation of related entities (customer, vendor, address, product) and proper error handling.
 * - Error handling scenarios: Includes tests for not found entities, invalid data, and edge cases to guarantee robust error handling.
 * - Maintainability: Detailed assertions on Prisma method calls and return values make it easy to identify regressions during future code changes.
 * - Successful and failed cases: Balances positive and negative test cases to confirm expected behavior under various conditions.
 */

describe('OrderService', () => {
  let service: OrderService;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      order: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      vendor: {
        findUnique: jest.fn(),
      },
      customerAddress: {
        findUnique: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto: CreateOrderDto = mockCreateOrderDto;

    const mockOrderResponse = {
      ...mockOrder,
      assigned_rider_phone: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should create order successfully with all validations', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.customerAddress.findUnique.mockResolvedValue(mockAddress);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.order.create.mockResolvedValue(mockOrderResponse);

      const result = await service.create(dto);

      expect(result).toEqual(mockOrderResponse);
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({ where: { id: mockCustomer.id } });
      expect(mockPrismaService.vendor.findUnique).toHaveBeenCalledWith({ where: { id: mockVendor.id } });
      expect(mockPrismaService.customerAddress.findUnique).toHaveBeenCalledWith({ where: { id: mockAddress.id } });
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({ where: { id: mockProduct.id } });
      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: dto,
        include: {
          customer: true,
          vendor: true,
          address: true,
          product: true,
        },
      });
    });

    it('should create order with minimal fields (no validations)', async () => {
      const minimalDto: CreateOrderDto = {
        qty: 1,
        total_amount: 50.0,
      };

      mockPrismaService.order.create.mockResolvedValue(mockMinimalOrder);

      const result = await service.create(minimalDto);

      expect(result).toEqual(mockMinimalOrder);
      expect(mockPrismaService.customer.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: minimalDto,
        include: {
          customer: true,
          vendor: true,
          address: true,
          product: true,
        },
      });
    });

    it('should throw BadRequestException for non-existent customer', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({ where: { id: mockCustomer.id } });
      expect(mockPrismaService.order.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-existent vendor', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.vendor.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.vendor.findUnique).toHaveBeenCalledWith({ where: { id: mockVendor.id } });
      expect(mockPrismaService.order.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-existent address', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.customerAddress.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.customerAddress.findUnique).toHaveBeenCalledWith({ where: { id: mockAddress.id } });
      expect(mockPrismaService.order.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for inactive product', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.customerAddress.findUnique.mockResolvedValue(mockAddress);
      mockPrismaService.product.findUnique.mockResolvedValue({ ...mockProduct, is_active: false });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({ where: { id: mockProduct.id } });
      expect(mockPrismaService.order.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all orders with relations', async () => {
      mockPrismaService.order.findMany.mockResolvedValue(mockOrderList);

      const result = await service.findAll();

      expect(result).toEqual(mockOrderList);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        include: {
          customer: true,
          vendor: true,
          address: true,
          product: true,
        },
        orderBy: { created_at: 'desc' },
      });
    });

    it('should return empty array when no orders', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const orderId = mockOrder.id;

    it('should return order by ID', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne(orderId);

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: true,
          address: true,
          product: true,
        },
      });
    });

    it('should throw NotFoundException for non-existent order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne(orderId)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: true,
          address: true,
          product: true,
        },
      });
    });
  });

  describe('update', () => {
    const orderId = mockOrder.id;
    const dto: UpdateOrderDto = mockUpdateOrderDto;

    const updatedOrder = {
      ...mockOrder,
      status: 'CONFIRMED',
      payment_status: 'PAID',
      assigned_rider_phone: '+5566778899',
    };

    it('should update order successfully', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.update(orderId, dto);

      expect(result).toEqual(updatedOrder);
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({ where: { id: orderId } });
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: dto,
        include: {
          customer: true,
          vendor: true,
          address: true,
          product: true,
        },
      });
    });

    it('should validate related entities on update', async () => {
      const dtoWithIds: UpdateOrderDto = {
        customer_id: 'new-customer-123',
        vendor_id: 'new-vendor-456',
      };

      mockPrismaService.order.findUnique.mockResolvedValue({ id: orderId });
      mockPrismaService.customer.findUnique.mockResolvedValue({ id: 'new-customer-123' });
      mockPrismaService.vendor.findUnique.mockResolvedValue({ id: 'new-vendor-456' });
      mockPrismaService.order.update.mockResolvedValue(mockOrder);

      await service.update(orderId, dtoWithIds);

      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({ where: { id: 'new-customer-123' } });
      expect(mockPrismaService.vendor.findUnique).toHaveBeenCalledWith({ where: { id: 'new-vendor-456' } });
    });

    it('should throw NotFoundException for non-existent order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.update(orderId, dto)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({ where: { id: orderId } });
      expect(mockPrismaService.order.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid customer on update', async () => {
      const dtoWithInvalidId: UpdateOrderDto = {
        customer_id: 'invalid-customer',
      };

      mockPrismaService.order.findUnique.mockResolvedValue({ id: orderId });
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.update(orderId, dtoWithInvalidId)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.order.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const orderId = mockOrder.id;

    it('should delete order successfully', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.delete.mockResolvedValue(mockOrder);

      const result = await service.delete(orderId);

      expect(result).toEqual({ message: 'Order deleted successfully' });
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({ where: { id: orderId } });
      expect(mockPrismaService.order.delete).toHaveBeenCalledWith({ where: { id: orderId } });
    });

    it('should throw NotFoundException for non-existent order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.delete(orderId)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({ where: { id: orderId } });
      expect(mockPrismaService.order.delete).not.toHaveBeenCalled();
    });
  });
});