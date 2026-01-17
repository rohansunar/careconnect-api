import { Test, TestingModule } from '@nestjs/testing';
import { VendorController } from '../../../src/vendor/controllers/vendor.controller';
import { VendorService } from '../../../src/vendor/services/vendor.service';
import { UpdateProfileDto } from '../../../src/vendor/dto/update-profile.dto';
import { UpdateAvailabilityDto } from '../../../src/vendor/dto/update-availability.dto';

describe('VendorController', () => {
  let controller: VendorController;
  let service: VendorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorController],
      providers: [
        {
          provide: VendorService,
          useValue: {
            getProfile: jest.fn(),
            updateProfile: jest.fn(),
            updateAvailability: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VendorController>(VendorController);
    service = module.get<VendorService>(VendorService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return vendor profile', async () => {
      const mockReq = { user: { id: '123' } };
      const mockVendor = { id: '123' };
      const mockProfile = {
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
      jest.spyOn(service, 'getProfile').mockResolvedValue(mockProfile as any);

      const result = await controller.getProfile(mockVendor);

      expect(result).toEqual(mockProfile);
      expect(result.address.lng).toBe(12.34);
      expect(result.address.lat).toBe(56.78);
      expect(service.getProfile).toHaveBeenCalledWith('123');
    });
  });

  describe('updateProfile', () => {
    it('should update vendor profile', async () => {
      const mockVendor = { id: '123' };
      const dto: UpdateProfileDto = { name: 'Updated Name' };
      const mockUpdated = { id: '123', name: 'Updated Name' };
      jest
        .spyOn(service, 'updateProfile')
        .mockResolvedValue(mockUpdated as any);

      const result = await controller.updateProfile(mockVendor, dto);

      expect(result).toEqual(mockUpdated);
      expect(service.updateProfile).toHaveBeenCalledWith('123', dto);
    });
  });

  describe('updateAvailability', () => {
    it('should update vendor availability', async () => {
      const mockVendor = { id: '123' };
      const dto: UpdateAvailabilityDto = { is_active: false };
      const mockUpdated = { id: '123', is_active: false };
      jest
        .spyOn(service, 'updateAvailability')
        .mockResolvedValue(mockUpdated as any);

      const result = await controller.updateAvailability(mockVendor, dto);

      expect(result).toEqual(mockUpdated);
      expect(service.updateAvailability).toHaveBeenCalledWith('123', dto);
    });
  });
});
