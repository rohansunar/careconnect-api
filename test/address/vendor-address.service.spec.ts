import { Test, TestingModule } from '@nestjs/testing';
import { VendorAddressService } from '../../src/address/services/vendor-address.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { LocationService } from '../../src/common/services/location.service';
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
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
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

  describe('createAddress', () => {
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
      const mockCreatedAddress = {
        id: 'new-address-id',
        vendorId,
        ...createDto,
        locationId: mockLocation.id,
      };

      mockLocationService.findOrCreateLocation.mockResolvedValue(
        mockLocation.id,
      );
      mockPrismaService.vendorAddress.create.mockResolvedValue(
        mockCreatedAddress,
      );

      const result = await service.createAddress(vendorId, createDto);

      expect(locationService.findOrCreateLocation).toHaveBeenCalledWith({
        lat: createDto.lat!,
        lng: createDto.lng!,
        city: createDto.city,
      });
      expect(prismaService.vendorAddress.create).toHaveBeenCalledWith({
        data: {
          vendorId,
          locationId: mockLocation.id,
          lng: createDto.lng,
          lat: createDto.lat,
          pincode: createDto.pincode,
          address: createDto.address,
        },
      });
      expect(result).toEqual(mockCreatedAddress);
    });

    it('should throw BadRequestException if latitude and longitude are missing', async () => {
      const vendorId = 'vendor-id';
      const invalidDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
      };

      await expect(
        service.createAddress(vendorId, invalidDto as any),
      ).rejects.toThrow(BadRequestException);
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

      mockLocationService.findOrCreateLocation.mockResolvedValue(
        mockLocation.id,
      );
      mockPrismaService.vendorAddress.update.mockResolvedValue(
        mockUpdatedAddress,
      );

      const result = await service.updateAddress(vendorId, updateDto);

      expect(locationService.findOrCreateLocation).toHaveBeenCalledWith({
        lat: updateDto.lat!,
        lng: updateDto.lng!,
        city: updateDto.city,
      });
      expect(prismaService.vendorAddress.update).toHaveBeenCalledWith({
        where: { vendorId },
        data: {
          lng: updateDto.lng,
          lat: updateDto.lat,
          pincode: updateDto.pincode,
          address: updateDto.address,
          locationId: mockLocation.id,
        },
      });
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
      });
      expect(result).toEqual({
        id: 'address-id',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.8777,
        lat: 19.076,
      });
    });

    it('should return null if address does not exist', async () => {
      const vendorId = 'non-existent-vendor-id';

      mockPrismaService.vendorAddress.findUnique.mockResolvedValue(null);

      const result = await service.getAddressByVendorIdWithLocation(vendorId);

      expect(prismaService.vendorAddress.findUnique).toHaveBeenCalledWith({
        where: { vendorId },
      });
      expect(result).toBeNull();
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

      mockPrismaService.vendorAddress.delete.mockResolvedValue(mockAddress);

      const result = await service.deleteAddress(vendorId);

      expect(prismaService.vendorAddress.delete).toHaveBeenCalledWith({
        where: { vendorId },
      });
      expect(result).toEqual(mockAddress);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const vendorId = 'non-existent-vendor-id';

      mockPrismaService.vendorAddress.delete.mockRejectedValue(
        new NotFoundException('Vendor address not found'),
      );

      await expect(service.deleteAddress(vendorId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
