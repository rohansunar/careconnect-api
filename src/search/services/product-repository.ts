import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { ProductApprovalStatus } from '@prisma/client';
import {
  ICustomerAddress,
  IProductRepository,
  IProximitySearchResult,
  IDistance,
} from '../interfaces/search.interfaces';

/**
 * Repository for product-related database operations, specifically for proximity searches.
 */
@Injectable()
export class ProductRepository implements IProductRepository {
  private readonly logger = new Logger(ProductRepository.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Finds products within a given radius from the customer's location, with pagination.
   * @param customerLocation Customer's location
   * @param radiusKm Search radius in kilometers
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns Paginated results with products including distances
   */
  async findProductsWithinRadius(
    customerLocation: ICustomerAddress,
    radiusKm: number,
    page: number,
    limit: number,
  ): Promise<{ results: IProximitySearchResult[]; total: number }> {
    const offset = (page - 1) * limit;
    const customerGeoPoint = `'SRID=4326;POINT(${customerLocation.lng} ${customerLocation.lat})'`;
    const maxDeliveryRadiusMeters = radiusKm * 1000;

    try {
      const whereClause = this.buildWhereClause(
        customerGeoPoint,
        maxDeliveryRadiusMeters,
      );

      const resultsQuery = `
        SELECT
          p.*,
          ST_Distance(va."geopoint", ST_GeogFromText(${customerGeoPoint})) AS distance
        FROM "Product" p
        JOIN "Vendor" v ON v.id = p."vendorId"
        JOIN "VendorAddress" va ON va."vendorId" = v.id
        WHERE ${whereClause}
        ORDER BY distance ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM "Product" p
        JOIN "Vendor" v ON v.id = p."vendorId"
        JOIN "VendorAddress" va ON va."vendorId" = v.id
        WHERE ${whereClause}
      `;

      const results = await this.prisma.$queryRawUnsafe(resultsQuery);
      const countResult = await this.prisma.$queryRawUnsafe(countQuery);

      const total = Number((countResult as any)[0].total);

      const proximityResults = this.processResults(results as any[]);

      return {
        results: proximityResults,
        total,
      };
    } catch (error) {
      this.logger.error('Error in proximity search:', error);
      return {
        results: [],
        total: 0,
      };
    }
  }

  /**
   * Builds the common WHERE clause for product proximity queries.
   * @param customerGeoPoint Customer's geopoint
   * @param maxDeliveryRadiusMeters Maximum delivery radius in meters
   * @returns SQL WHERE clause string
   */
  private buildWhereClause(
    customerGeoPoint: string,
    maxDeliveryRadiusMeters: number,
  ): string {
    return `
      p."is_active" = TRUE
      AND p."approval_status" = '${ProductApprovalStatus.APPROVED}'::"ProductApprovalStatus"
      AND v."is_active" = TRUE
      AND v."is_available_today" = TRUE
      AND va."is_active" = TRUE
      AND ST_DWithin(va."geopoint", ST_GeogFromText(${customerGeoPoint}), ${maxDeliveryRadiusMeters})
    `;
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

  /**
   * Processes raw query results into IProximitySearchResult array.
   * @param results Raw query results
   * @returns Processed proximity search results
   */
  private processResults(results: any[]): IProximitySearchResult[] {
    return results.map((row) => {
      const { distance, ...product } = row;
      return {
        ...product,
        distance: this.formatDistance(distance / 1000),
      };
    });
  }
}
