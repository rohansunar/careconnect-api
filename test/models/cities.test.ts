import { PrismaClient, Prisma } from '@prisma/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

describe('Cities CRUD', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up cities table before each test
    await prisma.city.deleteMany();
  });

  describe('Create', () => {
    it('should create a city with valid data', async () => {
      const cityData = {
        name: 'New York',
        state: 'NY',
        country: 'USA',
        bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any, // Valid WKT geometry
      };

      const city = await prisma.city.create({ data: cityData });

      expect(city).toHaveProperty('id');
      expect(city.name).toBe('New York');
      expect(city.state).toBe('NY');
      expect(city.country).toBe('USA');
      expect(city.bbox).toBe('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))');
      expect(city.created_at).toBeInstanceOf(Date);
    });

    it('should throw error for null name', async () => {
      const cityData = {
        name: null as any,
        bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
      };

      await expect(prisma.city.create({ data: cityData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('should throw error for invalid geometry', async () => {
      const cityData = {
        name: 'Invalid City',
        bbox: 'INVALID_GEOMETRY' as any,
      };

      await expect(prisma.city.create({ data: cityData })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });
  });

  describe('Read', () => {
    beforeEach(async () => {
      await prisma.city.create({
        data: {
          name: 'Test City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });
    });

    it('should find many cities', async () => {
      const cities = await prisma.city.findMany();

      expect(cities).toHaveLength(1);
      expect(cities[0].name).toBe('Test City');
    });

    it('should find unique city by id', async () => {
      const createdCity = await prisma.city.create({
        data: {
          name: 'Unique City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });

      const city = await prisma.city.findUnique({
        where: { id: createdCity.id },
      });

      expect(city).toBeTruthy();
      expect(city?.name).toBe('Unique City');
    });
  });

  describe('Update', () => {
    let cityId: string;

    beforeEach(async () => {
      const city = await prisma.city.create({
        data: {
          name: 'Update City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });
      cityId = city.id;
    });

    it('should update city name', async () => {
      const updatedCity = await prisma.city.update({
        where: { id: cityId },
        data: { name: 'Updated City' },
      });

      expect(updatedCity.name).toBe('Updated City');
    });

    it('should throw error for null name on update', async () => {
      await expect(
        prisma.city.update({
          where: { id: cityId },
          data: { name: null as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should throw error for invalid geometry on update', async () => {
      await expect(
        prisma.city.update({
          where: { id: cityId },
          data: { bbox: 'INVALID' as any },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('Delete', () => {
    let cityId: string;

    beforeEach(async () => {
      const city = await prisma.city.create({
        data: {
          name: 'Delete City',
          bbox: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' as any,
        },
      });
      cityId = city.id;
    });

    it('should delete city', async () => {
      const deletedCity = await prisma.city.delete({
        where: { id: cityId },
      });

      expect(deletedCity.name).toBe('Delete City');

      const cities = await prisma.city.findMany();
      expect(cities).toHaveLength(0);
    });

    it('should throw error for non-existent id', async () => {
      await expect(
        prisma.city.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });
  });
});
