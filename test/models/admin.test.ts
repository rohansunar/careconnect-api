import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('Admin CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up admin table before each test
    await prisma.admin.deleteMany();
  });

  describe('Create', () => {
    it('should create an admin with valid data', async () => {
      const adminData = {
        name: 'Test Admin',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'super_admin' as const,
        phone: '1234567890',
      };

      const admin = await prisma.admin.create({ data: adminData });

      expect(admin).toHaveProperty('id');
      expect(admin.name).toBe('Test Admin');
      expect(admin.email).toBe('test@example.com');
      expect(admin.password_hash).toBe('hashedpassword');
      expect(admin.role).toBe('super_admin');
      expect(admin.is_active).toBe(true);
      expect(admin.phone).toBe('1234567890');
      expect(admin.created_at).toBeInstanceOf(Date);
      expect(admin.updated_at).toBeInstanceOf(Date);
    });

    it('should create an admin with minimal data', async () => {
      const adminData = {
        name: 'Minimal Admin',
        email: 'minimal@example.com',
        password_hash: 'hashedpassword',
        role: 'staff' as const,
      };

      const admin = await prisma.admin.create({ data: adminData });

      expect(admin).toHaveProperty('id');
      expect(admin.name).toBe('Minimal Admin');
      expect(admin.email).toBe('minimal@example.com');
      expect(admin.password_hash).toBe('hashedpassword');
      expect(admin.role).toBe('staff');
      expect(admin.is_active).toBe(true);
      expect(admin.phone).toBeNull();
    });

    it('should throw error for null name', async () => {
      const adminData = {
        name: null as any,
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'super_admin' as const,
      };

      await expect(prisma.admin.create({ data: adminData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for null email', async () => {
      const adminData = {
        name: 'Test Admin',
        email: null as any,
        password_hash: 'hashedpassword',
        role: 'super_admin' as const,
      };

      await expect(prisma.admin.create({ data: adminData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for null password_hash', async () => {
      const adminData = {
        name: 'Test Admin',
        email: 'test@example.com',
        password_hash: null as any,
        role: 'super_admin' as const,
      };

      await expect(prisma.admin.create({ data: adminData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for null role', async () => {
      const adminData = {
        name: 'Test Admin',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: null as any,
      };

      await expect(prisma.admin.create({ data: adminData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for invalid role', async () => {
      const adminData = {
        name: 'Test Admin',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'invalid_role' as any,
      };

      await expect(prisma.admin.create({ data: adminData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for duplicate email', async () => {
      await prisma.admin.create({
        data: {
          name: 'First Admin',
          email: 'test@example.com',
          password_hash: 'hashedpassword',
          role: 'super_admin' as const,
        },
      });

      const adminData = {
        name: 'Second Admin',
        email: 'test@example.com', // duplicate
        password_hash: 'hashedpassword2',
        role: 'staff' as const,
      };

      await expect(prisma.admin.create({ data: adminData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });
  });

  describe('Read', () => {
    let adminId: string;

    beforeEach(async () => {
      const admin = await prisma.admin.create({
        data: {
          name: 'Test Admin',
          email: 'test@example.com',
          password_hash: 'hashedpassword',
          role: 'super_admin' as const,
        },
      });
      adminId = admin.id;
    });

    it('should find many admins', async () => {
      const admins = await prisma.admin.findMany();

      expect(admins).toHaveLength(1);
      expect(admins[0].name).toBe('Test Admin');
    });

    it('should find unique admin by id', async () => {
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
      });

      expect(admin).toBeTruthy();
      expect(admin?.name).toBe('Test Admin');
    });
  });

  describe('Update', () => {
    let adminId: string;

    beforeEach(async () => {
      const admin = await prisma.admin.create({
        data: {
          name: 'Update Admin',
          email: 'update@example.com',
          password_hash: 'hashedpassword',
          role: 'super_admin' as const,
        },
      });
      adminId = admin.id;
    });

    it('should update admin name', async () => {
      const updatedAdmin = await prisma.admin.update({
        where: { id: adminId },
        data: { name: 'Updated Admin' },
      });

      expect(updatedAdmin.name).toBe('Updated Admin');
    });

    it('should update email to unique value', async () => {
      const updatedAdmin = await prisma.admin.update({
        where: { id: adminId },
        data: { email: 'newemail@example.com' },
      });

      expect(updatedAdmin.email).toBe('newemail@example.com');
    });

    it('should update role', async () => {
      const updatedAdmin = await prisma.admin.update({
        where: { id: adminId },
        data: { role: 'support' as const },
      });

      expect(updatedAdmin.role).toBe('support');
    });

    it('should throw error for null name on update', async () => {
      await expect(
        prisma.admin.update({
          where: { id: adminId },
          data: { name: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null email on update', async () => {
      await expect(
        prisma.admin.update({
          where: { id: adminId },
          data: { email: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null password_hash on update', async () => {
      await expect(
        prisma.admin.update({
          where: { id: adminId },
          data: { password_hash: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for null role on update', async () => {
      await expect(
        prisma.admin.update({
          where: { id: adminId },
          data: { role: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid role on update', async () => {
      await expect(
        prisma.admin.update({
          where: { id: adminId },
          data: { role: 'invalid_role' as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for duplicate email on update', async () => {
      await prisma.admin.create({
        data: {
          name: 'Another Admin',
          email: 'another@example.com',
          password_hash: 'hashedpassword2',
          role: 'staff' as const,
        },
      });

      await expect(
        prisma.admin.update({
          where: { id: adminId },
          data: { email: 'another@example.com' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let adminId: string;

    beforeEach(async () => {
      const admin = await prisma.admin.create({
        data: {
          name: 'Delete Admin',
          email: 'delete@example.com',
          password_hash: 'hashedpassword',
          role: 'super_admin' as const,
        },
      });
      adminId = admin.id;
    });

    it('should delete admin', async () => {
      const deletedAdmin = await prisma.admin.delete({
        where: { id: adminId },
      });

      expect(deletedAdmin.name).toBe('Delete Admin');

      const admins = await prisma.admin.findMany();
      expect(admins).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.admin.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
