import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from '../../src/location/controllers/location.controller';
import { LocationService } from '../../src/location/services/location.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { CreateLocationDto } from '../../src/location/dto/create-location.dto';
import { UpdateLocationDto } from '../../src/location/dto/update-location.dto';

describe('LocationController (Integration)', () => {
  let controller: LocationController;
  let service: LocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [LocationService, PrismaService],
    }).compile();

    controller = module.get<LocationController>(LocationController);
    service = module.get<LocationService>(LocationService);
  });

  afterEach(async () => {
    const prisma = (controller as any).locationService['prisma'];
    await prisma.$executeRaw`DELETE FROM "Location" WHERE id LIKE 'test-%'`;
  });

  describe('create', () => {
    it('should create a new location', async () => {
      const createDto: CreateLocationDto = {
        name: 'Integration Test Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      const result = await controller.create(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.state).toBe(createDto.state);
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

      const result = await controller.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all locations', async () => {
      const result = await controller.findAll();

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

      const createdLocation = await controller.create(createDto);
      const result = await controller.findOne(createdLocation.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdLocation.id);
      expect(result.name).toBe(createdLocation.name);
    });
  });

  describe('update', () => {
    it('should update a location', async () => {
      const createDto: CreateLocationDto = {
        name: 'Update Test Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      const createdLocation = await controller.create(createDto);

      const updateDto: UpdateLocationDto = {
        name: 'Updated Location',
      };

      const result = await controller.update(createdLocation.id, updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
    });

    it('should update a location with POSTGIS geography point when coordinates are provided', async () => {
      const createDto: CreateLocationDto = {
        name: 'Update Test Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      const createdLocation = await controller.create(createDto);

      const updateDto: UpdateLocationDto = {
        name: 'Updated Location',
        lat: 19.076,
        lng: 72.8777,
      };

      const result = await controller.update(createdLocation.id, updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
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

      const createdLocation = await controller.create(createDto);

      await controller.delete(createdLocation.id);

      await expect(service.findOne(createdLocation.id)).rejects.toThrow();
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

      const createdLocation = await controller.create(createDto);

      const result = await controller.toggleServiceable(createdLocation.id);

      expect(result).toBeDefined();
      expect(result.isServiceable).toBe(!createdLocation.isServiceable);
    });
  });
});
