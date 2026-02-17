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
      // Get Jalpaiguri location ID specifically
      const jalpaiguriLocation = await prisma.location.findFirst({
        where: { name: 'Jalpaiguri' }
      });
      const locationId = jalpaiguriLocation ? jalpaiguriLocation.id : null;
      const vendorLat = 26.52108;
      const vendorLng = 88.72744;
      
      // Delete existing vendor address if any
      await prisma.vendorAddress.deleteMany({
        where: { vendorId: vendor.id }
      }).catch(() => {});
      
      const id = randomUUID();
      await prisma.$queryRaw`
        INSERT INTO "VendorAddress" (id, "vendorId", "locationId", geopoint, "is_active", pincode, address, "isServiceable", "createdAt", "updatedAt")
        VALUES (${id}, ${vendor.id}, ${locationId}, ST_MakePoint(${Number(vendorLng.toFixed(6))}, ${Number(vendorLat.toFixed(6))})::geography, true, '735101', '123 Main Street, Jalpaiguri, West Bengal', true, NOW(), NOW())
      `;
      console.log(`Created/Updated vendor address for ${vendor.name} with location: Jalpaiguri, West Bengal, 735101`);
    } catch (error) {
      console.error('Error creating vendor address:', error);
    }

    // Create products
    const products = [
      { name: '20 Litre Water Refill', description: 'Fresh red apple', price: 50, category: 'Water' },
      { name: '20 Litre Water Pure Refill', description: 'Yellow ripe banana', price: 30, category: 'Water' },
      { name: 'New Water Combo', description: 'Latest model smartphone', price: 500, category: 'Water Accessories' },
      { name: 'Water Jar Stand', description: 'High-performance laptop', price: 350, category: 'Water Accessories' },
      { name: 'Water Jar Automatic Dispenser', description: 'Cotton t-shirt', price: 250, category: 'Water Accessories' },
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
      // Get Jalpaiguri location ID specifically
      const jalpaiguriLocation = await prisma.location.findFirst({
        where: { name: 'Jalpaiguri' }
      });
      const locationId = jalpaiguriLocation ? jalpaiguriLocation.id : null;
      const customerLat = 26.52108;
      const customerLng = 88.72744;
      
      // Delete existing customer address if any
      await prisma.customerAddress.deleteMany({
        where: { customerId: customer.id }
      }).catch(() => {});
      
      const id = randomUUID();
      await prisma.$queryRaw`
        INSERT INTO "CustomerAddress" (id, "customerId", "locationId", geopoint, address, pincode, label, "isDefault", "isServiceable", created_at, updated_at)
        VALUES (${id}, ${customer.id}, ${locationId}, ST_MakePoint(${Number(customerLng.toFixed(6))}, ${Number(customerLat.toFixed(6))})::geography, '456 Nearby Lane, Jalpaiguri, West Bengal', '735101', 'Home', true, true, NOW(), NOW())
      `;
      console.log(`Created customer address for ${customer.name} with location: Jalpaiguri, West Bengal, 735101`);
    } catch (error) {
      console.error('Error creating customer address:', error);
    }
  }

  // Create orders for existing customer and vendor (COD and Online Payment)
  if (customer && vendor) {
    try {
      // Get customer address
      const customerAddress = await prisma.customerAddress.findFirst({
        where: { customerId: customer.id }
      });

      // Get products for order items
      const products = await prisma.product.findMany({
        where: { vendorId: vendor.id }
      });

      if (customerAddress && products.length > 0) {
        // Create COD Order
        const codOrderNo = `ORD-COD-${Date.now()}`;
        const codOrder = await prisma.order.create({
          data: {
            orderNo: codOrderNo,
            customerId: customer.id,
            vendorId: vendor.id,
            addressId: customerAddress.id,
            total_amount: products[0].price,
            payment_status: 'PENDING',
            payment_mode: 'COD' as const,
            delivery_status: 'PENDING' as const
          }
        });

        // Create order item for COD order
        await prisma.orderItem.create({
          data: {
            orderId: codOrder.id,
            productId: products[0].id,
            quantity: 1,
            price: products[0].price
          }
        });
        console.log(`Created COD order: ${codOrderNo} for customer: ${customer.name}`);

        // Create Online Payment Order
        const onlineOrderNo = `ORD-ONL-${Date.now()}`;
        const onlineOrder = await prisma.order.create({
          data: {
            orderNo: onlineOrderNo,
            customerId: customer.id,
            vendorId: vendor.id,
            addressId: customerAddress.id,
            total_amount: products.length > 1 ? products[1].price : products[0].price,
            payment_status: 'PENDING',
            payment_mode: 'ONLINE' as const,
            delivery_status: 'PENDING' as const
          }
        });

        // Create order item for Online Payment order
        await prisma.orderItem.create({
          data: {
            orderId: onlineOrder.id,
            productId: products.length > 1 ? products[1].id : products[0].id,
            quantity: 1,
            price: products.length > 1 ? products[1].price : products[0].price
          }
        });
        console.log(`Created Online Payment order: ${onlineOrderNo} for customer: ${customer.name}`);
      } else {
        console.log('Cannot create orders: missing customer address or products');
      }
    } catch (error) {
      console.error('Error creating orders:', error);
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
