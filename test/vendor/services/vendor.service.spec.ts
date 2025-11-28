import { Test, TestingModule } from '@nestjs/testing';
import { VendorService } from '../../../src/app/vendor/vendor.service';
import { PrismaService } from '../../../../prisma/prisma.service';
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

  describe('getVendorProfile', () => {
    it('should return vendor profile', async () => {
      const mockVendor = {
        id: '123',
        name: 'Test Vendor',
        phone: '+1234567890',
        email: 'test@example.com',
        address: 'Test Address',
        is_active: true,
        is_available_today: true,
        service_radius_m: 5000,
        delivery_time_msg: '30 mins',
      };
      jest.spyOn(prisma.vendor, 'findUnique').mockResolvedValue(mockVendor as any);

      const result = await service.getVendorProfile('123');

      expect(result).toEqual(mockVendor);
      expect(prisma.vendor.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
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
      jest.spyOn(prisma.vendor, 'findUnique').mockResolvedValue(null);

      await expect(service.getVendorProfile('123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateVendorProfile', () => {
    it('should update vendor profile', async () => {
      const dto = { name: 'Updated Name', phone: '+1234567890' };
      const mockUpdated = { id: '123', name: 'Updated Name', phone: '+1234567890' };
      jest.spyOn(prisma.vendor, 'update').mockResolvedValue(mockUpdated as any);

      const result = await service.updateVendorProfile('123', dto);

      expect(result).toEqual(mockUpdated);
      expect(prisma.vendor.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: dto,
        select: expect.any(Object),
      });
    });

    it('should validate phone E.164', async () => {
      const dto = { phone: 'invalid' };

      await expect(service.updateVendorProfile('123', dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateAvailability', () => {
    it('should update availability', async () => {
      const dto = { is_active: false, is_available_today: true };
      const mockUpdated = { id: '123', is_active: false, is_available_today: true };
      jest.spyOn(prisma.vendor, 'update').mockResolvedValue(mockUpdated as any);

      const result = await service.updateAvailability('123', dto);

      expect(result).toEqual(mockUpdated);
      expect(prisma.vendor.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { is_active: false, is_available_today: true },
        select: expect.any(Object),
      });
    });

    it('should update only is_active if is_available_today not provided', async () => {
      const dto = { is_active: true };
      jest.spyOn(prisma.vendor, 'update').mockResolvedValue({} as any);

      await service.updateAvailability('123', dto);

      expect(prisma.vendor.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { is_active: true },
        select: expect.any(Object),
      });
    });
  });
});