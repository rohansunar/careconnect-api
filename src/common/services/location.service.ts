import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Finds an existing location within service radius or creates a new one based on the provided data.
   * @param data - The location data containing lat, lng, city, state
   * @returns The location ID and serviceability.
   */
  async findOrCreateLocation(data: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
  }): Promise<{ id: string; isServiceable: boolean }> {
    // Input validation
    if (
      typeof data.lat !== 'number' ||
      typeof data.lng !== 'number' ||
      isNaN(data.lat) ||
      isNaN(data.lng)
    ) {
      throw new Error('Invalid latitude or longitude: must be valid numbers');
    }
    if (data.city !== undefined && typeof data.city !== 'string') {
      throw new Error('Invalid city: must be a string if provided');
    }
    if (data.state !== undefined && typeof data.state !== 'string') {
      throw new Error('Invalid state: must be a string if provided');
    }

    this.logger.log(
      `Finding or creating location for lat: ${data.lat}, lng: ${data.lng}`,
    );

    try {
      const nearest = await this.findNearestLocation(data.lat, data.lng);
      if (nearest) {
        this.logger.log(`Found nearest location: ${nearest.id}`);
        return nearest;
      }

      const existing = await this.findByNameAndState(data.city, data.state);
      if (existing) {
        this.logger.log(
          `Found existing location by name/state: ${existing.id}`,
        );
        return existing;
      }

      const created = await this.createLocation(data);
      this.logger.log(`Created new location: ${created.id}`);
      return created;
    } catch (error) {
      this.logger.error(
        `Error in findOrCreateLocation: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to find or create location: ${error.message}`);
    }
  }

  /**
   * This is a reverse geo-containment search:
   * Not “vendors or customer inside a city”
   * But “which city’s service circle contains this vendor or customer”

   * Kid story version (maps & circles 🗺️)
   * Imagine:
   * Each Location draws a big circle on the map
   * (radius = serviceRadiusKm)

   * The Vendor or Customer is a dot on the map
   * We ask:
   * “Which circle contains this dot?”
   * If many circles contain it:
   * “Pick the closest center one”
   * @param lat 
   * @param lng 
   * @returns 
   */
  private async findNearestLocation(
    lat: number,
    lng: number,
  ): Promise<{ id: string; isServiceable: boolean } | null> {
    const result = await this.prisma.$queryRaw<
      {
        id: string;
        name: string;
        state: string;
        serviceRadiusKm: number;
        isServiceable: boolean;
        distance: number;
      }[]
    >`
      SELECT
        l.id,
        l.name,
        l.state,
        l."serviceRadiusKm",
        l."isServiceable",
        ST_Distance(
          l."geopoint",
          ST_MakePoint(${lng}, ${lat})::geography
        ) / 1000 AS distance
      FROM "Location" l
      WHERE
        l."isServiceable" = true
        AND ST_DWithin(
          l."geopoint",
          ST_MakePoint(${lng}, ${lat})::geography,
          l."serviceRadiusKm" * 1000
        )
      ORDER BY distance ASC
      LIMIT 1;
    `;

    return result.length > 0
      ? { id: result[0].id, isServiceable: result[0].isServiceable }
      : null;
  }

  private async findByNameAndState(
    city?: string,
    state?: string,
  ): Promise<{ id: string; isServiceable: boolean } | null> {
    if (!city || !state) {
      return null;
    }
    const location = await this.prisma.location.findFirst({
      where: { name: city, state: state },
    });
    return location
      ? { id: location.id, isServiceable: location.isServiceable }
      : null;
  }

  private async createLocation(data: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
  }): Promise<{ id: string; isServiceable: boolean }> {
    const id = randomUUID();
    const result = await this.prisma.$queryRaw<
      {
        id: string;
        isServiceable: boolean;
      }[]
    >`
      INSERT INTO "Location" (id, name, state, geopoint)
      VALUES (${id}, ${data.city}, ${data.state}, ST_MakePoint(0, 0)::geography)
      RETURNING id, "isServiceable";
    `;
    return result[0];
  }
}
