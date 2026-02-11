import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateBankAccountDto } from '../dto/create-bank-account.dto';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';
import { BankAccountResponseDto } from '../dto/bank-account-response.dto';
import { BankAccountInterface } from '../interfaces/bankAccount';

@Injectable()
export class VendorBankAccountService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves all bank accounts for a specific vendor with ownership validation
   * @param vendorId - The unique identifier of the vendor
   * @returns Array of bank account response DTOs
   * @throws {NotFoundException} If vendor is not found
   */
  async getBankAccounts(
    vendorId: string,
  ): Promise<BankAccountResponseDto | []> {
    // Validate that vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Get all bank accounts for this vendor
    const bankAccounts = await this.prisma.bankAccount.findFirst({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });

    if (!bankAccounts) {
      return [];
    }

    // Transform raw Prisma object to DTO
    const responseDto: BankAccountResponseDto = {
      id: bankAccounts.id,
      vendorId: bankAccounts.vendorId,
      accountNumber: bankAccounts.accountNumber,
      ifscCode: bankAccounts.ifscCode,
      bankName: bankAccounts.bankName,
      accountHolderName: bankAccounts.accountHolderName,
      upiId: bankAccounts.upiId || '',
      isDefault: bankAccounts.isDefault,
      isVerified: bankAccounts.isVerified,
      createdAt: bankAccounts.createdAt,
      updatedAt: bankAccounts.updatedAt,
    };

    return responseDto;
  }

  /**
   * Creates a new bank account for a vendor with validation
   * @param vendorId - The unique identifier of the vendor
   * @param createBankAccountDto - DTO containing bank account creation data
   * @returns Created bank account response DTO
   * @throws {NotFoundException} If vendor is not found
   * @throws {BadRequestException} If validation fails
   */
  async createBankAccount(
    vendorId: string,
    createBankAccountDto: CreateBankAccountDto,
  ): Promise<{ success: boolean }> {
    // Validate that vendor exists
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
      });

      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }

      // Handle default account logic
      if (createBankAccountDto.isDefault) {
        // If this is set as default, unset default from other accounts
        await this.prisma.bankAccount.updateMany({
          where: {
            vendorId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Create the new bank account
      await this.prisma.bankAccount.create({
        data: {
          vendorId,
          accountNumber: createBankAccountDto.accountNumber,
          ifscCode: createBankAccountDto.ifscCode,
          bankName: createBankAccountDto.bankName,
          accountHolderName: createBankAccountDto.accountHolderName,
          upiId: createBankAccountDto.upiId,
          isDefault: createBankAccountDto.isDefault || true,
          isVerified: false, // New accounts start as unverified
        },
      });

      return { success: true };
    } catch (error) {
      throw new BadRequestException('Something with Server.Please try Later');
    }
  }

  /**
   * Updates an existing bank account with ownership validation
   * @param vendorId - The unique identifier of the vendor
   * @param bankAccountId - The unique identifier of the bank account
   * @param updateBankAccountDto - DTO containing bank account update data
   * @returns Updated bank account response DTO
   * @throws {NotFoundException} If vendor or bank account is not found
   * @throws {ForbiddenException} If vendor doesn't own the bank account
   * @throws {BadRequestException} If validation fails
   */
  async updateBankAccount(
    vendorId: string,
    bankAccountId: string,
    updateBankAccountDto: UpdateBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    // Validate that vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Validate that bank account exists and belongs to this vendor
    const existingAccount = await this.prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!existingAccount) {
      throw new NotFoundException('Bank account not found');
    }

    if (existingAccount.vendorId !== vendorId) {
      throw new ForbiddenException(
        'You can only update your own bank accounts',
      );
    }

    // Handle default account logic
    if (
      updateBankAccountDto.isDefault !== undefined &&
      updateBankAccountDto.isDefault
    ) {
      // If this is set as default, unset default from other accounts
      await this.prisma.bankAccount.updateMany({
        where: {
          vendorId,
          isDefault: true,
          id: { not: bankAccountId },
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Update the bank account
    const updatedAccount = await this.prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: {
        accountNumber: updateBankAccountDto.accountNumber,
        ifscCode: updateBankAccountDto.ifscCode,
        bankName: updateBankAccountDto.bankName,
        accountHolderName: updateBankAccountDto.accountHolderName,
        upiId: updateBankAccountDto.upiId,
        isDefault: updateBankAccountDto.isDefault,
      },
    });

    return {
      id: updatedAccount.id,
      vendorId: updatedAccount.vendorId,
      accountNumber: updatedAccount.accountNumber,
      ifscCode: updatedAccount.ifscCode,
      bankName: updatedAccount.bankName,
      accountHolderName: updatedAccount.accountHolderName,
      upiId: updatedAccount.upiId || '',
      isDefault: updatedAccount.isDefault,
      isVerified: updatedAccount.isVerified,
      createdAt: updatedAccount.createdAt,
      updatedAt: updatedAccount.updatedAt,
    };
  }

  /**
   * Deletes a bank account with ownership validation
   * @param vendorId - The unique identifier of the vendor
   * @param bankAccountId - The unique identifier of the bank account
   * @returns Deleted bank account response DTO
   * @throws {NotFoundException} If vendor or bank account is not found
   * @throws {ForbiddenException} If vendor doesn't own the bank account
   * @throws {BadRequestException} If trying to delete the only bank account or default account
   */
  async deleteBankAccount(
    vendorId: string,
    bankAccountId: string,
  ): Promise<BankAccountResponseDto> {
    // Validate that vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Validate that bank account exists and belongs to this vendor
    const existingAccount = await this.prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!existingAccount) {
      throw new NotFoundException('Bank account not found');
    }

    if (existingAccount.vendorId !== vendorId) {
      throw new ForbiddenException(
        'You can only delete your own bank accounts',
      );
    }

    // Prevent deletion of default account if it's the only one
    if (existingAccount.isDefault) {
      const otherAccounts = await this.prisma.bankAccount.count({
        where: {
          vendorId,
          id: { not: bankAccountId },
        },
      });

      if (otherAccounts === 0) {
        throw new BadRequestException(
          'Cannot delete the only bank account. Add another account first.',
        );
      }
    }

    // Delete the bank account
    const deletedAccount = await this.prisma.bankAccount.delete({
      where: { id: bankAccountId },
    });

    // If this was the default account, set another account as default
    if (deletedAccount.isDefault) {
      const remainingAccounts = await this.prisma.bankAccount.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'asc' },
        take: 1,
      });

      if (remainingAccounts.length > 0) {
        await this.prisma.bankAccount.update({
          where: { id: remainingAccounts[0].id },
          data: { isDefault: true },
        });
      }
    }

    return {
      id: deletedAccount.id,
      vendorId: deletedAccount.vendorId,
      accountNumber: deletedAccount.accountNumber,
      ifscCode: deletedAccount.ifscCode,
      bankName: deletedAccount.bankName,
      accountHolderName: deletedAccount.accountHolderName,
      upiId: deletedAccount.upiId || '',
      isDefault: deletedAccount.isDefault,
      isVerified: deletedAccount.isVerified,
      createdAt: deletedAccount.createdAt,
      updatedAt: deletedAccount.updatedAt,
    };
  }

  /**
   * Validates bank account ownership
   * @param vendorId - The vendor ID to check ownership
   * @param bankAccountId - The bank account ID to validate
   * @throws {ForbiddenException} If vendor doesn't own the bank account
   */
  private async validateBankAccountOwnership(
    vendorId: string,
    bankAccountId: string,
  ): Promise<void> {
    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      select: { vendorId: true },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    if (bankAccount.vendorId !== vendorId) {
      throw new ForbiddenException(
        'You can only access your own bank accounts',
      );
    }
  }
}
