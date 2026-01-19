import { Test, TestingModule } from '@nestjs/testing';
import { CustomerAddressService } from '../../src/address/services/customer-address.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { LocationService } from '../../src/common/services/location.service';
import { CreateCustomerAddressDto } from '../../src/address/dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from '../../src/address/dto/update-customer-address.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AddressLabel } from '../../src/address/dto/create-customer-address.dto';

describe('CustomerAddressService', () => {
  let service: CustomerAddressService;
  let prismaService: PrismaService;
  let locationService: LocationService;

  const mockPrismaService = {
    customerAddress: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockLocationService = {
    findOrCreateLocation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerAddressService,
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

    service = module.get<CustomerAddressService>(CustomerAddressService);
    prismaService = module.get<PrismaService>(PrismaService);
    locationService = module.get<LocationService>(LocationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all customer addresses', async () => {
      const customerId = 'customer-id';
      const mockAddresses = [
        {
          id: 'address-id-1',
          customerId,
          label: 'Home',
          address: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          lng: 72.8777,
          lat: 19.076,
          isDefault: true,
          location: { id: 'location-id', name: 'Mumbai', state: 'Maharashtra' },
        },
      ];

      mockPrismaService.customer.findFirst.mockResolvedValue({ id: customerId });
      mockPrismaService.customerAddress.findMany.mockResolvedValue(
        mockAddresses,
      );

      const result = await service.findAll(customerId);

      expect(prismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: customerId, isActive: true },
      });
      expect(prismaService.customerAddress.findMany).toHaveBeenCalledWith({
        where: { customerId, isActive: true },
        include: { location: true },
        orderBy: [{ isDefault: 'desc' }, { created_at: 'desc' }],
      });
      expect(result).toEqual(mockAddresses);
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      const customerId = 'non-existent-customer-id';

      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(service.findAll(customerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a single customer address', async () => {
      const customerId = 'customer-id';
      const addressId = 'address-id';
      const mockAddress = {
        id: addressId,
        customerId,
        label: 'Home',
        address: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        lng: 72.8777,
        lat: 19.076,
        isDefault: true,
        location: { id: 'location-id', name: 'Mumbai', state: 'Maharashtra' },
      };

      mockPrismaService.customer.findFirst.mockResolvedValue({ id: customerId });
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(
        mockAddress,
      );

      const result = await service.findOne(customerId, addressId);

      expect(prismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: customerId, isActive: true },
      });
      expect(prismaService.customerAddress.findFirst).toHaveBeenCalledWith({
        where: { id: addressId, customerId, isActive: true },
        include: { location: true },
      });
      expect(result).toEqual(mockAddress);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const customerId = 'customer-id';
      const addressId = 'non-existent-address-id';

      mockPrismaService.customer.findFirst.mockResolvedValue({ id: customerId });
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);

      await expect(service.findOne(customerId, addressId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new customer address', async () => {
      const customerId = 'customer-id';
      const createDto: CreateCustomerAddressDto = {
        label: AddressLabel.Home,
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
        customerId,
        ...createDto,
        locationId: mockLocation.id,
        isDefault: true,
      };

      mockPrismaService.customer.findFirst.mockResolvedValue({ id: customerId });
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);
      mockLocationService.findOrCreateLocation.mockResolvedValue(
        mockLocation.id,
      );
      mockPrismaService.customerAddress.count.mockResolvedValue(0);
      mockPrismaService.customerAddress.create.mockResolvedValue(
        mockCreatedAddress,
      );

      const result = await service.create(customerId, createDto);

      expect(prismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: customerId, isActive: true },
      });
      expect(locationService.findOrCreateLocation).toHaveBeenCalledWith({
        lat: createDto.lat!,
        lng: createDto.lng!,
        city: createDto.city,
        state: createDto.state,
      });
      expect(prismaService.customerAddress.create).toHaveBeenCalledWith({
        data: {
          customerId,
          label: createDto.label,
          address: createDto.address,
          locationId: mockLocation.id,
          pincode: createDto.pincode,
          lng: createDto.lng,
          lat: createDto.lat,
          isDefault: true,
        },
      });
      expect(result).toEqual(mockCreatedAddress);
    });

    it('should throw BadRequestException if latitude and longitude are missing', async () => {
      const customerId = 'customer-id';
      const invalidDto = {
        label: 'Home',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
      };

      await expect(service.create(customerId, invalidDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if duplicate address exists', async () => {
      const customerId = 'customer-id';
      const duplicateDto: CreateCustomerAddressDto = {
        label: AddressLabel.Home,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.8777,
        lat: 19.076,
      };

      mockPrismaService.customer.findFirst.mockResolvedValue({ id: customerId });
      mockPrismaService.customerAddress.findFirst.mockResolvedValue({
        id: 'existing-address-id',
      });

      await expect(service.create(customerId, duplicateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update a customer address', async () => {
      const customerId = 'customer-id';
      const addressId = 'address-id';
      const updateDto: UpdateCustomerAddressDto = {
        label: AddressLabel.Office,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.8777,
        lat: 19.076,
      };
      const mockExistingAddress = {
        id: addressId,
        customerId,
        label: 'Home',
        address: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        lng: 72.8777,
        lat: 19.076,
        locationId: 'location-id',
        location: { id: 'location-id', name: 'Mumbai', state: 'Maharashtra' },
      };
      const mockLocation = { id: 'new-location-id' };
      const mockUpdatedAddress = {
        id: addressId,
        customerId,
        ...updateDto,
        locationId: mockLocation.id,
        isDefault: false,
        location: { id: mockLocation.id, name: 'Mumbai', state: 'Maharashtra' },
      };

      mockPrismaService.customer.findFirst.mockResolvedValue({ id: customerId });
        mockPrismaService.customerAddress.findFirst.mockResolvedValueOnce(
          mockExistingAddress,
        );
        mockPrismaService.customerAddress.findFirst.mockResolvedValueOnce(null);
        mockLocationService.findOrCreateLocation.mockResolvedValue(
          mockLocation.id,
        );
        mockPrismaService.customerAddress.update.mockResolvedValue(
          mockUpdatedAddress,
        );

      const result = await service.update(customerId, addressId, updateDto);

      expect(prismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: customerId, isActive: true },
      });
      expect(prismaService.customerAddress.findFirst).toHaveBeenCalledWith({
        where: { id: addressId, customerId, isActive: true },
      });
      expect(locationService.findOrCreateLocation).toHaveBeenCalledWith({
        lat: updateDto.lat!,
        lng: updateDto.lng!,
        state: updateDto.state,
        city: updateDto.city,
      });
      expect(prismaService.customerAddress.update).toHaveBeenCalledWith({
        where: { id: addressId },
        data: {
          label: updateDto.label,
          address: updateDto.address,
          locationId: mockLocation.id,
          pincode: updateDto.pincode,
          lng: updateDto.lng,
          lat: updateDto.lat,
        },
        include: { location: true },
      });
      expect(result).toEqual(mockUpdatedAddress);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const customerId = 'customer-id';
      const addressId = 'non-existent-address-id';
      const updateDto: UpdateCustomerAddressDto = {
        label: AddressLabel.Office,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.8777,
        lat: 19.076,
      };

      mockPrismaService.customer.findFirst.mockResolvedValue({ id: customerId });
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);

      await expect(service.update(customerId, addressId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a customer address', async () => {
      const customerId = 'customer-id';
      const addressId = 'address-id';
      const mockExistingAddress = {
        id: addressId,
        customerId,
        label: 'Home',
        address: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        lng: 72.8777,
        lat: 19.076,
        isActive: true,
      };

      mockPrismaService.customer.findFirst.mockResolvedValue({ id: customerId });
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(
        mockExistingAddress,
      );
      mockPrismaService.customerAddress.update.mockResolvedValue(
        mockExistingAddress,
      );

      const result = await service.delete(customerId, addressId);

      expect(prismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: customerId, isActive: true },
      });
      expect(prismaService.customerAddress.findFirst).toHaveBeenCalledWith({
        where: { id: addressId, customerId },
      });
      expect(prismaService.customerAddress.update).toHaveBeenCalledWith({
        where: { id: addressId },
        data: { isActive: false },
      });
      expect(result).toEqual({ message: 'Customer address deleted successfully' });
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const customerId = 'customer-id';
      const addressId = 'non-existent-address-id';

      mockPrismaService.customer.findFirst.mockResolvedValue({ id: customerId });
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);

      await expect(service.delete(customerId, addressId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setDefaultAddress', () => {
    it('should set a customer address as default', async () => {
      const customerId = 'customer-id';
      const addressId = 'address-id';
      const mockExistingAddress = {
        id: addressId,
        customerId,
        label: 'Home',
        address: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        lng: 72.8777,
        lat: 19.076,
        isDefault: false,
      };
      const mockUpdatedAddress = {
        ...mockExistingAddress,
        isDefault: true,
      };

      mockPrismaService.customer.findFirst.mockResolvedValue({ id: customerId });
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(
        mockExistingAddress,
      );
      mockPrismaService.customerAddress.updateMany.mockResolvedValue({});
      mockPrismaService.customerAddress.update.mockResolvedValue(
        mockUpdatedAddress,
      );

      const result = await service.setDefaultAddress(customerId, addressId);

      expect(prismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: customerId, isActive: true },
      });
      expect(prismaService.customerAddress.findFirst).toHaveBeenCalledWith({
        where: { id: addressId, customerId, isActive: true },
      });
      expect(prismaService.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { customerId, id: { not: addressId }, isActive: true },
        data: { isDefault: false },
      });
      expect(prismaService.customerAddress.update).toHaveBeenCalledWith({
        where: { id: addressId },
        data: { isDefault: true },
      });
      expect(result).toEqual(mockUpdatedAddress);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const customerId = 'customer-id';
      const addressId = 'non-existent-address-id';

      mockPrismaService.customer.findFirst.mockResolvedValue({ id: customerId });
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.setDefaultAddress(customerId, addressId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateAddress', () => {
    it('should validate an existing address', async () => {
      const addressId = 'address-id';
      const mockAddress = {
        id: addressId,
        customerId: 'customer-id',
        label: 'Home',
        address: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        lng: 72.8777,
        lat: 19.076,
        isDefault: true,
      };

      mockPrismaService.customerAddress.findUnique.mockResolvedValue(
        mockAddress,
      );

      await expect(service.validateAddress(addressId)).resolves.not.toThrow();

      expect(prismaService.customerAddress.findUnique).toHaveBeenCalledWith({
        where: { id: addressId },
      });
    });

    it('should throw BadRequestException if address does not exist', async () => {
      const addressId = 'non-existent-address-id';

      mockPrismaService.customerAddress.findUnique.mockResolvedValue(null);

      await expect(service.validateAddress(addressId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});