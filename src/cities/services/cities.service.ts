import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * Service for managing cities.
 */
@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves all cities.
   * @returns An array of cities with selected fields.
   */
  async findAll() {
    return this.prisma.city.findMany({
      select: {
        id: true,
        name: true,
        state: true,
        country: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  /**
   * Retrieves a city by ID.
   * @param id - The ID of the city.
   * @returns The city with selected fields or null.
   */
  async findById(id: string) {
    return this.prisma.city.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        state: true,
        country: true,
        created_at: true,
        updated_at: true,
      },
    });
  }
}
