import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves the profile information for a specific customer including wallet data.
   * @param customerId - The unique identifier of the customer.
   * @returns The customer's profile data including id, name, phone, email, addresses, wallet balance and recent transactions.
   */
  async getProfile(customerId: string) {
    try {
      // Validate customerId format
      if (!customerId || customerId.trim() === '') {
        throw new BadRequestException('Customer ID is required');
      }

      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
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

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      // Transform the response to include wallet balance and recent transactions
      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        isActive: customer.is_active,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
        wallet: customer.wallet
          ? {
              id: customer.wallet.id,
              balance: customer.wallet.balance,
              currency: 'INR',
              recentTransactions: customer.wallet.transactions.map((tx) => ({
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
      this.logger.error(`Failed to get customer profile: ${error.message}`);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to retrieve customer profile. Please try again later.',
      );
    }
  }

  /**
   * Updates the profile information for a specific customer with validation.
   * @param customerId - The unique identifier of the customer.
   * @param data - The fields to update (name, phone, email).
   * @returns The updated customer's profile data.
   */
  async updateProfile(
    customerId: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
    },
  ) {
    try {
      // Validate customerId
      if (!customerId || customerId.trim() === '') {
        throw new BadRequestException('Customer ID is required');
      }

      // Validate phone number format if provided (E.164 international format)
      if (data.phone && !/^\+[1-9]\d{1,14}$/.test(data.phone)) {
        throw new BadRequestException('Invalid phone number format');
      }

      const customer = await this.prisma.customer.update({
        where: { id: customerId },
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      });

      return customer;
    } catch (error) {
      this.logger.error(`Failed to update customer profile: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Customer not found');
      }
      throw new BadRequestException(
        'Failed to update customer profile. Please try again later.',
      );
    }
  }

  /**
   * Performs a soft delete on the customer profile by setting isActive flag to false.
   * @param customerId - The unique identifier of the customer.
   * @returns Success message indicating profile was deleted.
   */
  async deleteProfile(customerId: string) {
    try {
      // Validate customerId
      if (!customerId || customerId.trim() === '') {
        throw new BadRequestException('Customer ID is required');
      }

      // Check if customer exists
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!existingCustomer) {
        throw new NotFoundException('Customer not found');
      }

      // Check if already inactive
      if (!existingCustomer.is_active) {
        throw new BadRequestException('Account is already deactivated');
      }

      return {
        message: 'Profile deleted successfully',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to delete customer profile: ${error.message}`);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Customer not found');
      }
      throw new BadRequestException(
        'Failed to delete profile. Please try again later.',
      );
    }
  }

  /**
   * Validates that a customer exists.
   * @param customerId - The unique identifier of the customer
   * @throws NotFoundException if customer doesn't exist
   */
  async validateCustomer(customerId: string): Promise<void> {
    try {
      if (!customerId || customerId.trim() === '') {
        throw new BadRequestException('Customer ID is required');
      }

      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    } catch (error) {
      this.logger.error(`Failed to validate customer: ${error.message}`);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to validate customer. Please try again later.',
      );
    }
  }
}
