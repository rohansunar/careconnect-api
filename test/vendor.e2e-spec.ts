import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app/app.module';
import { PrismaService } from '../src/common/database/prisma.service';

describe('VendorController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Set development mode for predictable OTP
    process.env.NODE_ENV = 'development';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    delete process.env.NODE_ENV;
  });

  afterEach(async () => {
    // Clean up database after each test
    await prisma.vendor.deleteMany();
    await prisma.otpCode.deleteMany();
  });

  describe('POST /vendors/auth/request-otp', () => {
    it('should request OTP successfully and return 200 with message', async () => {
      const phone = '1234567890';

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/request-otp')
        .send({ phone })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 30,
      });
    });
  });

  describe('POST /vendors/auth/verify-otp', () => {
    it('should verify OTP and create vendor successfully, return 200 with token and vendor data', async () => {
      const phone = '1234567890';
      const code = '123456'; // Development mode OTP

      // First request OTP
      await request(app.getHttpServer())
        .post('/vendors/auth/request-otp')
        .send({ phone })
        .expect(200);

      // Then verify OTP and create vendor
      const response = await request(app.getHttpServer())
        .post('/vendors/auth/verify-otp')
        .send({ phone, code })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('vendor');
      expect(response.body).toHaveProperty('expiresIn');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.vendor).toMatchObject({
        phone,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.vendor).toHaveProperty('id');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.vendor).toHaveProperty('created_at');
    });

    it('should return 401 for invalid OTP', async () => {
      const phone = '1234567890';
      const code = '999999'; // Invalid OTP

      // First request OTP
      await request(app.getHttpServer())
        .post('/vendors/auth/request-otp')
        .send({ phone })
        .expect(200);

      // Then try to verify with invalid OTP
      const response = await request(app.getHttpServer())
        .post('/vendors/auth/verify-otp')
        .send({ phone, code })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('should update existing vendor for same phone', async () => {
      const phone = '1234567890';
      const code = '123456'; // Development mode OTP

      // First request OTP
      await request(app.getHttpServer())
        .post('/vendors/auth/request-otp')
        .send({ phone })
        .expect(200);

      // Create first vendor
      await request(app.getHttpServer())
        .post('/vendors/auth/verify-otp')
        .send({ phone, code })
        .expect(200);

      // Request OTP again for same phone
      await request(app.getHttpServer())
        .post('/vendors/auth/request-otp')
        .send({ phone })
        .expect(200);

      // Verify again - should update existing
      const response = await request(app.getHttpServer())
        .post('/vendors/auth/verify-otp')
        .send({ phone, code })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('vendor');
    });
  });

  describe('Vendor Products (e2e)', () => {
    let token: string;
    let vendorId: string;
    let productId: string;

    beforeAll(async () => {
      // Create a test product
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          description: 'Test Description',
          image_url: 'test.jpg',
        },
      });
      productId = product.id;
    });

    afterAll(async () => {
      // Clean up
      await prisma.vendorProduct.deleteMany();
      await prisma.product.deleteMany();
    });

    beforeEach(async () => {
      // Create vendor and get token
      const phone = '1234567890';
      const code = '123456';

      await request(app.getHttpServer())
        .post('/vendors/auth/request-otp')
        .send({ phone })
        .expect(200);

      const verifyResponse = await request(app.getHttpServer())
        .post('/vendors/auth/verify-otp')
        .send({ phone, code })
        .expect(200);

      token = verifyResponse.body.token;
      vendorId = verifyResponse.body.vendor.id;
    });

    afterEach(async () => {
      await prisma.vendorProduct.deleteMany();
      await prisma.vendor.deleteMany();
      await prisma.otpCode.deleteMany();
    });

    describe('GET /vendors/products', () => {
      it('should return vendor products successfully', async () => {
        const response = await request(app.getHttpServer())
          .get(`/vendors/products`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should return 401 without authentication', async () => {
        await request(app.getHttpServer()).get(`/vendors/products`).expect(401);
      });
    });

    describe('POST /vendors/products', () => {
      it('should create vendor product successfully', async () => {
        const createDto = {
          product_id: productId,
          price: 100,
          deposit: 10,
        };

        const response = await request(app.getHttpServer())
          .post(`/vendors/products`)
          .set('Authorization', `Bearer ${token}`)
          .send(createDto)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('name', 'Test Product');
        expect(response.body).toHaveProperty('price');
        expect(response.body.price).toBe('100');
        expect(response.body).toHaveProperty('deposit');
        expect(response.body.deposit).toBe('10');
      });

      it('should return 400 for invalid product id', async () => {
        const createDto = {
          product_id: 'invalid-id',
          price: 100,
        };

        await request(app.getHttpServer())
          .post(`/vendors/products`)
          .set('Authorization', `Bearer ${token}`)
          .send(createDto)
          .expect(400);
      });

      it('should return 400 for duplicate product', async () => {
        const createDto = {
          product_id: productId,
          price: 100,
        };

        // Create first
        await request(app.getHttpServer())
          .post(`/vendors/products`)
          .set('Authorization', `Bearer ${token}`)
          .send(createDto)
          .expect(201);

        // Try duplicate
        await request(app.getHttpServer())
          .post(`/vendors/products`)
          .set('Authorization', `Bearer ${token}`)
          .send(createDto)
          .expect(400);
      });

      it('should return 401 without authentication', async () => {
        const createDto = {
          product_id: productId,
          price: 100,
        };

        await request(app.getHttpServer())
          .post(`/vendors/products`)
          .send(createDto)
          .expect(401);
      });
    });

    describe('PUT /vendors/products/:vendor_product_id', () => {
      let vendorProductId: string;

      beforeEach(async () => {
        // Create a vendor product first
        const createDto = {
          product_id: productId,
          price: 100,
          deposit: 10,
        };

        const response = await request(app.getHttpServer())
          .post(`/vendors/products`)
          .set('Authorization', `Bearer ${token}`)
          .send(createDto)
          .expect(201);

        vendorProductId = response.body.id;
      });

      it('should update vendor product successfully', async () => {
        const updateDto = {
          price: 150,
          deposit: 15,
        };

        const response = await request(app.getHttpServer())
          .put(`/vendors/products/${vendorProductId}`)
          .set('Authorization', `Bearer ${token}`)
          .send(updateDto)
          .expect(200);

        expect(response.body).toHaveProperty('price');
        expect(response.body.price).toBe('150');
        expect(response.body).toHaveProperty('deposit');
        expect(response.body.deposit).toBe('15');
      });

      it('should return 404 for non-existent product', async () => {
        const updateDto = {
          price: 150,
        };

        await request(app.getHttpServer())
          .put(`/vendors/products/non-existent-id`)
          .set('Authorization', `Bearer ${token}`)
          .send(updateDto)
          .expect(404);
      });

      it('should return 401 without authentication', async () => {
        const updateDto = {
          price: 150,
        };

        await request(app.getHttpServer())
          .put(`/vendors/products/${vendorProductId}`)
          .send(updateDto)
          .expect(401);
      });
    });

    describe('DELETE /vendors/products/:vendor_product_id', () => {
      let vendorProductId: string;

      beforeEach(async () => {
        // Create a vendor product first
        const createDto = {
          product_id: productId,
          price: 100,
          deposit: 10,
        };

        const response = await request(app.getHttpServer())
          .post(`/vendors/products`)
          .set('Authorization', `Bearer ${token}`)
          .send(createDto)
          .expect(201);

        vendorProductId = response.body.id;
      });

      it('should delete vendor product successfully', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/vendors/products/${vendorProductId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body).toHaveProperty(
          'message',
          'Vendor product deactivated',
        );
      });

      it('should return 404 for non-existent product', async () => {
        await request(app.getHttpServer())
          .delete(`/vendors/products/non-existent-id`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });

      it('should return 401 without authentication', async () => {
        await request(app.getHttpServer())
          .delete(`/vendors/products/${vendorProductId}`)
          .expect(401);
      });
    });
  });
});
