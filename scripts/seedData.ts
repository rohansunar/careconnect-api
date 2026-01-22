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
    { name: 'Water Accessories' },
    { name: 'Water' },
    { name: 'Food' },
    { name: 'Electronics' },
    { name: 'Clothing' },
    { name: 'Beverages' },
    { name: 'Household' },
    { name: 'Books' },
    { name: 'Toys' },
    { name: 'Health & Beauty' },
    { name: 'Sports' },
    { name: 'Automotive' },
  ];

  const categoryMap: { [key: string]: string } = {};
  for (const category of categories) {
    try {
      const createdCategory = await prisma.categories.upsert({
        where: { name: category.name },
        update: {},
        create: category
      });
      categoryMap[category.name] = createdCategory.id;
      console.log(`Created/Updated category: ${category.name}`);
    } catch (error) {
      console.error(`Error creating category ${category.name}:`, error);
    }
  }

  // Create vendor
  let vendor;
  try {
    vendor = await prisma.vendor.upsert({
      where: { phone: '9832012345' },
      update: {},
      create: {
        phone: '9832012345',
        name: 'Rajesh Kumar',
        business_name: 'QuickMart Superstore',
        email: 'rajesh@quickmart.com',
        vendorNo: 'V000001',
        openingTime: '09:00',
        closingTime: '18:00',
        operatingDays: []
      }
    });
    console.log(`Created/Updated vendor: ${vendor.name}`);
  } catch (error) {
    console.error('Error creating vendor:', error);
  }

  // Create vendor address and products if vendor created
  if (vendor) {
    try {
      const vendorLat = 19.0760;
      const vendorLng = 72.8777;
      const vendorLocations = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Location"
        WHERE ST_DWithin(geopoint, ST_MakePoint(${vendorLng}, ${vendorLat})::geography, 50000)
        LIMIT 1
      `;
      const locationId = vendorLocations.length > 0 ? vendorLocations[0].id : null;
      const id = randomUUID();
      await prisma.$queryRaw`
        INSERT INTO "VendorAddress" (id, "vendorId", "locationId", geopoint, "isActive", pincode, address, "isServiceable", "createdAt", "updatedAt")
        VALUES (${id}, ${vendor.id}, ${locationId}, ST_MakePoint(${vendorLng}, ${vendorLat})::geography, true, '400001', '123 Main Street, Mumbai', true, NOW(), NOW())
        ON CONFLICT ("vendorId") DO NOTHING
      `;
      console.log(`Created/Updated vendor address for ${vendor.name}`);
    } catch (error) {
      console.error('Error creating vendor address:', error);
    }

    // Create products
    const products = [
      { name: 'Apple', description: 'Fresh red apple', price: 50, category: 'Food' },
      { name: 'Banana', description: 'Yellow ripe banana', price: 30, category: 'Food' },
      { name: 'Smartphone', description: 'Latest model smartphone', price: 15000, category: 'Electronics' },
      { name: 'Laptop', description: 'High-performance laptop', price: 50000, category: 'Electronics' },
      { name: 'T-Shirt', description: 'Cotton t-shirt', price: 200, category: 'Clothing' },
      { name: 'Jeans', description: 'Blue denim jeans', price: 400, category: 'Clothing' },
      { name: 'Coffee', description: 'Ground coffee beans', price: 150, category: 'Beverages' },
      { name: 'Tea', description: 'Black tea bags', price: 100, category: 'Beverages' },
      { name: 'Detergent', description: 'Laundry detergent', price: 120, category: 'Household' },
      { name: 'Dish Soap', description: 'Lemon scented dish soap', price: 80, category: 'Household' },
      { name: 'Novel', description: 'Bestselling fiction novel', price: 250, category: 'Books' },
      { name: 'Cookbook', description: 'Recipes for healthy meals', price: 300, category: 'Books' },
      { name: 'Action Figure', description: 'Superhero action figure', price: 150, category: 'Toys' },
      { name: 'Puzzle', description: '500 piece jigsaw puzzle', price: 200, category: 'Toys' },
      { name: 'Shampoo', description: 'Herbal shampoo', price: 180, category: 'Health & Beauty' },
      { name: 'Face Cream', description: 'Moisturizing face cream', price: 250, category: 'Health & Beauty' },
      { name: 'Football', description: 'Standard size football', price: 300, category: 'Sports' },
      { name: 'Basketball', description: 'Official size basketball', price: 400, category: 'Sports' },
      { name: 'Car Oil', description: 'Engine oil for cars', price: 350, category: 'Automotive' },
      { name: 'Tire', description: 'All-season car tire', price: 400, category: 'Automotive' }
    ];

    for (const product of products) {
      try {
        const existingProduct = await prisma.product.findFirst({
          where: {
            name: product.name,
            vendorId: vendor.id
          }
        });
        if (!existingProduct) {
          await prisma.product.create({
            data: {
              name: product.name,
              description: product.description,
              price: product.price,
              images: [],
              categoryId: categoryMap[product.category],
              vendorId: vendor.id
            }
          });
          console.log(`Created product: ${product.name}`);
        } else {
          console.log(`Product ${product.name} already exists`);
        }
      } catch (error) {
        console.error(`Error creating product ${product.name}:`, error);
      }
    }
  }

  // Create customer
  let customer;
  try {
    customer = await prisma.customer.upsert({
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

  // Create customer address
  if (customer) {
    try {
      const customerLat = 19.0761;
      const customerLng = 72.8778;
      const customerLocations = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Location"
        WHERE ST_DWithin(geopoint, ST_MakePoint(${customerLng}, ${customerLat})::geography, 50000)
        LIMIT 1
      `;
      const locationId = customerLocations.length > 0 ? customerLocations[0].id : null;
      const id = randomUUID();
      await prisma.$queryRaw`
        INSERT INTO "CustomerAddress" (id, "customerId", "locationId", geopoint, address, pincode, label, "isDefault", "isServiceable")
        VALUES (${id}, ${customer.id}, ${locationId}, ST_MakePoint(${customerLng}, ${customerLat})::geography, '456 Nearby Lane, Mumbai', '400001', 'Home', true, true)
      `;
      console.log(`Created customer address for ${customer.name}`);
    } catch (error) {
      console.error('Error creating customer address:', error);
    }
  }

  const locations = [
    { name: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.0760, lng: 72.8777, serviceRadiusKm: 50 },
    { name: 'Delhi', state: 'Delhi', country: 'India', lat: 28.7041, lng: 77.1025, serviceRadiusKm: 50 },
    { name: 'Bangalore', state: 'Karnataka', country: 'India', lat: 12.9716, lng: 77.5946, serviceRadiusKm: 50 },
    { name: 'Chennai', state: 'Tamil Nadu', country: 'India', lat: 13.0827, lng: 80.2707, serviceRadiusKm: 50 }
  ];

  for (const location of locations) {
    try {
      const id = randomUUID();
      await prisma.$queryRaw`
        INSERT INTO "Location" (id, name, state, country, geopoint, "serviceRadiusKm", "isServiceable")
        VALUES (${id}, ${location.name}, ${location.state}, ${location.country}, ST_MakePoint(${location.lng}, ${location.lat})::geography, ${location.serviceRadiusKm}, true)
        ON CONFLICT (name, state) DO NOTHING
      `;
      console.log(`Created location: ${location.name}`);
    } catch (error) {
      console.error(`Error creating location ${location.name}:`, error);
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