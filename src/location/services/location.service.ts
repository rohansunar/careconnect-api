import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateLocationDto } from '../dto/create-location.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import { Location } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new location.
   * @param dto - The data to create the location
   * @returns The created location
   */
  async create(dto: CreateLocationDto): Promise<Location> {
    this.logger.log(`Creating location: ${dto.name}`);

    try {
      const id = randomUUID();
      const result = await this.prisma.$queryRaw<Location[]>`
        INSERT INTO "Location" (id, name, state, country, "isServiceable", "serviceRadiusKm", geopoint)
        VALUES (${id}, ${dto.name}, ${dto.state}, ${dto.country || 'India'}, ${dto.isServiceable ?? false}, ${dto.serviceRadiusKm ?? 50}, ST_MakePoint(${dto.lng}, ${dto.lat})::geography)
        RETURNING *;
      `;
      this.logger.log(`Location created: ${result[0].id}`);
      return result[0];
    } catch (error) {
      this.logger.error(
        `Error creating location: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to create location: ${error.message}`,
      );
    }
  }

  /**
   * Retrieves all locations.
   * @returns Array of locations
   */
  async findAll(): Promise<Location[]> {
    this.logger.log('Retrieving all locations');
    return this.prisma.location.findMany();
  }

  /**
   * Retrieves a location by ID.
   * @param id - The location ID
   * @returns The location
   */
  async findOne(id: string): Promise<Location> {
    this.logger.log(`Retrieving location: ${id}`);
    const location = await this.prisma.location.findUnique({
      where: { id },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }
    return location;
  }

  /**
   * Updates a location by ID.
   * @param id - The location ID
   * @param dto - The update data
   * @returns The updated location
   */
  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    this.logger.log(`Updating location: ${id}`);

    await this.findOne(id); // Ensure exists

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.state !== undefined) data.state = dto.state;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.isServiceable !== undefined) data.isServiceable = dto.isServiceable;
    if (dto.serviceRadiusKm !== undefined)
      data.serviceRadiusKm = dto.serviceRadiusKm;

    if (dto.lat !== undefined && dto.lng !== undefined) {
      // Use raw query for geopoint update
      const setParts = Object.keys(data).map((key) => `"${key}" = $${key}`);
      const values = Object.values(data);
      const query = `
        UPDATE "Location"
        SET ${setParts.join(', ')}, geopoint = ST_MakePoint($${setParts.length + 1}, $${setParts.length + 2})::geography
        WHERE id = $${setParts.length + 3}
        RETURNING *;
      `;
      const params = [...values, dto.lng, dto.lat, id];
      try {
        const result = await this.prisma.$queryRawUnsafe<Location[]>(
          query,
          ...params,
        );
        this.logger.log(`Location updated: ${id}`);
        return result[0];
      } catch (error) {
        this.logger.error(
          `Error updating location: ${error.message}`,
          error.stack,
        );
        throw new BadRequestException(
          `Failed to update location: ${error.message}`,
        );
      }
    } else {
      // Use Prisma update
      return this.prisma.location.update({
        where: { id },
        data,
      });
    }
  }

  /**
   * Deletes a location by ID if not associated with addresses.
   * @param id - The location ID
   */
  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting location: ${id}`);

    const location = await this.findOne(id);

    // Check associations
    const customerAddressCount = await this.prisma.customerAddress.count({
      where: { locationId: id },
    });
    const vendorAddressCount = await this.prisma.vendorAddress.count({
      where: { locationId: id },
    });

    if (customerAddressCount > 0 || vendorAddressCount > 0) {
      throw new BadRequestException(
        `Cannot delete location ${id} as it is associated with addresses`,
      );
    }

    await this.prisma.location.delete({
      where: { id },
    });
    this.logger.log(`Location deleted: ${id}`);
  }

  /**
   * Toggles the isServiceable field of a location.
   * @param id - The location ID
   * @returns The updated location
   */
  async toggleServiceable(id: string): Promise<Location> {
    this.logger.log(`Toggling serviceable for location: ${id}`);

    const location = await this.findOne(id);

    return this.prisma.location.update({
      where: { id },
      data: { isServiceable: !location.isServiceable },
    });
  }

  /**
   * Validates the input data for location operations.
   * @param data - The location data to validate
   * @throws BadRequestException if validation fails
   */
  private validateLocationData(data: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
  }): void {
    if (
      typeof data.lat !== 'number' ||
      typeof data.lng !== 'number' ||
      isNaN(data.lat) ||
      isNaN(data.lng)
    ) {
      throw new BadRequestException(
        'Invalid latitude or longitude: must be valid numbers',
      );
    }
    if (data.city !== undefined && typeof data.city !== 'string') {
      throw new BadRequestException(
        'Invalid city: must be a string if provided',
      );
    }
    if (data.state !== undefined && typeof data.state !== 'string') {
      throw new BadRequestException(
        'Invalid state: must be a string if provided',
      );
    }
  }

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
    this.validateLocationData(data);

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
      throw new BadRequestException(
        `Failed to find or create location: ${error.message}`,
      );
    }
  }

  /**
   * This is a reverse geo-containment search:
   * Not "vendors or customer inside a city"
   * But "which city's service circle contains this vendor or customer"

   * Kid story version (maps & circles 🗺️)
   * Imagine:
   * Each Location draws a big circle on the map
   * (radius = serviceRadiusKm)

   * The Vendor or Customer is a dot on the map
   * We ask:
   * "Which circle contains this dot?"
   * If many circles contain it:
   * "Pick the closest center one"
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
      INSERT INTO "Location" (id, name, state, country, "isServiceable", "serviceRadiusKm", geopoint)
      VALUES (${id}, ${data.city}, ${data.state}, 'India', false, 50, ST_MakePoint(${data.lng}, ${data.lat})::geography)
      RETURNING id, "isServiceable";
    `;
    return result[0];
  }
}
