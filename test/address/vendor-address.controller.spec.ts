import { Test, TestingModule } from '@nestjs/testing';
import { VendorAddressController } from '../../src/address/controllers/vendor-address.controller';
import { VendorAddressService } from '../../src/address/services/vendor-address.service';
import { VendorAuthGuard } from '../../src/auth/guards/vendor-auth.guard';
import { CurrentUser } from '../../src/auth/decorators/current-user.decorator';
import { CreateAddressDto } from '../../src/address/dto/create-address.dto';
import { UpdateAddressDto } from '../../src/address/dto/update-address.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VendorService } from '../../src/vendor/services/vendor.service';

describe('VendorAddressController', () => {
  let controller: VendorAddressController;
  let service: VendorAddressService;

  const mockVendorAddressService = {
    createAddress: jest.fn(),
    getAddressByVendorIdWithLocation: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
  };

  const mockVendorAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorAddressController],
      providers: [
        {
          provide: VendorAddressService,
          useValue: mockVendorAddressService,
        },
        {
          provide: VendorService,
          useValue: {
            validateVendorExists: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(VendorAuthGuard)
      .useValue(mockVendorAuthGuard)
      .compile();

    controller = module.get<VendorAddressController>(VendorAddressController);
    service = module.get<VendorAddressService>(VendorAddressService);
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
      const mockCreatedAddress = {
        id: 'new-address-id',
        vendorId,
        ...createDto,
      };

      mockVendorAddressService.createAddress.mockResolvedValue(
        mockCreatedAddress,
      );

      const result = await controller.createAddress(createDto, { id: vendorId });

      expect(service.createAddress).toHaveBeenCalledWith(vendorId, createDto);
      expect(result).toEqual(mockCreatedAddress);
    });

    it('should throw BadRequestException if required fields are missing', async () => {
      const vendorId = 'vendor-id';
      const invalidDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
      };

      mockVendorAddressService.createAddress.mockRejectedValue(
        new BadRequestException('Latitude and longitude are required'),
      );

      await expect(
        controller.createAddress(invalidDto as any, { id: vendorId }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAddress', () => {
    it('should return the vendor address', async () => {
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

      mockVendorAddressService.getAddressByVendorIdWithLocation.mockResolvedValue(
        mockAddress,
      );

      const result = await controller.getAddress({ id: vendorId });

      expect(
        service.getAddressByVendorIdWithLocation,
      ).toHaveBeenCalledWith(vendorId);
      expect(result).toEqual(mockAddress);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const vendorId = 'non-existent-vendor-id';

      mockVendorAddressService.getAddressByVendorIdWithLocation.mockRejectedValue(
        new NotFoundException('Vendor address not found'),
      );

      await expect(controller.getAddress({ id: vendorId })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAddress', () => {
    it('should update the vendor address', async () => {
      const vendorId = 'vendor-id';
      const updateDto: UpdateAddressDto = {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.8777,
        lat: 19.076,
      };
      const mockUpdatedAddress = {
        id: 'address-id',
        vendorId,
        ...updateDto,
      };

      mockVendorAddressService.updateAddress.mockResolvedValue(
        mockUpdatedAddress,
      );

      const result = await controller.updateAddress(updateDto, { id: vendorId });

      expect(service.updateAddress).toHaveBeenCalledWith(vendorId, updateDto);
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

      mockVendorAddressService.updateAddress.mockRejectedValue(
        new NotFoundException('Vendor address not found'),
      );

      await expect(
        controller.updateAddress(updateDto, { id: vendorId }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAddress', () => {
    it('should delete the vendor address', async () => {
      const vendorId = 'vendor-id';
      const mockResponse = { message: 'Vendor address deleted successfully' };

      mockVendorAddressService.deleteAddress.mockResolvedValue(mockResponse);

      const result = await controller.deleteAddress({ id: vendorId });

      expect(service.deleteAddress).toHaveBeenCalledWith(vendorId);
      expect(result).toEqual(mockResponse);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const vendorId = 'non-existent-vendor-id';

      mockVendorAddressService.deleteAddress.mockRejectedValue(
        new NotFoundException('Vendor address not found'),
      );

      await expect(controller.deleteAddress({ id: vendorId })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});