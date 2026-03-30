#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

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
      await prisma.admin.upsert({
        where: { email: adminData.email },
        update: {},
        create: {
          name: adminData.name,
          email: adminData.email,
          password_hash: hashedPassword,
          role: adminData.role,
          phone: adminData.phone,
        },
      });
      console.log(`Created/Upserted admin: ${adminData.name} (${adminData.email})`);
    } catch (error) {
      console.error(`Error creating admin ${adminData.name}:`, error);
    }
  }

  const categories = [
    { name: 'Water Accessories', platformFee: 5.0 },
    { name: 'Water', platformFee: 2.0 },
  ];

  const categoryMap: { [key: string]: string } = {};
  const categoryPlatformFees: { [key: string]: number } = {};
  for (const category of categories) {
    try {
      const createdCategory = await prisma.categories.upsert({
        where: { name: category.name },
        update: {},
        create: { name: category.name }
      });
      categoryMap[category.name] = createdCategory.id;
      categoryPlatformFees[category.name] = category.platformFee;
      console.log(`Created/Updated category: ${category.name}`);

      // Create platform fee for this category using Prisma query (not raw query)
      const platformFeeValue = category.platformFee;
      try {
        await prisma.platformFee.upsert({
          where: {
            feeName_categoryId: {
              feeName: 'PLATFORM_FEE' as any,
              categoryId: createdCategory.id,
            },
          },
          update: {
            value: platformFeeValue,
            calculationType: 'PERCENTAGE' as any,
            effectiveFrom: new Date(),
            isActive: true,
          },
          create: {
            categoryId: createdCategory.id,
            feeName: 'PRODUCT_LISTING' as any,
            calculationType: 'PERCENTAGE' as any,
            value: platformFeeValue,
            effectiveFrom: new Date(),
            isActive: true,
          },
        });
        console.log(`Created/Updated platform fee for category: ${category.name} (${platformFeeValue}%)`);
      } catch (error) {
        console.error(`Error creating platform fee for category ${category.name}:`, error);
      }
    } catch (error) {
      console.error(`Error creating category ${category.name}:`, error);
    }
  }

   const locations = [
    { name: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.0760, lng: 72.8777, serviceRadiusKm: 50 },
    { name: 'Delhi', state: 'Delhi', country: 'India', lat: 28.7041, lng: 77.1025, serviceRadiusKm: 50 },
    { name: 'Bangalore', state: 'Karnataka', country: 'India', lat: 12.9716, lng: 77.5946, serviceRadiusKm: 50 },
    { name: 'Chennai', state: 'Tamil Nadu', country: 'India', lat: 13.0827, lng: 80.2707, serviceRadiusKm: 50 },
    { name: 'Jalpaiguri', state: 'West Bengal', country: 'India', lat: 26.52108, lng: 88.72744, serviceRadiusKm: 50 },
    { name: 'Kharia', state: 'West Bengal', country: 'India', lat: 26.53333, lng: 88.73519, serviceRadiusKm: 50 }
  ];

  for (const location of locations) {
    try {
      const id = randomUUID();
      await prisma.$queryRaw`
        INSERT INTO "Location" (id, name, state, country, geopoint, "serviceRadiusKm", "isServiceable")
        VALUES (${id}, ${location.name}, ${location.state}, ${location.country}, ST_MakePoint(${Number(location.lng.toFixed(6))}, ${Number(location.lat.toFixed(6))})::geography, ${location.serviceRadiusKm}, true)
        ON CONFLICT (name, state) DO NOTHING
      `;
      console.log(`Created location: ${location.name}`);
    } catch (error) {
      console.error(`Error creating location ${location.name}:`, error);
    }
  }


  // Create customer
  let customer;
  try {
    customer = await prisma.user.upsert({
      where: { phone: '9832012345' },
      update: {},
      create: {
        phone: '9832012345',
        name: 'Priya Sharma',
        email: 'priya.sharma@example.com'
      }
    });
    console.log(`Created/Updated customer: ${customer.name}`);
  } catch (error) {
    console.error('Error creating customer:', error);
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
