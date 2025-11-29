#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Electronics' },
    { name: 'Clothing' },
    { name: 'Home & Garden' },
    { name: 'Sports & Outdoors' },
    { name: 'Books' },
    { name: 'Beauty & Personal Care' },
    { name: 'Toys & Games' },
    { name: 'Automotive' },
    { name: 'Health & Household' },
    { name: 'Grocery' }
  ];

  for (const category of categories) {
    try {
      await prisma.categories.create({
        data: category
      });
      console.log(`Created category: ${category.name}`);
    } catch (error) {
      console.error(`Error creating category ${category.name}:`, error);
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