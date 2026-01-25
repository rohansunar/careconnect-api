import { Test, TestingModule } from '@nestjs/testing';
import { VendorAddressService } from '../../src/address/services/vendor-address.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { LocationService } from '../../src/location/services/location.service';
import { CreateAddressDto } from '../../src/address/dto/create-address.dto';
import { UpdateAddressDto } from '../../src/address/dto/update-address.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VendorAddressService', () => {
  let service: VendorAddressService;
  let prismaService: PrismaService;
  let locationService: LocationService;

  const mockPrismaService = {
    vendorAddress: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vendor: {
      findFirst: jest.fn().mockResolvedValue({ id: 'vendor-id' }),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'new-address-id' }]),
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    $transaction: jest.fn().mockImplementation(async (fn) => {
      return await fn(mockPrismaService);
    }),
  };

  const mockLocationService = {
    findOrCreateLocation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorAddressService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LocationService,
          useValue: mockLocationService,
        },
      ],
    }).compile();

    service = module.get<VendorAddressService>(VendorAddressService);
    prismaService = module.get<PrismaService>(PrismaService);
    locationService = module.get<LocationService>(LocationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new vendor address', async () => {
      const vendorId = 'vendor-id';
      const createDto: CreateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.8777,
        lat: 19.076,
      };
      const mockLocation = { id: 'location-id' };

      mockLocationService.findOrCreateLocation.mockResolvedValue({
        id: mockLocation.id,
        isServiceable: true,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([{ id: 'new-address-id' }]);

      const result = await service.create(vendorId, createDto);

      expect(locationService.findOrCreateLocation).toHaveBeenCalledWith({
        lat: createDto.lat!,
        lng: createDto.lng!,
        city: createDto.city,
        state: createDto.state,
      });
      expect(result).toEqual([{ id: 'new-address-id' }]);
    });

    it('should validate ST_MakePoint for geography point creation', async () => {
      const vendorId = 'vendor-id';
      const createDto: CreateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.8777,
        lat: 19.076,
      };
      const mockLocation = { id: 'location-id' };

      mockLocationService.findOrCreateLocation.mockResolvedValue({
        id: mockLocation.id,
        isServiceable: true,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([{ id: 'new-address-id' }]);

      const result = await service.create(vendorId, createDto);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('ST_MakePoint'),
      );
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('ST_MakePoint(72.8777, 19.076)::geography'),
      );
      expect(result).toEqual([{ id: 'new-address-id' }]);
    });

    it('should handle precision in ST_MakePoint for geography point creation', async () => {
      const vendorId = 'vendor-id';
      const createDto: CreateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.877654,
        lat: 19.076543,
      };
      const mockLocation = { id: 'location-id' };

      mockLocationService.findOrCreateLocation.mockResolvedValue({
        id: mockLocation.id,
        isServiceable: true,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([{ id: 'new-address-id' }]);

      const result = await service.create(vendorId, createDto);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining(
          'ST_MakePoint(72.877654, 19.076543)::geography',
        ),
      );
      expect(result).toEqual([{ id: 'new-address-id' }]);
    });

    it('should ensure geography point is correctly formatted in the query', async () => {
      const vendorId = 'vendor-id';
      const createDto: CreateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.8777,
        lat: 19.076,
      };
      const mockLocation = { id: 'location-id' };

      mockLocationService.findOrCreateLocation.mockResolvedValue({
        id: mockLocation.id,
        isServiceable: true,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([{ id: 'new-address-id' }]);

      const result = await service.create(vendorId, createDto);

      const expectedQuery = expect.stringContaining('ST_MakePoint');
      const expectedGeographyCast = expect.stringContaining('::geography');
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringMatching(expectedQuery),
      );
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringMatching(expectedGeographyCast),
      );
      expect(result).toEqual([{ id: 'new-address-id' }]);
    });

    it('should throw BadRequestException if latitude and longitude are missing', async () => {
      const vendorId = 'vendor-id';
      const invalidDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
      };

      await expect(service.create(vendorId, invalidDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAddressByVendorId', () => {
    it('should return a vendor address', async () => {
      const vendorId = 'vendor-id';
      const mockAddress = {
        id: 'address-id',
        vendorId,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.8777,
        lat: 19.076,
        locationId: 'location-id',
      };

      mockPrismaService.vendorAddress.findUnique.mockResolvedValue(mockAddress);

      const result = await service.getAddressByVendorId(vendorId);

      expect(prismaService.vendorAddress.findUnique).toHaveBeenCalledWith({
        where: { vendorId },
      });
      expect(result).toEqual(mockAddress);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const vendorId = 'non-existent-vendor-id';

      mockPrismaService.vendorAddress.findUnique.mockResolvedValue(null);

      await expect(service.getAddressByVendorId(vendorId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAddress', () => {
    it('should update a vendor address', async () => {
      const vendorId = 'vendor-id';
      const updateDto: UpdateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.8777,
        lat: 19.076,
      };
      const mockLocation = { id: 'new-location-id' };
      const mockUpdatedAddress = {
        id: 'address-id',
        vendorId,
        ...updateDto,
        locationId: mockLocation.id,
      };

      mockLocationService.findOrCreateLocation.mockResolvedValue({
        id: mockLocation.id,
        isServiceable: true,
      });
      mockPrismaService.vendorAddress.update.mockResolvedValue(
        mockUpdatedAddress,
      );

      const result = await service.updateAddress(vendorId, updateDto);

      expect(locationService.findOrCreateLocation).toHaveBeenCalledWith({
        lat: updateDto.lat!,
        lng: updateDto.lng!,
        state: updateDto.state,
      });
      expect(prismaService.vendorAddress.update).toHaveBeenCalledWith({
        where: { vendorId },
        data: {
          pincode: updateDto.pincode,
          address: updateDto.address,
          locationId: mockLocation.id,
        },
      });
      expect(result).toEqual(mockUpdatedAddress);
    });

    it('should validate ST_MakePoint for geography point update', async () => {
      const vendorId = 'vendor-id';
      const updateDto: UpdateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.8777,
        lat: 19.076,
      };
      const mockLocation = { id: 'new-location-id' };
      const mockUpdatedAddress = {
        id: 'address-id',
        vendorId,
        ...updateDto,
        locationId: mockLocation.id,
      };

      mockLocationService.findOrCreateLocation.mockResolvedValue({
        id: mockLocation.id,
        isServiceable: true,
      });
      mockPrismaService.vendorAddress.update.mockResolvedValue(
        mockUpdatedAddress,
      );

      const result = await service.updateAddress(vendorId, updateDto);

      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ST_MakePoint(72.8777, 19.076)::geography'),
      );
      expect(result).toEqual(mockUpdatedAddress);
    });

    it('should handle precision in ST_MakePoint for geography point update', async () => {
      const vendorId = 'vendor-id';
      const updateDto: UpdateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.877654,
        lat: 19.076543,
      };
      const mockLocation = { id: 'new-location-id' };
      const mockUpdatedAddress = {
        id: 'address-id',
        vendorId,
        ...updateDto,
        locationId: mockLocation.id,
      };

      mockLocationService.findOrCreateLocation.mockResolvedValue({
        id: mockLocation.id,
        isServiceable: true,
      });
      mockPrismaService.vendorAddress.update.mockResolvedValue(
        mockUpdatedAddress,
      );

      const result = await service.updateAddress(vendorId, updateDto);

      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(
          'ST_MakePoint(72.877654, 19.076543)::geography',
        ),
      );
      expect(result).toEqual(mockUpdatedAddress);
    });

    it('should ensure geography point is correctly formatted in the update query', async () => {
      const vendorId = 'vendor-id';
      const updateDto: UpdateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.8777,
        lat: 19.076,
      };
      const mockLocation = { id: 'new-location-id' };
      const mockUpdatedAddress = {
        id: 'address-id',
        vendorId,
        ...updateDto,
        locationId: mockLocation.id,
      };

      mockLocationService.findOrCreateLocation.mockResolvedValue({
        id: mockLocation.id,
        isServiceable: true,
      });
      mockPrismaService.vendorAddress.update.mockResolvedValue(
        mockUpdatedAddress,
      );

      const result = await service.updateAddress(vendorId, updateDto);

      const expectedQuery = expect.stringContaining('ST_MakePoint');
      const expectedGeographyCast = expect.stringContaining('::geography');
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringMatching(expectedQuery),
      );
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringMatching(expectedGeographyCast),
      );
      expect(result).toEqual(mockUpdatedAddress);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const vendorId = 'non-existent-vendor-id';
      const updateDto: UpdateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.8777,
        lat: 19.076,
      };

      mockPrismaService.vendorAddress.update.mockRejectedValue(
        new NotFoundException('Vendor address not found'),
      );

      await expect(service.updateAddress(vendorId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAddressByVendorIdWithLocation', () => {
    it('should return a vendor address with location details', async () => {
      const vendorId = 'vendor-id';
      const mockAddress = {
        id: 'address-id',
        vendorId,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.8777,
        lat: 19.076,
        locationId: 'location-id',
      };

      mockPrismaService.vendorAddress.findUnique.mockResolvedValue(mockAddress);

      const result = await service.getAddressByVendorIdWithLocation(vendorId);

      expect(prismaService.vendorAddress.findUnique).toHaveBeenCalledWith({
        where: { vendorId },
        include: { location: true },
      });
      expect(result).toEqual(mockAddress);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const vendorId = 'non-existent-vendor-id';

      mockPrismaService.vendorAddress.findUnique.mockResolvedValue(null);

      await expect(
        service.getAddressByVendorIdWithLocation(vendorId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAddress', () => {
    it('should delete a vendor address', async () => {
      const vendorId = 'vendor-id';
      const mockAddress = {
        id: 'address-id',
        vendorId,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.8777,
        lat: 19.076,
      };

      mockPrismaService.vendorAddress.findUnique.mockResolvedValue(mockAddress);

      const result = await service.deleteAddress(vendorId);

      expect(result).toEqual(mockAddress);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const vendorId = 'non-existent-vendor-id';

      mockPrismaService.vendorAddress.findUnique.mockResolvedValue(null);

      await expect(service.deleteAddress(vendorId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
