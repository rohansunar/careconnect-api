import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AddressModule } from '../../src/address/address.module';
import { PrismaService } from '../../src/common/database/prisma.service';
import { VendorAddressService } from '../../src/address/services/vendor-address.service';
import { LocationService } from '../../src/location/services/location.service';
import { CreateAddressDto } from '../../src/address/dto/create-address.dto';
import { UpdateAddressDto } from '../../src/address/dto/update-address.dto';
import { VendorService } from '../../src/vendor/services/vendor.service';

describe('VendorAddressController (Integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let locationService: LocationService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AddressModule],
    }).compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    locationService = moduleFixture.get<LocationService>(LocationService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prismaService.vendorAddress.deleteMany({});
    await prismaService.vendor.deleteMany({});
    await prismaService.location.deleteMany({});
  });

  describe('Vendor Address Integration Tests', () => {
    let vendorId: string;
    let locationId: string;

    beforeEach(async () => {
      const vendor = await prismaService.vendor.create({
        data: {
          id: 'vendor-id',
          name: 'Test Vendor',
          email: 'vendor@example.com',
          phone: '1234567890',
          is_active: true,
          vendorNo: 'VENDOR001',
        },
      });
      vendorId = vendor.id;

      const location = await prismaService.location.create({
        data: {
          name: 'Mumbai',
          state: 'Maharashtra',
          geopoint: 'POINT(72.8777 19.076)',
        },
      });
      locationId = location.id;
      console.log('Location created with id:', locationId);
    });

    describe('POST /vendor/addresses', () => {
      it('should create a new vendor address', async () => {
        const createDto: CreateAddressDto = {
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          address: '123 Main Street',
          lng: 72.8777,
          lat: 19.076,
        };

        const response = await request
          .default(app.getHttpServer())
          .post('/vendor/addresses')
          .set('Authorization', 'Bearer test-token')
          .send(createDto)
          .expect(201);

        expect(response.body).toHaveProperty('id');
      });

      it('should throw BadRequestException if required fields are missing', async () => {
        const invalidDto = {
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          address: '123 Main Street',
        };

        await request
          .default(app.getHttpServer())
          .post('/vendor/addresses')
          .set('Authorization', 'Bearer test-token')
          .send(invalidDto)
          .expect(400);
      });
    });

    describe('GET /vendor/addresses', () => {
      it('should return the vendor address', async () => {
        await prismaService.vendorAddress.create({
          data: {
            vendorId,
            locationId,
            lng: 72.8777,
            lat: 19.076,
            pincode: '400001',
            address: '123 Main Street',
          },
        });

        const response = await request
          .default(app.getHttpServer())
          .get('/vendor/addresses')
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body.vendorId).toBe(vendorId);
        expect(response.body.location.name).toBe('Mumbai');
        expect(response.body.location.state).toBe('Maharashtra');
        expect(response.body.pincode).toBe('400001');
        expect(response.body.address).toBe('123 Main Street');
        expect(response.body.lng).toBe(72.8777);
        expect(response.body.lat).toBe(19.076);
      });

      it('should throw NotFoundException if address does not exist', async () => {
        await request
          .default(app.getHttpServer())
          .get('/vendor/addresses')
          .set('Authorization', 'Bearer test-token')
          .expect(404);
      });
    });

    describe('PUT /vendor/addresses', () => {
      it('should update the vendor address', async () => {
        await prismaService.vendorAddress.create({
          data: {
            vendorId,
            locationId,
            lng: 72.8777,
            lat: 19.076,
            pincode: '400001',
            address: '123 Main Street',
          },
        });

        const updateDto: UpdateAddressDto = {
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          address: '456 Business Avenue',
          lng: 72.8777,
          lat: 19.076,
        };

        const response = await request
          .default(app.getHttpServer())
          .put('/vendor/addresses')
          .set('Authorization', 'Bearer test-token')
          .send(updateDto)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body.vendorId).toBe(vendorId);
        expect(response.body.address).toBe(updateDto.address);
        expect(response.body.location.name).toBe('Mumbai');
        expect(response.body.location.state).toBe('Maharashtra');
      });

      it('should throw NotFoundException if address does not exist', async () => {
        const updateDto: UpdateAddressDto = {
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          address: '456 Business Avenue',
          lng: 72.8777,
          lat: 19.076,
        };

        await request
          .default(app.getHttpServer())
          .put('/vendor/addresses')
          .set('Authorization', 'Bearer test-token')
          .send(updateDto)
          .expect(404);
      });
    });

    describe('DELETE /vendor/addresses', () => {
      it('should delete the vendor address', async () => {
        await prismaService.vendorAddress.create({
          data: {
            vendorId,
            locationId,
            lng: 72.8777,
            lat: 19.076,
            pincode: '400001',
            address: '123 Main Street',
          },
        });

        await request
          .default(app.getHttpServer())
          .delete('/vendor/addresses')
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        const deletedAddress = await prismaService.vendorAddress.findUnique({
          where: { vendorId },
        });
        expect(deletedAddress).toBeNull();
      });

      it('should throw NotFoundException if address does not exist', async () => {
        await request
          .default(app.getHttpServer())
          .delete('/vendor/addresses')
          .set('Authorization', 'Bearer test-token')
          .expect(404);
      });
    });
  });
});
