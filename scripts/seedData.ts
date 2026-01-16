#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Water Accessories' },
    { name: 'Water' },
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