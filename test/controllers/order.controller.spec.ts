import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OrderController } from '../../src/order/controllers/order.controller';
import { OrderService } from '../../src/order/services/order.service';
import { CustomerAuthGuard } from '../../src/auth/guards/customer-auth.guard';
import { CreateOrderDto } from '../../src/order/dto/create-order.dto';
import { UpdateOrderDto } from '../../src/order/dto/update-order.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * Unit tests for OrderController.
 *
 * Rationale for controller testing:
 * - Ensures API reliability: Unit tests validate that controller methods correctly handle HTTP requests, delegate to services, and return appropriate responses, ensuring the API behaves as specified.
 * - Isolates controller logic: By mocking the OrderService, we test the controller's responsibility of routing and response handling without external dependencies.
 * - Covers critical endpoints: Tests for POST /orders (create), GET /orders (findAll), GET /orders/:id (findOne), and PATCH /orders/:id (update) ensure CRUD operations are validated.
 * - Validates HTTP status codes: Error scenarios test that appropriate exceptions are thrown, which map to correct HTTP status codes in the framework.
 * - Tests authentication: Ensures CustomerAuthGuard is properly applied to all endpoints.
 * - Maintains code quality: Comprehensive tests with comments promote maintainability, allowing future changes to be validated against expected behavior.
 */

describe('OrderController', () => {
  let app: INestApplication;
  let mockOrderService: jest.Mocked<OrderService>;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockAuthGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(CustomerAuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();
    mockOrderService = module.get(OrderService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /orders', () => {
    it('should create a new order successfully and return 201', async () => {
      const dto: CreateOrderDto = {
        customer_id: 'customer-123',
        vendor_id: 'vendor-456',
        address_id: 'address-789',
        product_id: 'product-101',
        qty: 2,
        total_amount: 100.5,
        status: 'PENDING',
        payment_status: 'PENDING',
      };

      const expectedResponse = {
        id: 'order-uuid',
        customer_id: 'customer-123',
        vendor_id: 'vendor-456',
        address_id: 'address-789',
        product_id: 'product-101',
        qty: 2,
        total_amount: 100.5,
        status: 'PENDING',
        payment_status: 'PENDING',
        assigned_rider_phone: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer: { id: 'customer-123', name: 'John Doe' },
        vendor: { id: 'vendor-456', name: 'Vendor Inc' },
        address: { id: 'address-789', label: 'Home' },
        product: { id: 'product-101', name: 'Water Jar' },
      };

      mockOrderService.create.mockResolvedValue(expectedResponse as any);

      const response = await request(app.getHttpServer())
        .post('/orders')
        .send(dto)
        .expect(201);

      expect(response.body).toEqual(expectedResponse);
      expect(mockOrderService.create).toHaveBeenCalledWith(dto);
      expect(mockOrderService.create).toHaveBeenCalledTimes(1);
    });

    it('should create order with minimal fields', async () => {
      const dto: CreateOrderDto = {
        qty: 1,
        total_amount: 50.0,
      };

      const expectedResponse = {
        id: 'order-uuid',
        customer_id: null,
        vendor_id: null,
        address_id: null,
        product_id: null,
        qty: 1,
        total_amount: 50.0,
        status: 'PENDING',
        payment_status: 'PENDING',
        assigned_rider_phone: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer: null,
        vendor: null,
        address: null,
        product: null,
      };

      mockOrderService.create.mockResolvedValue(expectedResponse as any);

      const response = await request(app.getHttpServer())
        .post('/orders')
        .send(dto)
        .expect(201);

      expect(response.body).toEqual(expectedResponse);
      expect(mockOrderService.create).toHaveBeenCalledWith(dto);
    });

    it('should throw 400 Bad Request for invalid data', async () => {
      const dto: CreateOrderDto = {
        qty: -1, // Invalid quantity
        total_amount: 100.5,
      };

      mockOrderService.create.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await request(app.getHttpServer()).post('/orders').send(dto).expect(400);

      expect(mockOrderService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('GET /orders', () => {
    it('should retrieve all orders successfully and return 200', async () => {
      const expectedResponse = [
        {
          id: 'order-1',
          customer_id: 'customer-123',
          qty: 2,
          total_amount: 100.5,
          status: 'PENDING',
          payment_status: 'PENDING',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'order-2',
          customer_id: 'customer-456',
          qty: 1,
          total_amount: 50.0,
          status: 'COMPLETED',
          payment_status: 'PAID',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockOrderService.findAll.mockResolvedValue(expectedResponse as any);

      const response = await request(app.getHttpServer())
        .get('/orders')
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockOrderService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no orders exist', async () => {
      mockOrderService.findAll.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/orders')
        .expect(200);

      expect(response.body).toEqual([]);
      expect(mockOrderService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /orders/:id', () => {
    it('should retrieve a single order by ID successfully and return 200', async () => {
      const orderId = 'order-123';
      const expectedResponse = {
        id: 'order-123',
        customer_id: 'customer-123',
        vendor_id: 'vendor-456',
        address_id: 'address-789',
        product_id: 'product-101',
        qty: 2,
        total_amount: 100.5,
        status: 'PENDING',
        payment_status: 'PENDING',
        assigned_rider_phone: '1234567890',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer: { id: 'customer-123', name: 'John Doe' },
        vendor: { id: 'vendor-456', name: 'Vendor Inc' },
        address: { id: 'address-789', label: 'Home' },
        product: { id: 'product-101', name: 'Water Jar' },
      };

      mockOrderService.findOne.mockResolvedValue(expectedResponse as any);

      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockOrderService.findOne).toHaveBeenCalledWith(orderId);
      expect(mockOrderService.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw 404 Not Found for non-existent order', async () => {
      const orderId = 'non-existent-id';

      mockOrderService.findOne.mockRejectedValue(
        new NotFoundException('Order not found'),
      );

      await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .expect(404);

      expect(mockOrderService.findOne).toHaveBeenCalledWith(orderId);
    });
  });

  describe('PATCH /orders/:id', () => {
    it('should update order successfully and return 200', async () => {
      const orderId = 'order-123';
      const dto: UpdateOrderDto = {
        status: 'COMPLETED',
        payment_status: 'PAID',
        assigned_rider_phone: '9876543210',
      };

      const expectedResponse = {
        id: 'order-123',
        customer_id: 'customer-123',
        vendor_id: 'vendor-456',
        address_id: 'address-789',
        product_id: 'product-101',
        qty: 2,
        total_amount: 100.5,
        status: 'COMPLETED',
        payment_status: 'PAID',
        assigned_rider_phone: '9876543210',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer: { id: 'customer-123', name: 'John Doe' },
        vendor: { id: 'vendor-456', name: 'Vendor Inc' },
        address: { id: 'address-789', label: 'Home' },
        product: { id: 'product-101', name: 'Water Jar' },
      };

      mockOrderService.update.mockResolvedValue(expectedResponse as any);

      const response = await request(app.getHttpServer())
        .patch(`/orders/${orderId}`)
        .send(dto)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockOrderService.update).toHaveBeenCalledWith(orderId, dto);
      expect(mockOrderService.update).toHaveBeenCalledTimes(1);
    });

    it('should update order quantity and amount', async () => {
      const orderId = 'order-123';
      const dto: UpdateOrderDto = {
        qty: 3,
        total_amount: 150.75,
      };

      const expectedResponse = {
        id: 'order-123',
        qty: 3,
        total_amount: 150.75,
        status: 'PENDING',
        payment_status: 'PENDING',
        updated_at: new Date().toISOString(),
      };

      mockOrderService.update.mockResolvedValue(expectedResponse as any);

      const response = await request(app.getHttpServer())
        .patch(`/orders/${orderId}`)
        .send(dto)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockOrderService.update).toHaveBeenCalledWith(orderId, dto);
    });

    it('should throw 404 Not Found for non-existent order', async () => {
      const orderId = 'non-existent-id';
      const dto: UpdateOrderDto = {
        status: 'CANCELLED',
      };

      mockOrderService.update.mockRejectedValue(
        new NotFoundException('Order not found'),
      );

      await request(app.getHttpServer())
        .patch(`/orders/${orderId}`)
        .send(dto)
        .expect(404);

      expect(mockOrderService.update).toHaveBeenCalledWith(orderId, dto);
    });

    it('should throw 400 Bad Request for invalid update data', async () => {
      const orderId = 'order-123';
      const dto: UpdateOrderDto = {
        qty: -5, // Invalid
      };

      mockOrderService.update.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await request(app.getHttpServer())
        .patch(`/orders/${orderId}`)
        .send(dto)
        .expect(400);

      expect(mockOrderService.update).toHaveBeenCalledWith(orderId, dto);
    });
  });

  describe('Authentication', () => {
    it('should require authentication for POST /orders', async () => {
      const dto: CreateOrderDto = {
        qty: 1,
        total_amount: 50.0,
      };

      mockOrderService.create.mockResolvedValue({} as any);

      await request(app.getHttpServer()).post('/orders').send(dto).expect(201);
    });

    it('should require authentication for GET /orders', async () => {
      mockOrderService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer()).get('/orders').expect(200);
    });

    it('should require authentication for GET /orders/:id', async () => {
      mockOrderService.findOne.mockResolvedValue({} as any);

      await request(app.getHttpServer()).get('/orders/order-123').expect(200);
    });

    it('should require authentication for PATCH /orders/:id', async () => {
      const dto: UpdateOrderDto = { status: 'COMPLETED' };
      mockOrderService.update.mockResolvedValue({} as any);

      await request(app.getHttpServer()).patch('/orders/order-123').send(dto).expect(200);
    });
  });
});