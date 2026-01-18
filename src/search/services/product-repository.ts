import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { ICustomerAddress, IProductRepository, IProximitySearchResult, IDistance } from '../interfaces/search.interfaces';

/**
 * Repository for product-related database operations, specifically for proximity searches.
 */
@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Finds products within a given radius from the customer's location, with pagination.
   * @param customerLocation Customer's location
   * @param radiusKm Search radius in kilometers
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns Paginated results with products and distances
   */
  async findProductsWithinRadius(
    customerLocation: ICustomerAddress,
    radiusKm: number,
    page: number,
    limit: number,
  ): Promise<{ results: IProximitySearchResult[]; total: number }> {
    const offset = (page - 1) * limit;

    // Query for paginated results
    const resultsQuery = `
      SELECT sub.*, distance FROM (
        SELECT p.*,
          (6371 * acos(
            cos(radians(${customerLocation.lat})) * cos(radians(va.lat)) *
            cos(radians(va.lng) - radians(${customerLocation.lng})) +
            sin(radians(${customerLocation.lat})) * sin(radians(va.lat))
          )) AS distance
        FROM "Product" p
        JOIN "Vendor" v ON v.id = p."vendorId"
        JOIN "VendorAddress" va ON va."vendorId" = v.id
        WHERE p.is_active = true
      ) AS sub
      WHERE distance <= ${radiusKm}
      ORDER BY distance ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Query for total count
    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT
          (6371 * acos(
            cos(radians(${customerLocation.lat})) * cos(radians(va.lat)) *
            cos(radians(va.lng) - radians(${customerLocation.lng})) +
            sin(radians(${customerLocation.lat})) * sin(radians(va.lat))
          )) AS distance
        FROM "Product" p
        JOIN "Vendor" v ON v.id = p."vendorId"
        JOIN "VendorAddress" va ON va."vendorId" = v.id
        WHERE p.is_active = true
      ) AS sub
      WHERE distance <= ${radiusKm}
    `;

    try {
      const [results, countResult] = await Promise.all([
        this.prisma.$queryRawUnsafe(resultsQuery),
        this.prisma.$queryRawUnsafe(countQuery),
      ]);

      const total = parseInt((countResult as any)[0].total, 10);

      // Map results to IProximitySearchResult
      const proximityResults: IProximitySearchResult[] = (results as any[]).map((row) => {
        const { distance, ...product } = row; // Exclude distance from product
        return {
          product, // Product without distance field
          distance: this.formatDistance(row.distance),
        };
      });

      return {
        results: proximityResults,
        total,
      };
    } catch (error) {
      console.error('Error in proximity search:', error);
      return {
        results: [],
        total: 0,
      };
    }
  }

  /**
   * Formats distance in kilometers to IDistance object.
   * @param distanceKm Distance in kilometers
   * @returns Formatted distance
   */
  private formatDistance(distanceKm: number): IDistance {
    if (distanceKm < 1) {
      return {
        value: Math.round(distanceKm * 1000),
        unit: 'm',
      };
    } else {
      return {
        value: Math.round(distanceKm * 100) / 100,
        unit: 'km',
      };
    }
  }
}