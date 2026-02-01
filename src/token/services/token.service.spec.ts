import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '../services/token.service';
import { PrismaService } from '../../common/database/prisma.service';
import { RegisterTokenDto, DeviceType } from '../dto/register-token.dto';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('TokenService', () => {
  let service: TokenService;
  let prisma: PrismaService;

  const mockPrisma = {
    deviceToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('registerToken', () => {
    const userId = 'user-123';
    const userType = 'CUSTOMER';
    const registerDto: RegisterTokenDto = {
      deviceToken: 'fcm_token_here',
      deviceId: 'device_abc123',
      deviceType: DeviceType.ANDROID,
      deviceName: 'My Samsung Phone',
    };

    it('should create a new token when no existing token', async () => {
      const createdToken = {
        id: 'token-id',
        user_id: userId,
        user_type: userType,
        device_token: registerDto.deviceToken,
        device_id: registerDto.deviceId,
        device_type: registerDto.deviceType,
        device_name: registerDto.deviceName,
        is_active: true,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(null);
      mockPrisma.deviceToken.create.mockResolvedValue(createdToken);

      const result = await service.registerToken(userId, userType, registerDto);

      expect(result).toEqual(createdToken);
      expect(mockPrisma.deviceToken.findUnique).toHaveBeenCalledWith({
        where: {
          user_id_device_id: {
            user_id: userId,
            device_id: registerDto.deviceId,
          },
        },
      });
      expect(mockPrisma.deviceToken.create).toHaveBeenCalledWith({
        data: {
          user_id: userId,
          user_type: userType,
          device_token: registerDto.deviceToken,
          device_id: registerDto.deviceId,
          device_type: registerDto.deviceType,
          device_name: registerDto.deviceName,
        },
      });
    });

    it('should update existing token when device_id matches', async () => {
      const existingToken = {
        id: 'existing-token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'old_token',
        device_id: registerDto.deviceId,
        device_type: DeviceType.ANDROID,
        is_active: true,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedToken = {
        ...existingToken,
        device_token: registerDto.deviceToken,
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(existingToken);
      mockPrisma.deviceToken.update.mockResolvedValue(updatedToken);

      const result = await service.registerToken(userId, userType, registerDto);

      expect(result).toEqual(updatedToken);
      expect(mockPrisma.deviceToken.update).toHaveBeenCalledWith({
        where: { id: existingToken.id },
        data: {
          device_token: registerDto.deviceToken,
          device_type: registerDto.deviceType,
          device_name: registerDto.deviceName,
          last_used_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      });
    });

    it('should throw ConflictException when token is revoked', async () => {
      const revokedToken = {
        id: 'revoked-token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'revoked_token',
        device_id: registerDto.deviceId,
        device_type: DeviceType.ANDROID,
        is_active: false,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(revokedToken);

      await expect(
        service.registerToken(userId, userType, registerDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('refreshToken', () => {
    const userId = 'user-123';
    const userType = 'CUSTOMER';
    const deviceId = 'device_abc123';

    it('should update last_used_at when token exists', async () => {
      const existingToken = {
        id: 'token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'fcm_token',
        device_id: deviceId,
        device_type: DeviceType.ANDROID,
        is_active: true,
        last_used_at: new Date('2026-01-01'),
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      };

      const updatedToken = {
        ...existingToken,
        last_used_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(existingToken);
      mockPrisma.deviceToken.update.mockResolvedValue(updatedToken);

      const result = await service.refreshToken(userId, userType, deviceId);

      expect(result.last_used_at).not.toEqual(existingToken.last_used_at);
      expect(mockPrisma.deviceToken.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when token not found', async () => {
      mockPrisma.deviceToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshToken(userId, userType, deviceId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token is inactive', async () => {
      const inactiveToken = {
        id: 'token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'fcm_token',
        device_id: deviceId,
        device_type: DeviceType.ANDROID,
        is_active: false,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(inactiveToken);

      await expect(
        service.refreshToken(userId, userType, deviceId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeToken', () => {
    const userId = 'user-123';
    const userType = 'CUSTOMER';
    const deviceId = 'device_abc123';

    it('should deactivate token when token exists and is active', async () => {
      const existingToken = {
        id: 'token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'fcm_token',
        device_id: deviceId,
        device_type: DeviceType.ANDROID,
        is_active: true,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(existingToken);
      mockPrisma.deviceToken.update.mockResolvedValue({
        ...existingToken,
        is_active: false,
      });

      const result = await service.revokeToken(userId, userType, deviceId);

      expect(result).toEqual({ message: 'Token revoked successfully' });
      expect(mockPrisma.deviceToken.update).toHaveBeenCalledWith({
        where: { id: existingToken.id },
        data: {
          is_active: false,
          updated_at: expect.any(Date),
        },
      });
    });

    it('should return already revoked message when token is inactive', async () => {
      const inactiveToken = {
        id: 'token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'fcm_token',
        device_id: deviceId,
        device_type: DeviceType.ANDROID,
        is_active: false,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(inactiveToken);

      const result = await service.revokeToken(userId, userType, deviceId);

      expect(result).toEqual({ message: 'Token already revoked' });
      expect(mockPrisma.deviceToken.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when token not found', async () => {
      mockPrisma.deviceToken.findUnique.mockResolvedValue(null);

      await expect(
        service.revokeToken(userId, userType, deviceId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserTokens', () => {
    const userId = 'user-123';
    const userType = 'CUSTOMER';

    it('should return all active tokens for a user', async () => {
      const tokens = [
        {
          id: 'token-1',
          user_id: userId,
          user_type: userType,
          device_token: 'token_1',
          device_id: 'device_1',
          device_type: DeviceType.ANDROID,
          is_active: true,
          last_used_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'token-2',
          user_id: userId,
          user_type: userType,
          device_token: 'token_2',
          device_id: 'device_2',
          device_type: DeviceType.IOS,
          is_active: true,
          last_used_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPrisma.deviceToken.findMany.mockResolvedValue(tokens);

      const result = await service.getUserTokens(userId, userType);

      expect(result).toEqual(tokens);
      expect(mockPrisma.deviceToken.findMany).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          user_type: userType,
          is_active: true,
        },
        orderBy: {
          last_used_at: 'desc',
        },
      });
    });

    it('should return empty array when no tokens exist', async () => {
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.getUserTokens(userId, userType);

      expect(result).toEqual([]);
    });
  });

  describe('getActiveTokens', () => {
    const userId = 'user-123';
    const userType = 'CUSTOMER';

    it('should return array of device tokens', async () => {
      const tokens = [
        { device_token: 'token_1' },
        { device_token: 'token_2' },
      ];

      mockPrisma.deviceToken.findMany.mockResolvedValue(tokens);

      const result = await service.getActiveTokens(userId, userType);

      expect(result).toEqual(['token_1', 'token_2']);
    });

    it('should return empty array when no tokens', async () => {
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.getActiveTokens(userId, userType);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // VENDOR User Type Tests
  // ============================================

  describe('registerToken - VENDOR', () => {
    const userId = 'vendor-123';
    const userType = 'VENDOR';
    const registerDto: RegisterTokenDto = {
      deviceToken: 'vendor_fcm_token',
      deviceId: 'vendor_device_abc123',
      deviceType: DeviceType.ANDROID,
      deviceName: 'Vendor Tablet',
    };

    it('should create a new token for VENDOR when no existing token', async () => {
      const createdToken = {
        id: 'vendor-token-id',
        user_id: userId,
        user_type: userType,
        device_token: registerDto.deviceToken,
        device_id: registerDto.deviceId,
        device_type: registerDto.deviceType,
        device_name: registerDto.deviceName,
        is_active: true,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(null);
      mockPrisma.deviceToken.create.mockResolvedValue(createdToken);

      const result = await service.registerToken(userId, userType, registerDto);

      expect(result).toEqual(createdToken);
      expect(mockPrisma.deviceToken.findUnique).toHaveBeenCalledWith({
        where: {
          user_id_device_id: {
            user_id: userId,
            device_id: registerDto.deviceId,
          },
        },
      });
      expect(mockPrisma.deviceToken.create).toHaveBeenCalledWith({
        data: {
          user_id: userId,
          user_type: userType,
          device_token: registerDto.deviceToken,
          device_id: registerDto.deviceId,
          device_type: registerDto.deviceType,
          device_name: registerDto.deviceName,
        },
      });
    });

    it('should update existing VENDOR token when device_id matches', async () => {
      const existingToken = {
        id: 'existing-vendor-token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'old_vendor_token',
        device_id: registerDto.deviceId,
        device_type: DeviceType.ANDROID,
        is_active: true,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedToken = {
        ...existingToken,
        device_token: registerDto.deviceToken,
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(existingToken);
      mockPrisma.deviceToken.update.mockResolvedValue(updatedToken);

      const result = await service.registerToken(userId, userType, registerDto);

      expect(result).toEqual(updatedToken);
      expect(mockPrisma.deviceToken.update).toHaveBeenCalledWith({
        where: { id: existingToken.id },
        data: {
          device_token: registerDto.deviceToken,
          device_type: registerDto.deviceType,
          device_name: registerDto.deviceName,
          last_used_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      });
    });
  });

  describe('refreshToken - VENDOR', () => {
    const userId = 'vendor-123';
    const userType = 'VENDOR';
    const deviceId = 'vendor_device_abc123';

    it('should update last_used_at when VENDOR token exists', async () => {
      const existingToken = {
        id: 'vendor-token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'vendor_fcm_token',
        device_id: deviceId,
        device_type: DeviceType.ANDROID,
        is_active: true,
        last_used_at: new Date('2026-01-01'),
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      };

      const updatedToken = {
        ...existingToken,
        last_used_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(existingToken);
      mockPrisma.deviceToken.update.mockResolvedValue(updatedToken);

      const result = await service.refreshToken(userId, userType, deviceId);

      expect(result.last_used_at).not.toEqual(existingToken.last_used_at);
      expect(mockPrisma.deviceToken.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when VENDOR token not found', async () => {
      mockPrisma.deviceToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshToken(userId, userType, deviceId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeToken - VENDOR', () => {
    const userId = 'vendor-123';
    const userType = 'VENDOR';
    const deviceId = 'vendor_device_abc123';

    it('should deactivate VENDOR token when token exists and is active', async () => {
      const existingToken = {
        id: 'vendor-token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'vendor_fcm_token',
        device_id: deviceId,
        device_type: DeviceType.ANDROID,
        is_active: true,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(existingToken);
      mockPrisma.deviceToken.update.mockResolvedValue({
        ...existingToken,
        is_active: false,
      });

      const result = await service.revokeToken(userId, userType, deviceId);

      expect(result).toEqual({ message: 'Token revoked successfully' });
      expect(mockPrisma.deviceToken.update).toHaveBeenCalledWith({
        where: { id: existingToken.id },
        data: {
          is_active: false,
          updated_at: expect.any(Date),
        },
      });
    });

    it('should return already revoked message when VENDOR token is inactive', async () => {
      const inactiveToken = {
        id: 'vendor-token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'vendor_fcm_token',
        device_id: deviceId,
        device_type: DeviceType.ANDROID,
        is_active: false,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(inactiveToken);

      const result = await service.revokeToken(userId, userType, deviceId);

      expect(result).toEqual({ message: 'Token already revoked' });
      expect(mockPrisma.deviceToken.update).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // RIDER User Type Tests
  // ============================================

  describe('registerToken - RIDER', () => {
    const userId = 'rider-123';
    const userType = 'RIDER';
    const registerDto: RegisterTokenDto = {
      deviceToken: 'rider_fcm_token',
      deviceId: 'rider_device_abc123',
      deviceType: DeviceType.IOS,
      deviceName: 'Rider iPhone',
    };

    it('should create a new token for RIDER when no existing token', async () => {
      const createdToken = {
        id: 'rider-token-id',
        user_id: userId,
        user_type: userType,
        device_token: registerDto.deviceToken,
        device_id: registerDto.deviceId,
        device_type: registerDto.deviceType,
        device_name: registerDto.deviceName,
        is_active: true,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(null);
      mockPrisma.deviceToken.create.mockResolvedValue(createdToken);

      const result = await service.registerToken(userId, userType, registerDto);

      expect(result).toEqual(createdToken);
      expect(mockPrisma.deviceToken.findUnique).toHaveBeenCalledWith({
        where: {
          user_id_device_id: {
            user_id: userId,
            device_id: registerDto.deviceId,
          },
        },
      });
      expect(mockPrisma.deviceToken.create).toHaveBeenCalledWith({
        data: {
          user_id: userId,
          user_type: userType,
          device_token: registerDto.deviceToken,
          device_id: registerDto.deviceId,
          device_type: registerDto.deviceType,
          device_name: registerDto.deviceName,
        },
      });
    });

    it('should update existing RIDER token when device_id matches', async () => {
      const existingToken = {
        id: 'existing-rider-token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'old_rider_token',
        device_id: registerDto.deviceId,
        device_type: DeviceType.IOS,
        is_active: true,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedToken = {
        ...existingToken,
        device_token: registerDto.deviceToken,
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(existingToken);
      mockPrisma.deviceToken.update.mockResolvedValue(updatedToken);

      const result = await service.registerToken(userId, userType, registerDto);

      expect(result).toEqual(updatedToken);
      expect(mockPrisma.deviceToken.update).toHaveBeenCalledWith({
        where: { id: existingToken.id },
        data: {
          device_token: registerDto.deviceToken,
          device_type: registerDto.deviceType,
          device_name: registerDto.deviceName,
          last_used_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      });
    });

    it('should throw ConflictException when RIDER token is revoked', async () => {
      const revokedToken = {
        id: 'revoked-rider-token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'revoked_rider_token',
        device_id: registerDto.deviceId,
        device_type: DeviceType.IOS,
        is_active: false,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(revokedToken);

      await expect(
        service.registerToken(userId, userType, registerDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('refreshToken - RIDER', () => {
    const userId = 'rider-123';
    const userType = 'RIDER';
    const deviceId = 'rider_device_abc123';

    it('should update last_used_at when RIDER token exists', async () => {
      const existingToken = {
        id: 'rider-token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'rider_fcm_token',
        device_id: deviceId,
        device_type: DeviceType.IOS,
        is_active: true,
        last_used_at: new Date('2026-01-01'),
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      };

      const updatedToken = {
        ...existingToken,
        last_used_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(existingToken);
      mockPrisma.deviceToken.update.mockResolvedValue(updatedToken);

      const result = await service.refreshToken(userId, userType, deviceId);

      expect(result.last_used_at).not.toEqual(existingToken.last_used_at);
      expect(mockPrisma.deviceToken.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when RIDER token is inactive', async () => {
      const inactiveToken = {
        id: 'rider-token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'rider_fcm_token',
        device_id: deviceId,
        device_type: DeviceType.IOS,
        is_active: false,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(inactiveToken);

      await expect(
        service.refreshToken(userId, userType, deviceId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeToken - RIDER', () => {
    const userId = 'rider-123';
    const userType = 'RIDER';
    const deviceId = 'rider_device_abc123';

    it('should deactivate RIDER token when token exists and is active', async () => {
      const existingToken = {
        id: 'rider-token-id',
        user_id: userId,
        user_type: userType,
        device_token: 'rider_fcm_token',
        device_id: deviceId,
        device_type: DeviceType.IOS,
        is_active: true,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(existingToken);
      mockPrisma.deviceToken.update.mockResolvedValue({
        ...existingToken,
        is_active: false,
      });

      const result = await service.revokeToken(userId, userType, deviceId);

      expect(result).toEqual({ message: 'Token revoked successfully' });
      expect(mockPrisma.deviceToken.update).toHaveBeenCalledWith({
        where: { id: existingToken.id },
        data: {
          is_active: false,
          updated_at: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException when RIDER token not found', async () => {
      mockPrisma.deviceToken.findUnique.mockResolvedValue(null);

      await expect(
        service.revokeToken(userId, userType, deviceId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
