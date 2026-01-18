#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
        vendorNo: 'V000001'
      }
    });
    console.log(`Created/Updated vendor: ${vendor.name}`);
  } catch (error) {
    console.error('Error creating vendor:', error);
  }

  // Create vendor address and products if vendor created
  if (vendor) {
    try {
      await prisma.vendorAddress.upsert({
        where: { vendorId: vendor.id },
        update: {},
        create: {
          vendorId: vendor.id,
          lat: 19.0760,
          lng: 72.8777,
          address: '123 Main Street, Mumbai',
          pincode: '400001'
        }
      });
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
      await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          lat: 19.0761,
          lng: 72.8778,
          address: '456 Nearby Lane, Mumbai',
          pincode: '400001',
          label: 'Home',
          isDefault:true
        }
      });
      console.log(`Created customer address for ${customer.name}`);
    } catch (error) {
      console.error('Error creating customer address:', error);
    }
  }

  const cities = [
    { name: 'Mumbai', state: 'Maharashtra', country: 'India' },
    { name: 'Delhi', state: 'Delhi', country: 'India' },
    { name: 'Bangalore', state: 'Karnataka', country: 'India' },
    { name: 'Chennai', state: 'Tamil Nadu', country: 'India' }
  ];

  for (const city of cities) {
    try {
      await prisma.city.create({
        data: city
      });
      console.log(`Created city: ${city.name}`);
    } catch (error) {
      console.error(`Error creating city ${city.name}:`, error);
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