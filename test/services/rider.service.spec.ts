import { Test, TestingModule } from '@nestjs/testing';
import { RiderService } from '../../src/rider/services/rider.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('RiderService', () => {
  let service: RiderService;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      rider: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiderService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RiderService>(RiderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRider', () => {
    it('should create rider successfully', async () => {
      const data = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        address: '123 Main St',
      };
      const mockCreatedRider = {
        id: 'riderId',
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        address: '123 Main St',
        created_at: new Date(),
      };

      mockPrismaService.rider.findUnique.mockResolvedValue(null);
      mockPrismaService.rider.create.mockResolvedValue(mockCreatedRider);

      const result = await service.createRider(data);

      expect(result).toEqual(mockCreatedRider);
      expect(mockPrismaService.rider.findUnique).toHaveBeenCalledWith({
        where: { phone: '+1234567890' },
      });
      expect(mockPrismaService.rider.create).toHaveBeenCalledWith({
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          created_at: true,
        },
      });
    });

    it('should throw BadRequestException if phone already exists', async () => {
      const data = {
        name: 'John Doe',
        phone: '+1234567890',
      };
      const existingRider = { id: 'existingId', phone: '+1234567890' };

      mockPrismaService.rider.findUnique.mockResolvedValue(existingRider);

      await expect(service.createRider(data)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.rider.findUnique).toHaveBeenCalledWith({
        where: { phone: '+1234567890' },
      });
      expect(mockPrismaService.rider.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid phone format', async () => {
      const data = {
        name: 'John Doe',
        phone: 'invalid-phone',
      };

      mockPrismaService.rider.findUnique.mockResolvedValue(null);

      await expect(service.createRider(data)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.rider.findUnique).toHaveBeenCalledWith({
        where: { phone: 'invalid-phone' },
      });
      expect(mockPrismaService.rider.create).not.toHaveBeenCalled();
    });

    it('should create rider with optional fields omitted', async () => {
      const data = {
        name: 'Jane Doe',
        phone: '+0987654321',
      };
      const mockCreatedRider = {
        id: 'riderId2',
        name: 'Jane Doe',
        phone: '+0987654321',
        email: null,
        address: null,
        created_at: new Date(),
      };

      mockPrismaService.rider.findUnique.mockResolvedValue(null);
      mockPrismaService.rider.create.mockResolvedValue(mockCreatedRider);

      const result = await service.createRider(data);

      expect(result).toEqual(mockCreatedRider);
      expect(mockPrismaService.rider.create).toHaveBeenCalledWith({
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          created_at: true,
        },
      });
    });
  });
});
