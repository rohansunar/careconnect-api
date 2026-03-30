import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    try {
      if (!userId || userId.trim() === '') {
        throw new BadRequestException('User ID is required');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          wallet: {
            include: {
              transactions: {
                orderBy: {
                  createdAt: 'desc',
                },
                take: 10,
              },
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        wallet: user.wallet
          ? {
              id: user.wallet.id,
              balance: user.wallet.balance,
              currency: 'INR',
              recentTransactions: user.wallet.transactions.map((tx) => ({
                id: tx.id,
                amount: tx.amount,
                type: tx.type,
                status: tx.status,
                referenceId: tx.referenceId,
                referenceType: tx.referenceType,
                description: tx.description,
                createdAt: tx.createdAt,
                completedAt: tx.completedAt,
              })),
            }
          : null,
      };
    } catch (error) {
      this.logger.error(`Failed to get user profile: ${error.message}`);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to retrieve user profile. Please try again later.',
      );
    }
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
    },
  ) {
    try {
      if (!userId || userId.trim() === '') {
        throw new BadRequestException('User ID is required');
      }

      if (data.phone && !/^\+[1-9]\d{1,14}$/.test(data.phone)) {
        throw new BadRequestException('Invalid phone number format');
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      });

      return user;
    } catch (error) {
      this.logger.error(`Failed to update user profile: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw new BadRequestException(
        'Failed to update user profile. Please try again later.',
      );
    }
  }

  async deleteProfile(userId: string) {
    try {
      if (!userId || userId.trim() === '') {
        throw new BadRequestException('User ID is required');
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      if (!existingUser.is_active) {
        throw new BadRequestException('Account is already deactivated');
      }

      return {
        message: 'Profile deleted successfully',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to delete user profile: ${error.message}`);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw new BadRequestException(
        'Failed to delete profile. Please try again later.',
      );
    }
  }

  async validateUser(userId: string): Promise<void> {
    try {
      if (!userId || userId.trim() === '') {
        throw new BadRequestException('User ID is required');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
    } catch (error) {
      this.logger.error(`Failed to validate user: ${error.message}`);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to validate user. Please try again later.',
      );
    }
  }
}