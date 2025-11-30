#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const admins = [
    {
      name: 'Super Admin One',
      email: 'superadmin1@example.com',
      password: 'password123',
      role: 'admin' as const,
      phone: '+12345678901',
    },
    {
      name: 'Super Admin Two',
      email: 'superadmin2@example.com',
      password: 'password123',
      role: 'super_admin' as const,
      phone: '+12345678902',
    },
    {
      name: 'Staff Member One',
      email: 'staff1@example.com',
      password: 'password123',
      role: 'staff' as const,
      phone: '+12345678903',
    },
    {
      name: 'Staff Member Two',
      email: 'staff2@example.com',
      password: 'password123',
      role: 'staff' as const,
      phone: '+12345678904',
    },
    {
      name: 'Support Agent',
      email: 'support@example.com',
      password: 'password123',
      role: 'support' as const,
      phone: '+12345678905',
    },
  ];

  for (const adminData of admins) {
    try {
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      await prisma.admin.create({
        data: {
          name: adminData.name,
          email: adminData.email,
          password_hash: hashedPassword,
          role: adminData.role,
          phone: adminData.phone,
        },
      });
      console.log(`Created admin: ${adminData.name} (${adminData.email})`);
    } catch (error) {
      console.error(`Error creating admin ${adminData.name}:`, error);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });