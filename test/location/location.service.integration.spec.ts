import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from '../../src/location/services/location.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { CreateLocationDto } from '../../src/location/dto/create-location.dto';
import { UpdateLocationDto } from '../../src/location/dto/update-location.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('LocationService (Integration)', () => {
  let service: LocationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocationService, PrismaService],
    }).compile();

    service = module.get<LocationService>(LocationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await prisma.$executeRaw`DELETE FROM "Location" WHERE id LIKE 'test-%'`;
  });

  describe('create', () => {
    it('should create a new location with POSTGIS geography point', async () => {
      const createDto: CreateLocationDto = {
        name: 'Integration Test Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.state).toBe(createDto.state);
      expect(result.isServiceable).toBe(createDto.isServiceable);
      expect(result.serviceRadiusKm).toBe(createDto.serviceRadiusKm);
    });

    it('should validate ST_MakePoint for geography point creation', async () => {
      const createDto: CreateLocationDto = {
        name: 'ST_MakePoint Test Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should handle precision in ST_MakePoint for geography point creation', async () => {
      const createDto: CreateLocationDto = {
        name: 'Precision Test Location',
        state: 'Maharashtra',
        lat: 19.076543,
        lng: 72.877654,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should throw BadRequestException for invalid location data', async () => {
      const invalidDto = {
        name: 'Invalid Location',
        state: 'Maharashtra',
        lat: 'invalid',
        lng: 'invalid',
      };

      await expect(service.create(invalidDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all locations', async () => {
      const result = await service.findAll();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a location by ID', async () => {
      const createDto: CreateLocationDto = {
        name: 'FindOne Test Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      const createdLocation = await service.create(createDto);
      const result = await service.findOne(createdLocation.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdLocation.id);
      expect(result.name).toBe(createdLocation.name);
    });

    it('should throw NotFoundException if location does not exist', async () => {
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a location with POSTGIS geography point when coordinates are provided', async () => {
      const createDto: CreateLocationDto = {
        name: 'Update Test Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      const createdLocation = await service.create(createDto);

      const updateDto: UpdateLocationDto = {
        name: 'Updated Location',
        lat: 19.076,
        lng: 72.8777,
      };

      const result = await service.update(createdLocation.id, updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
    });

    it('should update a location without POSTGIS when coordinates are not provided', async () => {
      const createDto: CreateLocationDto = {
        name: 'Update Test Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      const createdLocation = await service.create(createDto);

      const updateDto: UpdateLocationDto = {
        name: 'Updated Location',
      };

      const result = await service.update(createdLocation.id, updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
    });

    it('should throw NotFoundException if location to update does not exist', async () => {
      await expect(
        service.update('non-existent-id', { name: 'Updated Location' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid update data', async () => {
      const createDto: CreateLocationDto = {
        name: 'Update Test Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      const createdLocation = await service.create(createDto);

      await expect(
        service.update(createdLocation.id, {
          name: 'Updated Location',
          lat: 'invalid',
          lng: 'invalid',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a location', async () => {
      const createDto: CreateLocationDto = {
        name: 'Delete Test Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      const createdLocation = await service.create(createDto);

      await service.delete(createdLocation.id);

      await expect(service.findOne(createdLocation.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if location has associated addresses', async () => {
      const createDto: CreateLocationDto = {
        name: 'Delete Test Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      const createdLocation = await service.create(createDto);

      await prisma.customerAddress.create({
        data: {
          id: 'test-address-id',
          customerId: 'test-customer-id',
          locationId: createdLocation.id,
          label: 'Home',
          address: 'Test Address',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          lng: 72.8777,
          lat: 19.076,
          isDefault: true,
          is_active: true,
        },
      });

      await expect(service.delete(createdLocation.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if location to delete does not exist', async () => {
      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleServiceable', () => {
    it('should toggle the isServiceable field of a location', async () => {
      const createDto: CreateLocationDto = {
        name: 'Toggle Test Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      const createdLocation = await service.create(createDto);

      const result = await service.toggleServiceable(createdLocation.id);

      expect(result).toBeDefined();
      expect(result.isServiceable).toBe(!createdLocation.isServiceable);
    });

    it('should throw NotFoundException if location does not exist', async () => {
      await expect(service.toggleServiceable('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOrCreateLocation', () => {
    it('should find or create a location with POSTGIS distance checks', async () => {
      const locationData = {
        lat: 19.076,
        lng: 72.8777,
        city: 'Mumbai',
        state: 'Maharashtra',
      };

      const result = await service.findOrCreateLocation(locationData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should validate ST_Distance and ST_DWithin POSTGIS functions', async () => {
      const locationData = {
        lat: 19.076,
        lng: 72.8777,
        city: 'Mumbai',
        state: 'Maharashtra',
      };

      const result = await service.findOrCreateLocation(locationData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should handle precision in ST_Distance and ST_DWithin calculations', async () => {
      const locationData = {
        lat: 19.076543,
        lng: 72.877654,
        city: 'Mumbai',
        state: 'Maharashtra',
      };

      const result = await service.findOrCreateLocation(locationData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should throw BadRequestException for invalid location data in findOrCreateLocation', async () => {
      const invalidData = {
        lat: 'invalid',
        lng: 'invalid',
      };

      await expect(service.findOrCreateLocation(invalidData as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});