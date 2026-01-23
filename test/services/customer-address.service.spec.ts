import { Test, TestingModule } from '@nestjs/testing';
import { CustomerAddressService } from '../../src/address/services/customer-address.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { LocationService } from '../../src/location/services/location.service';
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
        count: jest.fn(),
      },
      customer: {
        findFirst: jest.fn(),
      },
      location: {
        findUnique: jest.fn(),
      },
    };

    const mockLocationService = {
      findOrCreateLocation: jest.fn(),
    };

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
      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        is_active: true,
      });
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
            is_active: true,
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
          location: true,
        },
      });
    });

    it('should throw NotFoundException when address does not exist', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        isActive: true,
      });
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.setDefaultAddress(mockCustomerId, mockAddressId),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.customerAddress.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockAddressId,
          customerId: mockCustomerId,
          isActive: true,
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
      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        isActive: true,
      });
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
            isActive: true,
          },
          data: {
            isDefault: false,
          },
        },
      );
    });

    it('should handle error when updateMany fails', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        isActive: true,
      });
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
      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        isActive: true,
      });
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
      const mockLocationId = 'location-123';
      const mockData = {
        address: '123 Main St',
        pincode: '123456',
        lng: 56.78,
        lat: 12.34,
        city: 'Test City',
        state: 'Test State',
      };

      const mockLocation = {
        id: mockLocationId,
        name: 'Test Location',
      };

      const mockCreatedAddress = {
        id: 'address-123',
        customerId: mockCustomerId,
        address: mockData.address,
        locationId: mockLocationId,
        pincode: mockData.pincode,
        lng: mockData.lng,
        lat: mockData.lat,
        created_at: new Date(),
        isDefault: false,
        location: mockLocation,
      };

      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        is_active: true,
      });

      const mockLocationService = {
        findOrCreateLocation: jest
          .fn()
          .mockResolvedValue({ id: mockLocationId, isServiceable: true }),
      };

      mockPrismaService.customerAddress.count.mockResolvedValue(0);
      mockPrismaService.$transaction = jest.fn((fn) => fn());
      mockPrismaService.$queryRaw = jest
        .fn()
        .mockResolvedValue([{ id: 'address-123' }]);

      const result = await service.create(mockCustomerId, mockData);

      expect(result).toEqual([{ id: 'address-123' }]);
    });

    it('should throw BadRequestException when location not found', async () => {
      const mockCustomerId = 'customer-123';
      const mockData = {
        address: '123 Main St',
        lng: 56.78,
        lat: 12.34,
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
      };

      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        is_active: true,
      });

      const mockLocationService = {
        findOrCreateLocation: jest
          .fn()
          .mockRejectedValue(new BadRequestException('Location not found')),
      };

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
          locationId: null,
          pincode: null,
          created_at: new Date(),
          isDefault: true,
        },
        {
          id: 'address-2',
          customerId: mockCustomerId,
          label: 'Work',
          locationId: null,
          pincode: null,
          created_at: new Date(),
          isDefault: false,
        },
      ];

      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        is_active: true,
      });
      mockPrismaService.customerAddress.findMany.mockResolvedValue(
        mockAddresses,
      );

      const result = await service.findAll(mockCustomerId);

      expect(result).toEqual(mockAddresses);
      expect(mockPrismaService.customerAddress.findMany).toHaveBeenCalledWith({
        where: { customerId: mockCustomerId, is_active: true },
        include: {
          location: true,
        },
        orderBy: [{ isDefault: 'desc' }, { created_at: 'desc' }],
      });
    });

    describe('create', () => {
      it('should create a customer address successfully with duplicate check', async () => {
        const mockCustomerId = 'customer-123';
        const mockCityId = 'city-123';
        const mockData = {
          label: 'Home',
          address: '123 Main St',
          cityId: mockCityId,
          pincode: '123456',
          location: { lat: 12.34, lng: 56.78 },
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
          location: mockData.location,
          created_at: new Date(),
          isDefault: false,
          city: mockCity,
        };

        mockPrismaService.customer.findFirst.mockResolvedValue({
          id: mockCustomerId,
          isActive: true,
        });
        mockPrismaService.customerAddress.findFirst.mockResolvedValue(null); // No duplicate
        mockPrismaService.city.findUnique.mockResolvedValue(mockCity);
        mockPrismaService.customerAddress.create.mockResolvedValue(
          mockCreatedAddress,
        );

        const result = await service.create(mockCustomerId, mockData);

        expect(result).toEqual(mockCreatedAddress);
        expect(
          mockPrismaService.customerAddress.findFirst,
        ).toHaveBeenCalledWith({
          where: {
            customerId: mockCustomerId,
            pincode: mockData.pincode,
            cityId: mockData.cityId,
            location: mockData.location,
            address: mockData.address,
          },
        });
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

      it('should throw BadRequestException when duplicate address found', async () => {
        const mockCustomerId = 'customer-123';
        const mockData = {
          address: '123 Main St',
          cityId: 'city-123',
          pincode: '123456',
          location: { lat: 12.34, lng: 56.78 },
        };

        const mockDuplicateAddress = {
          id: 'existing-address',
          customerId: mockCustomerId,
          ...mockData,
        };

        mockPrismaService.customer.findFirst.mockResolvedValue({
          id: mockCustomerId,
          isActive: true,
        });
        mockPrismaService.customerAddress.findFirst.mockResolvedValue(
          mockDuplicateAddress,
        );

        await expect(
          service.createAddress(mockCustomerId, mockData),
        ).rejects.toThrow(BadRequestException);
        expect(
          mockPrismaService.customerAddress.findFirst,
        ).toHaveBeenCalledWith({
          where: {
            customerId: mockCustomerId,
            pincode: mockData.pincode,
            cityId: mockData.cityId,
            location: mockData.location,
            address: mockData.address,
          },
        });
        expect(mockPrismaService.city.findUnique).not.toHaveBeenCalled();
        expect(mockPrismaService.customerAddress.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when city not found', async () => {
        const mockCustomerId = 'customer-123';
        const mockData = {
          address: '123 Main St',
          cityId: 'invalid-city-id',
          pincode: '123456',
          location: { lat: 12.34, lng: 56.78 },
        };

        mockPrismaService.customer.findFirst.mockResolvedValue({
          id: mockCustomerId,
          isActive: true,
        });
        mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);
        mockPrismaService.city.findUnique.mockResolvedValue(null);

        await expect(
          service.createAddress(mockCustomerId, mockData),
        ).rejects.toThrow(BadRequestException);
        expect(mockPrismaService.customerAddress.findFirst).toHaveBeenCalled();
        expect(mockPrismaService.city.findUnique).toHaveBeenCalledWith({
          where: { id: 'invalid-city-id' },
        });
        expect(mockPrismaService.customerAddress.create).not.toHaveBeenCalled();
      });
    });

    describe('updateAddress', () => {
      it('should update a customer address successfully with duplicate check', async () => {
        const mockCustomerId = 'customer-123';
        const mockAddressId = 'address-123';
        const mockData = {
          address: 'Updated 123 Main St',
          location: { lat: 12.34, lng: 56.78 },
          pincode: '123456',
          cityId: 'city-123',
        };

        const mockExistingAddress = {
          id: mockAddressId,
          customerId: mockCustomerId,
          label: 'Home',
          address: '123 Main St',
          cityId: 'old-city',
          pincode: '654321',
          location: { lat: 98.76, lng: 54.32 },
          created_at: new Date(),
          isDefault: false,
        };

        const mockCity = {
          id: 'city-123',
          name: 'Test City',
        };

        const mockUpdatedAddress = {
          ...mockExistingAddress,
          ...mockData,
          city: mockCity,
        };

        mockPrismaService.customer.findFirst.mockResolvedValue({
          id: mockCustomerId,
          isActive: true,
        });
        mockPrismaService.customerAddress.findFirst
          .mockResolvedValueOnce(mockExistingAddress) // For existence check
          .mockResolvedValueOnce(null); // For duplicate check
        mockPrismaService.city.findUnique.mockResolvedValue(mockCity);
        mockPrismaService.customerAddress.update.mockResolvedValue(
          mockUpdatedAddress,
        );

        const result = await service.updateAddress(
          mockCustomerId,
          mockAddressId,
          mockData,
        );

        expect(result).toEqual(mockUpdatedAddress);
        expect(
          mockPrismaService.customerAddress.findFirst,
        ).toHaveBeenNthCalledWith(1, {
          where: {
            id: mockAddressId,
            customerId: mockCustomerId,
            isActive: true,
          },
        });
        expect(
          mockPrismaService.customerAddress.findFirst,
        ).toHaveBeenNthCalledWith(2, {
          where: {
            customerId: mockCustomerId,
            id: { not: mockAddressId },
            address: mockData.address,
            location: mockData.location,
            pincode: mockData.pincode,
            cityId: mockData.cityId,
          },
        });
        expect(mockPrismaService.city.findUnique).toHaveBeenCalledWith({
          where: { id: 'city-123' },
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
          address: 'Updated 123 Main St',
          location: { lat: 12.34, lng: 56.78 },
        };

        mockPrismaService.customer.findFirst.mockResolvedValue({
          id: mockCustomerId,
          isActive: true,
        });
        mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);

        await expect(
          service.updateAddress(mockCustomerId, mockAddressId, mockData),
        ).rejects.toThrow(NotFoundException);
        expect(
          mockPrismaService.customerAddress.findFirst,
        ).toHaveBeenCalledWith({
          where: {
            id: mockAddressId,
            customerId: mockCustomerId,
            isActive: true,
          },
        });
        expect(mockPrismaService.customerAddress.update).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when duplicate address found', async () => {
        const mockCustomerId = 'customer-123';
        const mockAddressId = 'address-123';
        const mockData = {
          address: '123 Main St',
          location: { lat: 12.34, lng: 56.78 },
          pincode: '123456',
          cityId: 'city-123',
        };

        const mockExistingAddress = {
          id: mockAddressId,
          customerId: mockCustomerId,
        };

        const mockDuplicateAddress = {
          id: 'other-address',
          customerId: mockCustomerId,
          ...mockData,
        };

        mockPrismaService.customer.findFirst.mockResolvedValue({
          id: mockCustomerId,
          isActive: true,
        });
        mockPrismaService.customerAddress.findFirst
          .mockResolvedValueOnce(mockExistingAddress)
          .mockResolvedValueOnce(mockDuplicateAddress);

        await expect(
          service.updateAddress(mockCustomerId, mockAddressId, mockData),
        ).rejects.toThrow(BadRequestException);
        expect(
          mockPrismaService.customerAddress.findFirst,
        ).toHaveBeenCalledTimes(2);
        expect(mockPrismaService.city.findUnique).not.toHaveBeenCalled();
        expect(mockPrismaService.customerAddress.update).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when city not found', async () => {
        const mockCustomerId = 'customer-123';
        const mockAddressId = 'address-123';
        const mockData = {
          address: 'Updated 123 Main St',
          location: { lat: 12.34, lng: 56.78 },
          cityId: 'invalid-city-id',
        };

        const mockExistingAddress = {
          id: mockAddressId,
          customerId: mockCustomerId,
        };

        mockPrismaService.customer.findFirst.mockResolvedValue({
          id: mockCustomerId,
          isActive: true,
        });
        mockPrismaService.customerAddress.findFirst
          .mockResolvedValueOnce(mockExistingAddress)
          .mockResolvedValueOnce(null);
        mockPrismaService.city.findUnique.mockResolvedValue(null);

        await expect(
          service.updateAddress(mockCustomerId, mockAddressId, mockData),
        ).rejects.toThrow(BadRequestException);
        expect(
          mockPrismaService.customerAddress.findFirst,
        ).toHaveBeenCalledTimes(2);
        expect(mockPrismaService.city.findUnique).toHaveBeenCalledWith({
          where: { id: 'invalid-city-id' },
        });
        expect(mockPrismaService.customerAddress.update).not.toHaveBeenCalled();
      });

      it('should handle optional fields in duplicate check', async () => {
        const mockCustomerId = 'customer-123';
        const mockAddressId = 'address-123';
        const mockData = {
          address: 'Updated 123 Main St',
          location: { lat: 12.34, lng: 56.78 },
          // pincode and cityId not provided
        };

        const mockExistingAddress = {
          id: mockAddressId,
          customerId: mockCustomerId,
        };

        const mockUpdatedAddress = {
          ...mockExistingAddress,
          ...mockData,
        };

        mockPrismaService.customer.findFirst.mockResolvedValue({
          id: mockCustomerId,
          isActive: true,
        });
        mockPrismaService.customerAddress.findFirst
          .mockResolvedValueOnce(mockExistingAddress)
          .mockResolvedValueOnce(null);
        mockPrismaService.customerAddress.update.mockResolvedValue(
          mockUpdatedAddress,
        );

        const result = await service.updateAddress(
          mockCustomerId,
          mockAddressId,
          mockData,
        );

        expect(result).toEqual(mockUpdatedAddress);
        expect(
          mockPrismaService.customerAddress.findFirst,
        ).toHaveBeenNthCalledWith(2, {
          where: {
            customerId: mockCustomerId,
            id: { not: mockAddressId },
            address: mockData.address,
            location: mockData.location,
            // pincode and cityId not included since undefined
          },
        });
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
        locationId: null,
        pincode: null,
        created_at: new Date(),
        isDefault: true,
      };

      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        is_active: true,
      });
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(
        mockAddress,
      );

      const result = await service.findOne(mockCustomerId, mockAddressId);

      expect(result).toEqual(mockAddress);
      expect(mockPrismaService.customerAddress.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockAddressId,
          customerId: mockCustomerId,
          is_active: true,
        },
        include: {
          location: true,
        },
      });
    });

    it('should throw NotFoundException when address not found', async () => {
      const mockCustomerId = 'customer-123';
      const mockAddressId = 'address-123';

      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        isActive: true,
      });
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
        address: 'Updated 123 Main St',
        lng: 56.78,
        lat: 12.34,
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
      };

      const mockExistingAddress = {
        id: mockAddressId,
        customerId: mockCustomerId,
        label: 'Home',
        locationId: null,
        pincode: null,
        created_at: new Date(),
        isDefault: false,
        location: { id: 'loc-1', name: 'Loc', state: 'State' },
      };

      const mockUpdatedAddress = {
        ...mockExistingAddress,
        ...mockData,
      };

      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        is_active: true,
      });
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
          is_active: true,
        },
      });
      expect(mockPrismaService.customerAddress.update).toHaveBeenCalledWith({
        where: { id: mockAddressId },
        data: mockData,
        include: {
          location: true,
        },
      });
    });

    it('should throw NotFoundException when address not found', async () => {
      const mockCustomerId = 'customer-123';
      const mockAddressId = 'address-123';
      const mockData = {
        address: 'Updated 123 Main St',
        lng: 56.78,
        lat: 12.34,
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
      };

      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        is_active: true,
      });
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
        locationId: null,
        pincode: null,
        created_at: new Date(),
        isDefault: false,
      };

      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        is_active: true,
      });
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(
        mockExistingAddress,
      );
      mockPrismaService.customerAddress.update.mockResolvedValue(
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
      expect(mockPrismaService.customerAddress.update).toHaveBeenCalledWith({
        where: { id: mockAddressId },
        data: { is_active: false } as any,
      });
    });

    it('should throw NotFoundException when address not found', async () => {
      const mockCustomerId = 'customer-123';
      const mockAddressId = 'address-123';

      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: mockCustomerId,
        isActive: true,
      });
      mockPrismaService.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(mockCustomerId, mockAddressId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
