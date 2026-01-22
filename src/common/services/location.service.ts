import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class LocationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Finds an existing location within 50 km radius or creates a new one based on the provided data.
   * @param data - The location data containing lat, lng, state
   * @returns The location ID.
   */
  async findOrCreateLocation(data: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
  }): Promise<string> {
    try {
      const locations = await this.prisma.$queryRaw<
        {
          id: string;
          name: string;
          state: string;
          country: string;
        }[]
      >`
       SELECT
         id,
         name,
         state,
         country
       FROM "Location"
       WHERE ST_DWithin(
         geopoint,
         ST_MakePoint(${data.lng}, ${data.lat})::geography,
         50000
       )
       LIMIT 1;
     `;

      if (locations.length > 0) {
        return locations[0].id;
      }
      // Create new location
      const id = randomUUID();

      const newLocation = await this.prisma.$queryRaw<
        {
          id: string;
        }[]
      >`
       INSERT INTO "Location" (id, name, state, geopoint)
       VALUES (${id}, ${data.city},${data.state},
         ST_MakePoint(${data.lng}, ${data.lat})::geography
       )
       RETURNING id;
     `;

      return newLocation[0].id;
    } catch (error) {
      throw new Error(`Failed to find or create location: ${error.message}`);
    }
  }
}
