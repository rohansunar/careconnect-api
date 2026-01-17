import { Test, TestingModule } from '@nestjs/testing';
import { VendorService } from '../../../src/vendor/services/vendor.service';
import { PrismaService } from '../../../src/common/database/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('VendorService', () => {
  let service: VendorService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorService,
        {
          provide: PrismaService,
          useValue: {
            vendor: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            vendorAddress: {
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<VendorService>(VendorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return vendor profile', async () => {
      const mockVendor = {
        id: '123',
        name: 'Test Vendor',
        phone: '+1234567890',
        email: 'test@example.com',
        address: {
          id: 'addressId',
          vendorId: '123',
          service_radius_m: 5000,
          cityId: 'cityId',
          state: 'State',
          lng: 12.34,
          lat: 56.78,
          pincode: '123456',
          address: 'Test Address',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        is_active: true,
        is_available_today: true,
        service_radius_m: 5000,
      };
      jest
        .spyOn(prisma.vendor, 'findUnique')
        .mockResolvedValue(mockVendor as any);

      const result = await service.getProfile('123');

      expect(result).toEqual(mockVendor);
      expect(result.address.lng).toBe(12.34);
      expect(result.address.lat).toBe(56.78);
      expect(prisma.vendor.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        include: {
          address: true,
        },
      });
    });

    it('should throw BadRequestException if vendor not found', async () => {
      jest.spyOn(prisma.vendor, 'findUnique').mockResolvedValue(null);

      await expect(service.getProfile('123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update vendor profile', async () => {
      const dto = { name: 'Updated Name', phone: '+1234567890' };
      const mockUpdated = {
        id: '123',
        name: 'Updated Name',
        phone: '+1234567890',
        address: null,
      };
      jest.spyOn(prisma.vendor, 'update').mockResolvedValue(mockUpdated as any);

      const result = await service.updateProfile('123', dto);

      expect(result).toEqual(mockUpdated);
      expect(prisma.vendor.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: dto,
        include: {
          address: true,
        },
      });
    });

    it('should validate phone E.164', async () => {
      const dto = { phone: 'invalid' };

      await expect(service.updateProfile('123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateAvailability', () => {
    it('should update availability', async () => {
      const dto = { is_active: false, is_available_today: true };
      const mockUpdated = {
        id: '123',
        is_active: false,
        is_available_today: true,
        address: null,
      };
      jest.spyOn(prisma.vendor, 'update').mockResolvedValue(mockUpdated as any);

      const result = await service.updateAvailability('123', dto);

      expect(result).toEqual(mockUpdated);
      expect(prisma.vendor.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { is_active: false, is_available_today: true },
        include: {
          address: true,
        },
      });
    });

    it('should update only is_active if is_available_today not provided', async () => {
      const dto = { is_active: true };
      const mockUpdated = {
        id: '123',
        is_active: true,
        address: null,
      };
      jest.spyOn(prisma.vendor, 'update').mockResolvedValue(mockUpdated as any);

      const result = await service.updateAvailability('123', dto);

      expect(result).toEqual(mockUpdated);
      expect(prisma.vendor.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { is_active: true },
        include: {
          address: true,
        },
      });
    });
  });
});
