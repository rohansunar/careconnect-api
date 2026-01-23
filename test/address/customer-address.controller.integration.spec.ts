import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AddressModule } from '../../src/address/address.module';
import { PrismaService } from '../../src/common/database/prisma.service';
import { CustomerAddressService } from '../../src/address/services/customer-address.service';
import { LocationService } from '../../src/location/services/location.service';
import { CreateCustomerAddressDto } from '../../src/address/dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from '../../src/address/dto/update-customer-address.dto';
import { AddressLabel } from '../../src/address/dto/create-customer-address.dto';
import { VendorService } from '../../src/vendor/services/vendor.service';

describe('CustomerAddressController (Integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AddressModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prismaService.customerAddress.deleteMany({});
    await prismaService.customer.deleteMany({});
    await prismaService.location.deleteMany({});
  });

  describe('Customer Address Integration Tests', () => {
    let customerId: string;
    let locationId: string;

    beforeEach(async () => {
      const customer = await prismaService.customer.create({
        data: {
          id: 'customer-id',
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '1234567890',
          is_active: true,
        },
      });
      customerId = customer.id;

      const location = await prismaService.location.create({
        data: {
          lat: 19.076,
          lng: 72.8777,
          name: 'Mumbai',
          state: 'Maharashtra',
        },
      });
      locationId = location.id;
    });

    describe('POST /customer/addresses', () => {
      it('should create a new customer address', async () => {
        const createDto: CreateCustomerAddressDto = {
          label: AddressLabel.Home,
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          address: '123 Main Street',
          lng: 72.8777,
          lat: 19.076,
        };

        const response = await request
          .default(app.getHttpServer())
          .post('/customer/addresses')
          .set('Authorization', 'Bearer test-token')
          .send(createDto)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.customerId).toBe(customerId);
        expect(response.body.label).toBe(createDto.label);
        expect(response.body.address).toBe(createDto.address);
        expect(response.body.city).toBe(createDto.city);
        expect(response.body.state).toBe(createDto.state);
        expect(response.body.pincode).toBe(createDto.pincode);
        expect(response.body.lng).toBe(createDto.lng);
        expect(response.body.lat).toBe(createDto.lat);
        expect(response.body.isDefault).toBe(true);
      });

      it('should throw BadRequestException if required fields are missing', async () => {
        const invalidDto = {
          label: AddressLabel.Home,
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          address: '123 Main Street',
        };

        await request
          .default(app.getHttpServer())
          .post('/customer/addresses')
          .set('Authorization', 'Bearer test-token')
          .send(invalidDto)
          .expect(400);
      });
    });

    describe('GET /customer/addresses', () => {
      it('should return all customer addresses', async () => {
        await prismaService.customerAddress.create({
          data: {
            customerId,
            label: AddressLabel.Home,
            address: '123 Main Street',
            locationId,
            pincode: '400001',
            lng: 72.8777,
            lat: 19.076,
            isDefault: true,
          },
        });

        const response = await request
          .default(app.getHttpServer())
          .get('/customer/addresses')
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].customerId).toBe(customerId);
        expect(response.body[0].label).toBe(AddressLabel.Home);
      });

      it('should throw NotFoundException if customer does not exist', async () => {
        await request
          .default(app.getHttpServer())
          .get('/customer/addresses')
          .set('Authorization', 'Bearer test-token')
          .expect(404);
      });
    });

    describe('GET /customer/addresses/:id', () => {
      it('should return a single customer address', async () => {
        const address = await prismaService.customerAddress.create({
          data: {
            customerId,
            label: AddressLabel.Home,
            address: '123 Main Street',
            locationId,
            pincode: '400001',
            lng: 72.8777,
            lat: 19.076,
            isDefault: true,
          },
        });

        const response = await request
          .default(app.getHttpServer())
          .get(`/customer/addresses/${address.id}`)
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(response.body.id).toBe(address.id);
        expect(response.body.customerId).toBe(customerId);
        expect(response.body.label).toBe(AddressLabel.Home);
      });

      it('should throw NotFoundException if address does not exist', async () => {
        await request
          .default(app.getHttpServer())
          .get('/customer/addresses/non-existent-address-id')
          .set('Authorization', 'Bearer test-token')
          .expect(404);
      });
    });

    describe('PUT /customer/addresses/:id', () => {
      it('should update a customer address', async () => {
        const address = await prismaService.customerAddress.create({
          data: {
            customerId,
            label: AddressLabel.Home,
            address: '123 Main Street',
            locationId,
            pincode: '400001',
            lng: 72.8777,
            lat: 19.076,
            isDefault: true,
          },
        });

        const updateDto: UpdateCustomerAddressDto = {
          label: AddressLabel.Office,
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          address: '456 Business Avenue',
          lng: 72.8777,
          lat: 19.076,
        };

        const response = await request
          .default(app.getHttpServer())
          .put(`/customer/addresses/${address.id}`)
          .set('Authorization', 'Bearer test-token')
          .send(updateDto)
          .expect(200);

        expect(response.body.id).toBe(address.id);
        expect(response.body.label).toBe(updateDto.label);
        expect(response.body.address).toBe(updateDto.address);
      });

      it('should throw NotFoundException if address does not exist', async () => {
        const updateDto: UpdateCustomerAddressDto = {
          label: AddressLabel.Office,
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          address: '456 Business Avenue',
          lng: 72.8777,
          lat: 19.076,
        };

        await request
          .default(app.getHttpServer())
          .put('/customer/addresses/non-existent-address-id')
          .set('Authorization', 'Bearer test-token')
          .send(updateDto)
          .expect(404);
      });
    });

    describe('DELETE /customer/addresses/:id', () => {
      it('should delete a customer address', async () => {
        const address = await prismaService.customerAddress.create({
          data: {
            customerId,
            label: AddressLabel.Home,
            address: '123 Main Street',
            locationId,
            pincode: '400001',
            lng: 72.8777,
            lat: 19.076,
            isDefault: true,
          },
        });

        await request
          .default(app.getHttpServer())
          .delete(`/customer/addresses/${address.id}`)
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        const deletedAddress = await prismaService.customerAddress.findUnique({
          where: { id: address.id },
        });
        expect(deletedAddress.isActive).toBe(false);
      });

      it('should throw NotFoundException if address does not exist', async () => {
        await request
          .default(app.getHttpServer())
          .delete('/customer/addresses/non-existent-address-id')
          .set('Authorization', 'Bearer test-token')
          .expect(404);
      });
    });

    describe('PUT /customer/addresses/:id/set-default', () => {
      it('should set a customer address as default', async () => {
        const address = await prismaService.customerAddress.create({
          data: {
            customerId,
            label: AddressLabel.Home,
            address: '123 Main Street',
            locationId,
            pincode: '400001',
            lng: 72.8777,
            lat: 19.076,
            isDefault: false,
          },
        });

        const response = await request
          .default(app.getHttpServer())
          .put(`/customer/addresses/${address.id}/set-default`)
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(response.body.id).toBe(address.id);
        expect(response.body.isDefault).toBe(true);

        const otherAddresses = await prismaService.customerAddress.findMany({
          where: { customerId, id: { not: address.id } },
        });
        otherAddresses.forEach((addr: any) => {
          expect(addr.isDefault).toBe(false);
        });
      });

      it('should throw NotFoundException if address does not exist', async () => {
        await request
          .default(app.getHttpServer())
          .put('/customer/addresses/non-existent-address-id/set-default')
          .set('Authorization', 'Bearer test-token')
          .expect(404);
      });
    });
  });
});
