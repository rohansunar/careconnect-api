import { Test, TestingModule } from '@nestjs/testing';
import { CustomerAddressService } from '../../src/customer/services/customer-address.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CustomerAddressService', () => {
  let service: CustomerAddressService;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      customerAddress: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      city: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerAddressService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomerAddressService>(CustomerAddressService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setDefaultAddress', () => {
    const mockCustomerId = 'customer-123';
    const mockAddressId = 'address-123';
    const mockExistingAddress = {
      id: mockAddressId,
      customerId: mockCustomerId,
      label: 'Home',
      address: '123 Main St',
      cityId: null,
      pincode: null,
      created_at: new Date(),
      isDefault: false,
    };

    const mockUpdatedAddress = {
      ...mockExistingAddress,
      isDefault: true,
      city: null,
    };

    it('should set address as default successfully', async () => {
      // Mock the existing address check
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(
        mockExistingAddress,
      );

      // Mock the updateMany to reset other addresses
      mockPrismaService.customerAddress.updateMany.mockResolvedValue({
        count: 0,
      });

      // Mock the final update to set the address as default
      mockPrismaService.customerAddress.update.mockResolvedValue(
        mockUpdatedAddress,
      );

      const result = await service.setDefaultAddress(
        mockCustomerId,
        mockAddressId,
      );

      expect(result).toEqual(mockUpdatedAddress);
      expect(result.isDefault).toBe(true);

      // Verify that updateMany was called to reset other addresses
      expect(mockPrismaService.customerAddress.updateMany).toHaveBeenCalledWith(
        {
          where: {
            customerId: mockCustomerId,
            id: { not: mockAddressId },
          },
          data: {
            isDefault: false,
          },
        },
      );

      // Verify that update was called to set the selected address as default
      expect(mockPrismaService.customerAddress.update).toHaveBeenCalledWith({
        where: { id: mockAddressId },
        data: {
          isDefault: true,
        },
        include: {
          city: true,
        },
      });
    });

    it('should throw NotFoundException when address does not exist', async () => {
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.setDefaultAddress(mockCustomerId, mockAddressId),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.customerAddress.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockAddressId,
          customerId: mockCustomerId,
        },
      });

      // Ensure no updates were attempted
      expect(
        mockPrismaService.customerAddress.updateMany,
      ).not.toHaveBeenCalled();
      expect(mockPrismaService.customerAddress.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when address does not belong to customer', async () => {
      const differentCustomerAddress = {
        id: mockAddressId,
        customerId: 'different-customer-id', // Different customer
        label: 'Home',
        address: '123 Main St',
        isDefault: false,
      };

      mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.setDefaultAddress(mockCustomerId, mockAddressId),
      ).rejects.toThrow(NotFoundException);

      // Ensure no updates were attempted
      expect(
        mockPrismaService.customerAddress.updateMany,
      ).not.toHaveBeenCalled();
      expect(mockPrismaService.customerAddress.update).not.toHaveBeenCalled();
    });

    it('should reset all other addresses to non-default when setting a new default', async () => {
      // Mock existing addresses that should be reset
      const otherAddress1 = {
        id: 'address-456',
        customerId: mockCustomerId,
        isDefault: true, // This should be reset to false
      };

      const otherAddress2 = {
        id: 'address-789',
        customerId: mockCustomerId,
        isDefault: false,
      };

      mockPrismaService.customerAddress.findFirst.mockResolvedValue(
        mockExistingAddress,
      );
      mockPrismaService.customerAddress.updateMany.mockResolvedValue({
        count: 2,
      }); // 2 addresses reset
      mockPrismaService.customerAddress.update.mockResolvedValue(
        mockUpdatedAddress,
      );

      const result = await service.setDefaultAddress(
        mockCustomerId,
        mockAddressId,
      );

      expect(result.isDefault).toBe(true);

      // Verify updateMany was called to reset other addresses
      expect(mockPrismaService.customerAddress.updateMany).toHaveBeenCalledWith(
        {
          where: {
            customerId: mockCustomerId,
            id: { not: mockAddressId },
          },
          data: {
            isDefault: false,
          },
        },
      );
    });

    it('should handle error when updateMany fails', async () => {
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(
        mockExistingAddress,
      );
      mockPrismaService.customerAddress.updateMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.setDefaultAddress(mockCustomerId, mockAddressId),
      ).rejects.toThrow(Error);

      // Ensure updateMany was called but update was not
      expect(mockPrismaService.customerAddress.updateMany).toHaveBeenCalled();
      expect(mockPrismaService.customerAddress.update).not.toHaveBeenCalled();
    });

    it('should handle error when final update fails', async () => {
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(
        mockExistingAddress,
      );
      mockPrismaService.customerAddress.updateMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.customerAddress.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.setDefaultAddress(mockCustomerId, mockAddressId),
      ).rejects.toThrow(Error);

      // Ensure both updateMany and update were called
      expect(mockPrismaService.customerAddress.updateMany).toHaveBeenCalled();
      expect(mockPrismaService.customerAddress.update).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a customer address successfully', async () => {
      const mockCustomerId = 'customer-123';
      const mockCityId = 'city-123';
      const mockData = {
        label: 'Home',
        address: '123 Main St',
        cityId: mockCityId,
        pincode: '123456',
      };

      const mockCity = {
        id: mockCityId,
        name: 'Test City',
      };

      const mockCreatedAddress = {
        id: 'address-123',
        customerId: mockCustomerId,
        label: mockData.label,
        address: mockData.address,
        cityId: mockData.cityId,
        pincode: mockData.pincode,
        created_at: new Date(),
        isDefault: false,
        city: mockCity,
      };

      mockPrismaService.city.findUnique.mockResolvedValue(mockCity);
      mockPrismaService.customerAddress.create.mockResolvedValue(
        mockCreatedAddress,
      );

      const result = await service.create(mockCustomerId, mockData);

      expect(result).toEqual(mockCreatedAddress);
      expect(mockPrismaService.city.findUnique).toHaveBeenCalledWith({
        where: { id: mockCityId },
      });
      expect(mockPrismaService.customerAddress.create).toHaveBeenCalledWith({
        data: {
          customerId: mockCustomerId,
          ...mockData,
        },
        include: {
          city: true,
        },
      });
    });

    it('should throw BadRequestException when city not found', async () => {
      const mockCustomerId = 'customer-123';
      const mockData = {
        cityId: 'invalid-city-id',
      };

      mockPrismaService.city.findUnique.mockResolvedValue(null);

      await expect(service.create(mockCustomerId, mockData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all addresses for a customer', async () => {
      const mockCustomerId = 'customer-123';
      const mockAddresses = [
        {
          id: 'address-1',
          customerId: mockCustomerId,
          label: 'Home',
          cityId: null,
          pincode: null,
          created_at: new Date(),
          isDefault: true,
        },
        {
          id: 'address-2',
          customerId: mockCustomerId,
          label: 'Work',
          cityId: null,
          pincode: null,
          created_at: new Date(),
          isDefault: false,
        },
      ];

      mockPrismaService.customerAddress.findMany.mockResolvedValue(
        mockAddresses,
      );

      const result = await service.findAll(mockCustomerId);

      expect(result).toEqual(mockAddresses);
      expect(mockPrismaService.customerAddress.findMany).toHaveBeenCalledWith({
        where: { customerId: mockCustomerId },
        include: {
          city: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a specific address for a customer', async () => {
      const mockCustomerId = 'customer-123';
      const mockAddressId = 'address-123';
      const mockAddress = {
        id: mockAddressId,
        customerId: mockCustomerId,
        label: 'Home',
        cityId: null,
        pincode: null,
        created_at: new Date(),
        isDefault: true,
      };

      mockPrismaService.customerAddress.findFirst.mockResolvedValue(
        mockAddress,
      );

      const result = await service.findOne(mockCustomerId, mockAddressId);

      expect(result).toEqual(mockAddress);
      expect(mockPrismaService.customerAddress.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockAddressId,
          customerId: mockCustomerId,
        },
        include: {
          city: true,
        },
      });
    });

    it('should throw NotFoundException when address not found', async () => {
      const mockCustomerId = 'customer-123';
      const mockAddressId = 'address-123';

      mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockCustomerId, mockAddressId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a customer address successfully', async () => {
      const mockCustomerId = 'customer-123';
      const mockAddressId = 'address-123';
      const mockData = {
        label: 'Updated Home',
      };

      const mockExistingAddress = {
        id: mockAddressId,
        customerId: mockCustomerId,
        label: 'Home',
        cityId: null,
        pincode: null,
        created_at: new Date(),
        isDefault: false,
      };

      const mockUpdatedAddress = {
        ...mockExistingAddress,
        ...mockData,
      };

      mockPrismaService.customerAddress.findFirst.mockResolvedValue(
        mockExistingAddress,
      );
      mockPrismaService.customerAddress.update.mockResolvedValue(
        mockUpdatedAddress,
      );

      const result = await service.update(
        mockCustomerId,
        mockAddressId,
        mockData,
      );

      expect(result).toEqual(mockUpdatedAddress);
      expect(mockPrismaService.customerAddress.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockAddressId,
          customerId: mockCustomerId,
        },
      });
      expect(mockPrismaService.customerAddress.update).toHaveBeenCalledWith({
        where: { id: mockAddressId },
        data: mockData,
        include: {
          city: true,
        },
      });
    });

    it('should throw NotFoundException when address not found', async () => {
      const mockCustomerId = 'customer-123';
      const mockAddressId = 'address-123';
      const mockData = {
        label: 'Updated Home',
      };

      mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockCustomerId, mockAddressId, mockData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a customer address successfully', async () => {
      const mockCustomerId = 'customer-123';
      const mockAddressId = 'address-123';

      const mockExistingAddress = {
        id: mockAddressId,
        customerId: mockCustomerId,
        label: 'Home',
        cityId: null,
        pincode: null,
        created_at: new Date(),
        isDefault: false,
      };

      mockPrismaService.customerAddress.findFirst.mockResolvedValue(
        mockExistingAddress,
      );
      mockPrismaService.customerAddress.delete.mockResolvedValue(
        mockExistingAddress,
      );

      const result = await service.delete(mockCustomerId, mockAddressId);

      expect(result).toEqual({
        message: 'Customer address deleted successfully',
      });
      expect(mockPrismaService.customerAddress.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockAddressId,
          customerId: mockCustomerId,
        },
      });
      expect(mockPrismaService.customerAddress.delete).toHaveBeenCalledWith({
        where: { id: mockAddressId },
      });
    });

    it('should throw NotFoundException when address not found', async () => {
      const mockCustomerId = 'customer-123';
      const mockAddressId = 'address-123';

      mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(mockCustomerId, mockAddressId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
