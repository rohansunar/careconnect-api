import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class LocationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Finds an existing location or creates a new one based on the provided data.
   * @param data - The location data containing lat, lng, city?, state?
   * @returns The location ID.
   */
  async findOrCreateLocation(data: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
  }): Promise<string> {
    const where: any = {
      lat: data.lat,
      lng: data.lng,
    };
    if (data.state) {
      where.state = data.state;
    }
    if (data.city) {
      where.name = data.city;
    }

    const existingLocation = await this.prisma.location.findFirst({
      where,
    });

    if (existingLocation) {
      return existingLocation.id;
    } else {
      const newLocation = await this.prisma.location.create({
        data: {
          name: data.city || '',
          state: data.state || '',
        },
      });
      return newLocation.id;
    }
  }
}
