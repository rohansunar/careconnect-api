import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from '../../src/user/services/user.service';

describe('UserService', () => {
  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: UserService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new UserService(prisma as any);
  });

  describe('toggleIsProvider', () => {
    it('successfully updates is_provider to true', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1', is_provider: false });
      prisma.user.update.mockResolvedValue({ id: 'user_1', is_provider: true });

      const result = await service.toggleIsProvider({
        userId: 'user_1',
        isProvider: true,
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_1' },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { is_provider: true },
      });
      expect(result).toEqual({
        success: true,
        message: 'Provider status updated successfully',
      });
    });

    it('successfully updates is_provider to false', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1', is_provider: true });
      prisma.user.update.mockResolvedValue({ id: 'user_1', is_provider: false });

      const result = await service.toggleIsProvider({
        userId: 'user_1',
        isProvider: false,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { is_provider: false },
      });
      expect(result).toEqual({
        success: true,
        message: 'Provider status updated successfully',
      });
    });

    it('throws BadRequestException when userId is empty', async () => {
      await expect(
        service.toggleIsProvider({ userId: '', isProvider: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when userId is whitespace only', async () => {
      await expect(
        service.toggleIsProvider({ userId: '   ', isProvider: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleIsProvider({ userId: 'nonexistent', isProvider: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns success message on successful update', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1', is_provider: false });
      prisma.user.update.mockResolvedValue({ id: 'user_1', is_provider: true });

      const result = await service.toggleIsProvider({
        userId: 'user_1',
        isProvider: true,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Provider status updated successfully');
    });
  });
});
