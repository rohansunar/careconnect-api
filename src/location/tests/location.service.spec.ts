import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from '../services/location.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateLocationDto } from '../dto/create-location.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('LocationService', () => {
  let service: LocationService;
  let prisma: PrismaService;

  const mockLocationData = {
    id: 'test-location-id',
    name: 'Test Location',
    state: 'Test State',
    country: 'India',
    isServiceable: true,
    serviceRadiusKm: 50,
    geopoint: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockPrismaService = {
    location: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    customerAddress: {
      count: jest.fn(),
    },
    vendorAddress: {
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new location with POSTGIS geography point', async () => {
      const createDto: CreateLocationDto = {
        name: 'New Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          ...mockLocationData,
          id: 'new-location-id',
          name: createDto.name,
          state: createDto.state,
        },
      ]);

      const result = await service.create(createDto);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('ST_MakePoint'),
      );
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('::geography'),
      );
      expect(result).toEqual({
        ...mockLocationData,
        id: 'new-location-id',
        name: createDto.name,
        state: createDto.state,
      });
    });

    it('should validate ST_MakePoint parameters for geography point creation', async () => {
      const createDto: CreateLocationDto = {
        name: 'New Location',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          ...mockLocationData,
          id: 'new-location-id',
        },
      ]);

      await service.create(createDto);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('ST_MakePoint(72.8777, 19.076)::geography'),
      );
    });

    it('should handle precision in ST_MakePoint for geography point creation', async () => {
      const createDto: CreateLocationDto = {
        name: 'New Location',
        state: 'Maharashtra',
        lat: 19.076543,
        lng: 72.877654,
        isServiceable: true,
        serviceRadiusKm: 50,
      };

      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          ...mockLocationData,
          id: 'new-location-id',
        },
      ]);

      await service.create(createDto);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining(
          'ST_MakePoint(72.877654, 19.076543)::geography',
        ),
      );
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
      mockPrismaService.location.findMany.mockResolvedValue([mockLocationData]);

      const result = await service.findAll();

      expect(mockPrismaService.location.findMany).toHaveBeenCalled();
      expect(result).toEqual([mockLocationData]);
    });
  });

  describe('findOne', () => {
    it('should return a location by ID', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue(mockLocationData);

      const result = await service.findOne('test-location-id');

      expect(mockPrismaService.location.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-location-id' },
      });
      expect(result).toEqual(mockLocationData);
    });

    it('should throw NotFoundException if location does not exist', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a location with POSTGIS geography point when coordinates are provided', async () => {
      const updateDto: UpdateLocationDto = {
        name: 'Updated Location',
        lat: 19.076,
        lng: 72.8777,
      };

      const updatedLocation = {
        ...mockLocationData,
        name: updateDto.name,
      };

      mockPrismaService.location.findUnique.mockResolvedValue(mockLocationData);
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([updatedLocation]);

      const result = await service.update('test-location-id', updateDto);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ST_MakePoint'),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(result).toEqual(updatedLocation);
    });

    it('should update a location without POSTGIS when coordinates are not provided', async () => {
      const updateDto: UpdateLocationDto = {
        name: 'Updated Location',
      };

      const updatedLocation = {
        ...mockLocationData,
        name: updateDto.name,
      };

      mockPrismaService.location.findUnique.mockResolvedValue(mockLocationData);
      mockPrismaService.location.update.mockResolvedValue(updatedLocation);

      const result = await service.update('test-location-id', updateDto);

      expect(mockPrismaService.location.update).toHaveBeenCalledWith({
        where: { id: 'test-location-id' },
        data: { name: updateDto.name },
      });
      expect(result).toEqual(updatedLocation);
    });

    it('should throw NotFoundException if location to update does not exist', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { name: 'Updated Location' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid update data', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue(mockLocationData);
      mockPrismaService.$queryRawUnsafe.mockRejectedValue(
        new Error('Invalid data'),
      );

      await expect(
        service.update('test-location-id', {
          name: 'Updated Location',
          lat: 'invalid',
          lng: 'invalid',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a location', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue(mockLocationData);
      mockPrismaService.customerAddress.count.mockResolvedValue(0);
      mockPrismaService.vendorAddress.count.mockResolvedValue(0);
      mockPrismaService.location.delete.mockResolvedValue(mockLocationData);

      await service.delete('test-location-id');

      expect(mockPrismaService.location.delete).toHaveBeenCalledWith({
        where: { id: 'test-location-id' },
      });
    });

    it('should throw BadRequestException if location has associated addresses', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue(mockLocationData);
      mockPrismaService.customerAddress.count.mockResolvedValue(1);

      await expect(service.delete('test-location-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if location to delete does not exist', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleServiceable', () => {
    it('should toggle the isServiceable field of a location', async () => {
      const updatedLocation = {
        ...mockLocationData,
        isServiceable: !mockLocationData.isServiceable,
      };

      mockPrismaService.location.findUnique.mockResolvedValue(mockLocationData);
      mockPrismaService.location.update.mockResolvedValue(updatedLocation);

      const result = await service.toggleServiceable('test-location-id');

      expect(mockPrismaService.location.update).toHaveBeenCalledWith({
        where: { id: 'test-location-id' },
        data: { isServiceable: !mockLocationData.isServiceable },
      });
      expect(result).toEqual(updatedLocation);
    });

    it('should throw NotFoundException if location does not exist', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleServiceable('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
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

      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          id: 'found-location-id',
          isServiceable: true,
        },
      ]);

      const result = await service.findOrCreateLocation(locationData);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('ST_Distance'),
      );
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('ST_DWithin'),
      );
      expect(result).toEqual({
        id: 'found-location-id',
        isServiceable: true,
      });
    });

    it('should validate ST_Distance and ST_DWithin POSTGIS functions', async () => {
      const locationData = {
        lat: 19.076,
        lng: 72.8777,
        city: 'Mumbai',
        state: 'Maharashtra',
      };

      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          id: 'found-location-id',
          isServiceable: true,
        },
      ]);

      await service.findOrCreateLocation(locationData);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('ST_Distance(l."geopoint", ST_MakePoint'),
      );
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('ST_DWithin(l."geopoint", ST_MakePoint'),
      );
    });

    it('should handle precision in ST_Distance and ST_DWithin calculations', async () => {
      const locationData = {
        lat: 19.076543,
        lng: 72.877654,
        city: 'Mumbai',
        state: 'Maharashtra',
      };

      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          id: 'found-location-id',
          isServiceable: true,
        },
      ]);

      await service.findOrCreateLocation(locationData);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('ST_MakePoint(72.877654, 19.076543)'),
      );
    });

    it('should throw BadRequestException for invalid location data in findOrCreateLocation', async () => {
      const invalidData = {
        lat: 'invalid',
        lng: 'invalid',
      };

      await expect(
        service.findOrCreateLocation(invalidData as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
