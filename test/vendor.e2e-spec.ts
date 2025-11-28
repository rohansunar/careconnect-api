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

  describe('POST /vendor/request-otp', () => {
    it('should request OTP successfully and return 201 with message', async () => {
      const phone = '1234567890';

      const response = await request(app.getHttpServer())
        .post('/vendor/request-otp')
        .send({ phone })
        .expect(201);

      expect(response.body).toEqual({
        message: 'OTP sent successfully',
      });
    });
  });

  describe('POST /vendor/verify-otp', () => {
    it('should verify OTP and create vendor successfully, return 201 with message and vendor data', async () => {
      const phone = '1234567890';
      const code = '123456'; // Development mode OTP
      const name = 'Test Vendor';
      const email = 'test@example.com';
      const address = 'Test Address';

      // First request OTP
      await request(app.getHttpServer())
        .post('/vendor/request-otp')
        .send({ phone })
        .expect(201);

      // Then verify OTP and create vendor
      const response = await request(app.getHttpServer())
        .post('/vendor/verify-otp')
        .send({ phone, code, name, email, address })
        .expect(201);

      expect(response.body).toHaveProperty(
        'message',
        'Vendor created successfully',
      );
      expect(response.body).toHaveProperty('vendor');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.vendor).toMatchObject({
        phone,
        name,
        email,
        address,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.vendor).toHaveProperty('id');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.vendor).toHaveProperty('created_at');
    });

    it('should return 401 for invalid OTP', async () => {
      const phone = '1234567890';
      const code = '999999'; // Invalid OTP
      const name = 'Test Vendor';
      const email = 'test@example.com';
      const address = 'Test Address';

      // First request OTP
      await request(app.getHttpServer())
        .post('/vendor/request-otp')
        .send({ phone })
        .expect(201);

      // Then try to verify with invalid OTP
      const response = await request(app.getHttpServer())
        .post('/vendor/verify-otp')
        .send({ phone, code, name, email, address })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for duplicate phone number', async () => {
      const phone = '1234567890';
      const code = '123456'; // Development mode OTP
      const name = 'Test Vendor';
      const email = 'test@example.com';
      const address = 'Test Address';

      // First request OTP
      await request(app.getHttpServer())
        .post('/vendor/request-otp')
        .send({ phone })
        .expect(201);

      // Create first vendor
      await request(app.getHttpServer())
        .post('/vendor/verify-otp')
        .send({ phone, code, name, email, address })
        .expect(201);

      // Request OTP again for same phone
      await request(app.getHttpServer())
        .post('/vendor/request-otp')
        .send({ phone })
        .expect(201);

      // Try to create another vendor with same phone
      const response = await request(app.getHttpServer())
        .post('/vendor/verify-otp')
        .send({
          phone,
          code,
          name: 'Another Vendor',
          email: 'another@example.com',
          address,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty(
        'message',
        'Vendor with this phone number already exists',
      );
    });
  });
});
