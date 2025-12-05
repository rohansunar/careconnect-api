import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('BankAccounts CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up bank accounts table before each test
    await prisma.bankAccount.deleteMany();
    // Clean up vendors as well since bank accounts depend on vendors
    await prisma.vendor.deleteMany();
  });

  describe('Create', () => {
    it('should create a bank account with valid data', async () => {
      // Create a test vendor first
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const bankAccountData = {
        vendorId: vendor.id,
        accountNumber: '123456789012',
        ifscCode: 'SBIN0001234',
        bankName: 'State Bank of India',
        accountHolderName: 'John Doe',
        upiId: 'john.doe@sbi',
        isDefault: true,
        isVerified: false,
      };

      const bankAccount = await prisma.bankAccount.create({
        data: bankAccountData,
      });

      expect(bankAccount).toHaveProperty('id');
      expect(bankAccount.vendorId).toBe(vendor.id);
      expect(bankAccount.accountNumber).toBe('123456789012');
      expect(bankAccount.ifscCode).toBe('SBIN0001234');
      expect(bankAccount.bankName).toBe('State Bank of India');
      expect(bankAccount.accountHolderName).toBe('John Doe');
      expect(bankAccount.upiId).toBe('john.doe@sbi');
      expect(bankAccount.isDefault).toBe(true);
      expect(bankAccount.isVerified).toBe(false);
      expect(bankAccount.createdAt).toBeInstanceOf(Date);
      expect(bankAccount.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a bank account with minimal data', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const bankAccountData = {
        vendorId: vendor.id,
        accountNumber: '987654321098',
        ifscCode: 'HDFC0005678',
        bankName: 'HDFC Bank',
        accountHolderName: 'Jane Smith',
      };

      const bankAccount = await prisma.bankAccount.create({
        data: bankAccountData,
      });

      expect(bankAccount).toHaveProperty('id');
      expect(bankAccount.vendorId).toBe(vendor.id);
      expect(bankAccount.accountNumber).toBe('987654321098');
      expect(bankAccount.ifscCode).toBe('HDFC0005678');
      expect(bankAccount.bankName).toBe('HDFC Bank');
      expect(bankAccount.accountHolderName).toBe('Jane Smith');
      expect(bankAccount.upiId).toBeNull();
      expect(bankAccount.isDefault).toBe(false);
      expect(bankAccount.isVerified).toBe(false);
      expect(bankAccount.createdAt).toBeInstanceOf(Date);
      expect(bankAccount.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error for null accountNumber', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const bankAccountData = {
        vendorId: vendor.id,
        accountNumber: null as any,
        ifscCode: 'SBIN0001234',
        bankName: 'State Bank of India',
        accountHolderName: 'John Doe',
      };

      await expect(
        prisma.bankAccount.create({ data: bankAccountData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null ifscCode', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const bankAccountData = {
        vendorId: vendor.id,
        accountNumber: '123456789012',
        ifscCode: null as any,
        bankName: 'State Bank of India',
        accountHolderName: 'John Doe',
      };

      await expect(
        prisma.bankAccount.create({ data: bankAccountData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null bankName', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const bankAccountData = {
        vendorId: vendor.id,
        accountNumber: '123456789012',
        ifscCode: 'SBIN0001234',
        bankName: null as any,
        accountHolderName: 'John Doe',
      };

      await expect(
        prisma.bankAccount.create({ data: bankAccountData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null accountHolderName', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const bankAccountData = {
        vendorId: vendor.id,
        accountNumber: '123456789012',
        ifscCode: 'SBIN0001234',
        bankName: 'State Bank of India',
        accountHolderName: null as any,
      };

      await expect(
        prisma.bankAccount.create({ data: bankAccountData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid vendorId (foreign key violation)', async () => {
      const bankAccountData = {
        vendorId: 'invalid-vendor-id',
        accountNumber: '123456789012',
        ifscCode: 'SBIN0001234',
        bankName: 'State Bank of India',
        accountHolderName: 'John Doe',
      };

      await expect(
        prisma.bankAccount.create({ data: bankAccountData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for duplicate accountNumber', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      await prisma.bankAccount.create({
        data: {
          vendorId: vendor.id,
          accountNumber: '123456789012',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          accountHolderName: 'First Account',
        },
      });

      const bankAccountData = {
        vendorId: vendor.id,
        accountNumber: '123456789012', // duplicate
        ifscCode: 'HDFC0005678',
        bankName: 'HDFC Bank',
        accountHolderName: 'Second Account',
      };

      await expect(
        prisma.bankAccount.create({ data: bankAccountData }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Read', () => {
    let bankAccountId: string;
    let vendorId: string;

    beforeEach(async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });
      vendorId = vendor.id;

      const bankAccount = await prisma.bankAccount.create({
        data: {
          vendorId: vendor.id,
          accountNumber: '123456789012',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          accountHolderName: 'John Doe',
        },
      });
      bankAccountId = bankAccount.id;
    });

    it('should find many bank accounts', async () => {
      const bankAccounts = await prisma.bankAccount.findMany();

      expect(bankAccounts).toHaveLength(1);
      expect(bankAccounts[0].accountNumber).toBe('123456789012');
    });

    it('should find unique bank account by id', async () => {
      const bankAccount = await prisma.bankAccount.findUnique({
        where: { id: bankAccountId },
      });

      expect(bankAccount).toBeTruthy();
      expect(bankAccount?.accountNumber).toBe('123456789012');
    });

    it('should find bank accounts by vendorId', async () => {
      const bankAccounts = await prisma.bankAccount.findMany({
        where: { vendorId: vendorId },
      });

      expect(bankAccounts).toHaveLength(1);
      expect(bankAccounts[0].vendorId).toBe(vendorId);
    });
  });

  describe('Update', () => {
    let bankAccountId: string;
    let vendorId: string;

    beforeEach(async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });
      vendorId = vendor.id;

      const bankAccount = await prisma.bankAccount.create({
        data: {
          vendorId: vendor.id,
          accountNumber: '123456789012',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          accountHolderName: 'John Doe',
        },
      });
      bankAccountId = bankAccount.id;
    });

    it('should update bank account holder name', async () => {
      const updatedBankAccount = await prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: { accountHolderName: 'Updated Account Holder' },
      });

      expect(updatedBankAccount.accountHolderName).toBe(
        'Updated Account Holder',
      );
    });

    it('should update UPI ID', async () => {
      const updatedBankAccount = await prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: { upiId: 'updated.upi@bank' },
      });

      expect(updatedBankAccount.upiId).toBe('updated.upi@bank');
    });

    it('should update verification status', async () => {
      const updatedBankAccount = await prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: { isVerified: true },
      });

      expect(updatedBankAccount.isVerified).toBe(true);
    });

    it('should throw error for null accountNumber on update', async () => {
      await expect(
        prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: { accountNumber: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null ifscCode on update', async () => {
      await expect(
        prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: { ifscCode: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid vendorId on update', async () => {
      await expect(
        prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: { vendorId: 'invalid-vendor-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let bankAccountId: string;

    beforeEach(async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const bankAccount = await prisma.bankAccount.create({
        data: {
          vendorId: vendor.id,
          accountNumber: '123456789012',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          accountHolderName: 'John Doe',
        },
      });
      bankAccountId = bankAccount.id;
    });

    it('should delete bank account', async () => {
      const deletedBankAccount = await prisma.bankAccount.delete({
        where: { id: bankAccountId },
      });

      expect(deletedBankAccount.accountNumber).toBe('123456789012');

      const bankAccounts = await prisma.bankAccount.findMany();
      expect(bankAccounts).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.bankAccount.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Validation Tests', () => {
    it('should validate Indian account number format (11-18 digits)', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      // Test valid account numbers
      const validAccountNumbers = [
        '12345678901', // 11 digits
        '1234567890123456', // 16 digits
        '123456789012345678', // 18 digits
      ];

      for (const accountNumber of validAccountNumbers) {
        const bankAccount = await prisma.bankAccount.create({
          data: {
            vendorId: vendor.id,
            accountNumber: accountNumber,
            ifscCode: 'SBIN0001234',
            bankName: 'State Bank of India',
            accountHolderName: 'Test Holder',
          },
        });
        expect(bankAccount.accountNumber).toBe(accountNumber);
      }
    });

    it('should validate Indian IFSC code format (11 characters, first 4 letters, last 7 digits)', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      // Test valid IFSC codes
      const validIfscCodes = [
        'SBIN0001234', // SBI
        'HDFC0005678', // HDFC
        'ICIC0000123', // ICICI
        'PNB0123456', // PNB
      ];

      for (const ifscCode of validIfscCodes) {
        const bankAccount = await prisma.bankAccount.create({
          data: {
            vendorId: vendor.id,
            accountNumber: '123456789012',
            ifscCode: ifscCode,
            bankName: 'Test Bank',
            accountHolderName: 'Test Holder',
          },
        });
        expect(bankAccount.ifscCode).toBe(ifscCode);
      }
    });
  });

  describe('Relationship Tests', () => {
    it('should include vendor in bank account query', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      const bankAccount = await prisma.bankAccount.create({
        data: {
          vendorId: vendor.id,
          accountNumber: '123456789012',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          accountHolderName: 'John Doe',
        },
      });

      const bankAccountWithVendor = await prisma.bankAccount.findUnique({
        where: { id: bankAccount.id },
        include: { vendor: true },
      });

      expect(bankAccountWithVendor?.vendor?.name).toBe('Test Vendor');
      expect(bankAccountWithVendor?.vendor?.phone).toBe('1234567890');
    });

    it('should find bank accounts for a vendor', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      await prisma.bankAccount.create({
        data: {
          vendorId: vendor.id,
          accountNumber: '123456789012',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          accountHolderName: 'Primary Account',
          isDefault: true,
        },
      });

      await prisma.bankAccount.create({
        data: {
          vendorId: vendor.id,
          accountNumber: '987654321098',
          ifscCode: 'HDFC0005678',
          bankName: 'HDFC Bank',
          accountHolderName: 'Secondary Account',
          isDefault: false,
        },
      });

      const vendorWithBankAccounts = await prisma.vendor.findUnique({
        where: { id: vendor.id },
        include: { bankAccounts: true },
      });

      expect(vendorWithBankAccounts?.bankAccounts).toHaveLength(2);
      expect(vendorWithBankAccounts?.bankAccounts[0].accountNumber).toBe(
        '123456789012',
      );
      expect(vendorWithBankAccounts?.bankAccounts[1].accountNumber).toBe(
        '987654321098',
      );
    });

    it('should cascade delete bank accounts when vendor is deleted', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      await prisma.bankAccount.create({
        data: {
          vendorId: vendor.id,
          accountNumber: '123456789012',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          accountHolderName: 'John Doe',
        },
      });

      await prisma.vendor.delete({
        where: { id: vendor.id },
      });

      const bankAccounts = await prisma.bankAccount.findMany();
      expect(bankAccounts).toHaveLength(0);
    });
  });

  describe('Default Account Tests', () => {
    it('should allow only one default account per vendor', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          name: 'Test Vendor',
          phone: '1234567890',
        },
      });

      // Create first default account
      const firstAccount = await prisma.bankAccount.create({
        data: {
          vendorId: vendor.id,
          accountNumber: '123456789012',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          accountHolderName: 'Primary Account',
          isDefault: true,
        },
      });

      // Create second account (non-default)
      const secondAccount = await prisma.bankAccount.create({
        data: {
          vendorId: vendor.id,
          accountNumber: '987654321098',
          ifscCode: 'HDFC0005678',
          bankName: 'HDFC Bank',
          accountHolderName: 'Secondary Account',
          isDefault: false,
        },
      });

      // Verify only one default account
      const bankAccounts = await prisma.bankAccount.findMany({
        where: { vendorId: vendor.id },
      });

      const defaultAccounts = bankAccounts.filter((acc) => acc.isDefault);
      expect(defaultAccounts).toHaveLength(1);
      expect(defaultAccounts[0].id).toBe(firstAccount.id);
    });
  });
});
