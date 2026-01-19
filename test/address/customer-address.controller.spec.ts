import { Test, TestingModule } from '@nestjs/testing';
import { CustomerAddressController } from '../../src/address/controllers/customer-address.controller';
import { CustomerAddressService } from '../../src/address/services/customer-address.service';
import { CustomerAuthGuard } from '../../src/auth/guards/customer-auth.guard';
import { CurrentUser } from '../../src/auth/decorators/current-user.decorator';
import { CreateCustomerAddressDto } from '../../src/address/dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from '../../src/address/dto/update-customer-address.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CustomerAddressController', () => {
  let controller: CustomerAddressController;
  let service: CustomerAddressService;

  const mockCustomerAddressService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    setDefaultAddress: jest.fn(),
  };

  const mockCustomerAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerAddressController],
      providers: [
        {
          provide: CustomerAddressService,
          useValue: mockCustomerAddressService,
        },
      ],
    })
      .overrideGuard(CustomerAuthGuard)
      .useValue(mockCustomerAuthGuard)
      .compile();

    controller = module.get<CustomerAddressController>(
      CustomerAddressController,
    );
    service = module.get<CustomerAddressService>(CustomerAddressService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of customer addresses', async () => {
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
        },
      ];

      mockCustomerAddressService.findAll.mockResolvedValue(mockAddresses);

      const result = await controller.findAll({ id: customerId });

      expect(service.findAll).toHaveBeenCalledWith(customerId);
      expect(result).toEqual(mockAddresses);
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      const customerId = 'non-existent-customer-id';

      mockCustomerAddressService.findAll.mockRejectedValue(
        new NotFoundException('Customer not found'),
      );

      await expect(controller.findAll({ id: customerId })).rejects.toThrow(
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
      };

      mockCustomerAddressService.findOne.mockResolvedValue(mockAddress);

      const result = await controller.findOne(addressId, { id: customerId });

      expect(service.findOne).toHaveBeenCalledWith(customerId, addressId);
      expect(result).toEqual(mockAddress);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const customerId = 'customer-id';
      const addressId = 'non-existent-address-id';

      mockCustomerAddressService.findOne.mockRejectedValue(
        new NotFoundException('Customer address not found'),
      );

      await expect(
        controller.findOne(addressId, { id: customerId }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new customer address', async () => {
      const customerId = 'customer-id';
      const createDto: CreateCustomerAddressDto = {
        label: 'Home',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
        lng: 72.8777,
        lat: 19.076,
      };
      const mockCreatedAddress = {
        id: 'new-address-id',
        customerId,
        ...createDto,
        isDefault: true,
      };

      mockCustomerAddressService.create.mockResolvedValue(mockCreatedAddress);

      const result = await controller.create(createDto, { id: customerId });

      expect(service.create).toHaveBeenCalledWith(customerId, createDto);
      expect(result).toEqual(mockCreatedAddress);
    });

    it('should throw BadRequestException if required fields are missing', async () => {
      const customerId = 'customer-id';
      const invalidDto = {
        label: 'Home',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '123 Main Street',
      };

      mockCustomerAddressService.create.mockRejectedValue(
        new BadRequestException('Latitude and longitude are required'),
      );

      await expect(
        controller.create(invalidDto as any, { id: customerId }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a customer address', async () => {
      const customerId = 'customer-id';
      const addressId = 'address-id';
      const updateDto: UpdateCustomerAddressDto = {
        label: 'Office',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.8777,
        lat: 19.076,
      };
      const mockUpdatedAddress = {
        id: addressId,
        customerId,
        ...updateDto,
        isDefault: false,
      };

      mockCustomerAddressService.update.mockResolvedValue(mockUpdatedAddress);

      const result = await controller.update(addressId, updateDto, {
        id: customerId,
      });

      expect(service.update).toHaveBeenCalledWith(
        customerId,
        addressId,
        updateDto,
      );
      expect(result).toEqual(mockUpdatedAddress);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const customerId = 'customer-id';
      const addressId = 'non-existent-address-id';
      const updateDto: UpdateCustomerAddressDto = {
        label: 'Office',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: '456 Business Avenue',
        lng: 72.8777,
        lat: 19.076,
      };

      mockCustomerAddressService.update.mockRejectedValue(
        new NotFoundException('Customer address not found'),
      );

      await expect(
        controller.update(addressId, updateDto, { id: customerId }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a customer address', async () => {
      const customerId = 'customer-id';
      const addressId = 'address-id';
      const mockResponse = { message: 'Customer address deleted successfully' };

      mockCustomerAddressService.delete.mockResolvedValue(mockResponse);

      const result = await controller.delete(addressId, { id: customerId });

      expect(service.delete).toHaveBeenCalledWith(customerId, addressId);
      expect(result).toEqual(mockResponse);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const customerId = 'customer-id';
      const addressId = 'non-existent-address-id';

      mockCustomerAddressService.delete.mockRejectedValue(
        new NotFoundException('Customer address not found'),
      );

      await expect(
        controller.delete(addressId, { id: customerId }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setDefaultAddress', () => {
    it('should set a customer address as default', async () => {
      const customerId = 'customer-id';
      const addressId = 'address-id';
      const mockUpdatedAddress = {
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
      };

      mockCustomerAddressService.setDefaultAddress.mockResolvedValue(
        mockUpdatedAddress,
      );

      const result = await controller.setDefaultAddress(addressId, {
        id: customerId,
      });

      expect(service.setDefaultAddress).toHaveBeenCalledWith(
        customerId,
        addressId,
      );
      expect(result).toEqual(mockUpdatedAddress);
    });

    it('should throw NotFoundException if address does not exist', async () => {
      const customerId = 'customer-id';
      const addressId = 'non-existent-address-id';

      mockCustomerAddressService.setDefaultAddress.mockRejectedValue(
        new NotFoundException('Customer address not found'),
      );

      await expect(
        controller.setDefaultAddress(addressId, { id: customerId }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
