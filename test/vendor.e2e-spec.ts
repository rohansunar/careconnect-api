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
  describe('Vendor Profile (e2e)', () => {
    let token: string;
    let vendorId: string;

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

    describe('GET /vendors/me', () => {
      it('should return vendor profile successfully', async () => {
        const response = await request(app.getHttpServer())
          .get('/vendors/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', vendorId);
        expect(response.body).toHaveProperty('phone');
        expect(response.body).toHaveProperty('is_active');
        expect(response.body).toHaveProperty('is_available_today');
        expect(response.body).toHaveProperty('service_radius_m');
        expect(response.body).toHaveProperty('delivery_time_msg');
      });

      it('should return 401 without authentication', async () => {
        await request(app.getHttpServer()).get('/vendors/me').expect(401);
      });
    });

    describe('PUT /vendors/me', () => {
      it('should update vendor profile successfully with valid data', async () => {
        const updateDto = {
          name: 'Updated Vendor Name',
          email: 'vendor@example.com',
          address: '123 Main St',
          delivery_time_msg: '30 mins',
          service_radius_m: 5000,
        };

        const response = await request(app.getHttpServer())
          .put('/vendors/me')
          .set('Authorization', `Bearer ${token}`)
          .send(updateDto)
          .expect(200);

        expect(response.body).toHaveProperty('id', vendorId);
        expect(response.body).toHaveProperty('name', 'Updated Vendor Name');
        expect(response.body).toHaveProperty('email', 'vendor@example.com');
        expect(response.body).toHaveProperty('address', '123 Main St');
        expect(response.body).toHaveProperty('delivery_time_msg', '30 mins');
        expect(response.body).toHaveProperty('service_radius_m', 5000);
      });

      it('should return 400 for invalid data', async () => {
        const updateDto = {
          phone: 'invalid-phone',
        };

        const response = await request(app.getHttpServer())
          .put('/vendors/me')
          .set('Authorization', `Bearer ${token}`)
          .send(updateDto)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });

      it('should return 401 without authentication', async () => {
        const updateDto = {
          name: 'New Name',
        };

        await request(app.getHttpServer())
          .put('/vendors/me')
          .send(updateDto)
          .expect(401);
      });
    });

    describe('PUT /vendors/me/availability', () => {
      it('should update vendor availability successfully', async () => {
        const updateDto = {
          is_active: false,
          is_available_today: true,
        };

        const response = await request(app.getHttpServer())
          .put('/vendors/me/availability')
          .set('Authorization', `Bearer ${token}`)
          .send(updateDto)
          .expect(200);

        expect(response.body).toHaveProperty('id', vendorId);
        expect(response.body).toHaveProperty('is_active', false);
        expect(response.body).toHaveProperty('is_available_today', true);
      });

      it('should return 401 without authentication', async () => {
        const updateDto = {
          is_active: true,
        };

        await request(app.getHttpServer())
          .put('/vendors/me/availability')
          .send(updateDto)
          .expect(401);
      });
    });
  });


});
