import { Test, TestingModule } from '@nestjs/testing';
import { VendorService } from '../../src/vendor/services/vendor.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('VendorService', () => {
  let service: VendorService;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      vendor: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VendorService>(VendorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return vendor profile successfully', async () => {
      const mockVendor = {
        id: 'vendorId',
        name: 'Vendor Name',
        phone: '+1234567890',
        email: 'vendor@example.com',
        address: '123 Main St',
        is_active: true,
        is_available_today: true,
        service_radius_m: 5000,
        delivery_time_msg: '30 mins',
      };

      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);

      const result = await service.getProfile('vendorId');

      expect(result).toEqual(mockVendor);
      expect(mockPrismaService.vendor.findUnique).toHaveBeenCalledWith({
        where: { id: 'vendorId' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          is_active: true,
          is_available_today: true,
          service_radius_m: true,
          delivery_time_msg: true,
        },
      });
    });

    it('should throw BadRequestException if vendor not found', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistentId')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.vendor.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistentId' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          is_active: true,
          is_available_today: true,
          service_radius_m: true,
          delivery_time_msg: true,
        },
      });
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const data = {
        name: 'Updated Name',
        phone: '+1987654321',
        email: 'updated@example.com',
        address: '456 New St',
        delivery_time_msg: '45 mins',
        service_radius_m: 10000,
      };
      const mockUpdatedVendor = {
        id: 'vendorId',
        name: 'Updated Name',
        phone: '+1987654321',
        email: 'updated@example.com',
        address: '456 New St',
        is_active: true,
        is_available_today: true,
        service_radius_m: 10000,
        delivery_time_msg: '45 mins',
      };

      mockPrismaService.vendor.update.mockResolvedValue(mockUpdatedVendor);

      const result = await service.updateProfile('vendorId', data);

      expect(result).toEqual(mockUpdatedVendor);
      expect(mockPrismaService.vendor.update).toHaveBeenCalledWith({
        where: { id: 'vendorId' },
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          is_active: true,
          is_available_today: true,
          service_radius_m: true,
          delivery_time_msg: true,
        },
      });
    });

    it('should throw BadRequestException for invalid phone number format', async () => {
      const data = { phone: 'invalid-phone' };

      await expect(service.updateProfile('vendorId', data)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.vendor.update).not.toHaveBeenCalled();
    });

    it('should update profile with partial data', async () => {
      const data = { name: 'Partial Update' };
      const mockUpdatedVendor = {
        id: 'vendorId',
        name: 'Partial Update',
        phone: '+1234567890',
        email: 'vendor@example.com',
        address: '123 Main St',
        is_active: true,
        is_available_today: true,
        service_radius_m: 5000,
        delivery_time_msg: '30 mins',
      };

      mockPrismaService.vendor.update.mockResolvedValue(mockUpdatedVendor);

      const result = await service.updateProfile('vendorId', data);

      expect(result).toEqual(mockUpdatedVendor);
      expect(mockPrismaService.vendor.update).toHaveBeenCalledWith({
        where: { id: 'vendorId' },
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          is_active: true,
          is_available_today: true,
          service_radius_m: true,
          delivery_time_msg: true,
        },
      });
    });
  });

  describe('updateAvailability', () => {
    it('should update availability successfully', async () => {
      const data = { is_active: false, is_available_today: false };
      const mockUpdatedVendor = {
        id: 'vendorId',
        name: 'Vendor Name',
        phone: '+1234567890',
        email: 'vendor@example.com',
        address: '123 Main St',
        is_active: false,
        is_available_today: false,
        service_radius_m: 5000,
        delivery_time_msg: '30 mins',
      };

      mockPrismaService.vendor.update.mockResolvedValue(mockUpdatedVendor);

      const result = await service.updateAvailability('vendorId', data);

      expect(result).toEqual(mockUpdatedVendor);
      expect(mockPrismaService.vendor.update).toHaveBeenCalledWith({
        where: { id: 'vendorId' },
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          is_active: true,
          is_available_today: true,
          service_radius_m: true,
          delivery_time_msg: true,
        },
      });
    });

    it('should update partial availability', async () => {
      const data = { is_available_today: true };
      const mockUpdatedVendor = {
        id: 'vendorId',
        name: 'Vendor Name',
        phone: '+1234567890',
        email: 'vendor@example.com',
        address: '123 Main St',
        is_active: true,
        is_available_today: true,
        service_radius_m: 5000,
        delivery_time_msg: '30 mins',
      };

      mockPrismaService.vendor.update.mockResolvedValue(mockUpdatedVendor);

      const result = await service.updateAvailability('vendorId', data);

      expect(result).toEqual(mockUpdatedVendor);
      expect(mockPrismaService.vendor.update).toHaveBeenCalledWith({
        where: { id: 'vendorId' },
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          is_active: true,
          is_available_today: true,
          service_radius_m: true,
          delivery_time_msg: true,
        },
      });
    });
  });
});