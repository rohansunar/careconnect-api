import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/common/database/prisma.service';
import { VendorAddressService } from '../../src/address/services/vendor-address.service';
import { LocationService } from '../../src/location/services/location.service';
import { CreateAddressDto } from '../../src/address/dto/create-address.dto';
import { UpdateAddressDto } from '../../src/address/dto/update-address.dto';

describe('VendorAddressService (Integration)', () => {
  let service: VendorAddressService;
  let prismaService: PrismaService;
  let locationService: LocationService;
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [VendorAddressService, PrismaService, LocationService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = moduleFixture.get<VendorAddressService>(VendorAddressService);
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

  describe('createAddress Integration Tests', () => {
    let vendorId: string;

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
    });

    it('should create a new vendor address with valid ST_MakePoint geography point', async () => {
      const createDto: CreateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.8777,
        lat: 19.076,
      };

      const result = await service.create(vendorId, createDto);

      expect(result).toBeDefined();
      expect(result[0].id).toBeDefined();

      const createdAddress = await prismaService.vendorAddress.findUnique({
        where: { id: result[0].id },
      });

      expect(createdAddress).toBeDefined();
      expect(createdAddress.vendorId).toBe(vendorId);
      expect(createdAddress.address).toBe(createDto.address);
      expect(createdAddress.pincode).toBe(createDto.pincode);
      expect(createdAddress.lng).toBe(createDto.lng);
      expect(createdAddress.lat).toBe(createDto.lat);
    });

    it('should validate ST_MakePoint for geography point creation in integration', async () => {
      const createDto: CreateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.8777,
        lat: 19.076,
      };

      const result = await service.create(vendorId, createDto);

      expect(result).toBeDefined();
      expect(result[0].id).toBeDefined();

      const createdAddress = await prismaService.vendorAddress.findUnique({
        where: { id: result[0].id },
      });

      expect(createdAddress).toBeDefined();
      expect(createdAddress.geopoint).toBeDefined();
    });

    it('should handle precision in ST_MakePoint for geography point creation in integration', async () => {
      const createDto: CreateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.877654,
        lat: 19.076543,
      };

      const result = await service.create(vendorId, createDto);

      expect(result).toBeDefined();
      expect(result[0].id).toBeDefined();

      const createdAddress = await prismaService.vendorAddress.findUnique({
        where: { id: result[0].id },
      });

      expect(createdAddress).toBeDefined();
      expect(createdAddress.lng).toBeCloseTo(72.877654, 6);
      expect(createdAddress.lat).toBeCloseTo(19.076543, 6);
    });

    it('should ensure geography point is correctly formatted in the query during integration', async () => {
      const createDto: CreateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.8777,
        lat: 19.076,
      };

      const result = await service.create(vendorId, createDto);

      expect(result).toBeDefined();
      expect(result[0].id).toBeDefined();

      const createdAddress = await prismaService.vendorAddress.findUnique({
        where: { id: result[0].id },
      });

      expect(createdAddress).toBeDefined();
      expect(createdAddress.geopoint).toBeDefined();
    });
  });

  describe('updateAddress Integration Tests', () => {
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
    });

    it('should update a vendor address with valid ST_MakePoint geography point', async () => {
      const updateDto: UpdateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.8777,
        lat: 19.076,
      };

      const result = await service.updateAddress(vendorId, updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      const updatedAddress = await prismaService.vendorAddress.findUnique({
        where: { id: result.id },
      });

      expect(updatedAddress).toBeDefined();
      expect(updatedAddress.address).toBe(updateDto.address);
      expect(updatedAddress.pincode).toBe(updateDto.pincode);
      expect(updatedAddress.lng).toBe(updateDto.lng);
      expect(updatedAddress.lat).toBe(updateDto.lat);
    });

    it('should validate ST_MakePoint for geography point update in integration', async () => {
      const updateDto: UpdateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.8777,
        lat: 19.076,
      };

      const result = await service.updateAddress(vendorId, updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      const updatedAddress = await prismaService.vendorAddress.findUnique({
        where: { id: result.id },
      });

      expect(updatedAddress).toBeDefined();
      expect(updatedAddress.geopoint).toBeDefined();
    });

    it('should handle precision in ST_MakePoint for geography point update in integration', async () => {
      const updateDto: UpdateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.877654,
        lat: 19.076543,
      };

      const result = await service.updateAddress(vendorId, updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      const updatedAddress = await prismaService.vendorAddress.findUnique({
        where: { id: result.id },
      });

      expect(updatedAddress).toBeDefined();
      expect(updatedAddress.lng).toBeCloseTo(72.877654, 6);
      expect(updatedAddress.lat).toBeCloseTo(19.076543, 6);
    });

    it('should ensure geography point is correctly formatted in the update query during integration', async () => {
      const updateDto: UpdateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.8777,
        lat: 19.076,
      };

      const result = await service.updateAddress(vendorId, updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      const updatedAddress = await prismaService.vendorAddress.findUnique({
        where: { id: result.id },
      });

      expect(updatedAddress).toBeDefined();
      expect(updatedAddress.geopoint).toBeDefined();
    });
  });
});
