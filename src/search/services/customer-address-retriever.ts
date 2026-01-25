import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  ICustomerAddress,
  ICustomerAddressRetriever,
} from '../interfaces/search.interfaces';

/**
 * Retrieves customer's default active address from the database.
 */
@Injectable()
export class CustomerAddressRetriever implements ICustomerAddressRetriever {
  private readonly logger = new Logger(CustomerAddressRetriever.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves the customer's default active address.
   * @param customerId The customer's ID
   * @returns Customer's address or null if not found
   */
  async getCustomerAddress(
    customerId: string,
  ): Promise<ICustomerAddress | null> {
    try {
      const address = await this.prisma.$queryRaw<ICustomerAddress[]>`
                      SELECT
                        id,
                        "isServiceable",
                        ST_Y(geoPoint::geometry) AS lat,
                        ST_X(geoPoint::geometry) AS lng
                      FROM "CustomerAddress"
                      WHERE "customerId" = ${customerId}
                      AND "is_active" = true AND "isDefault" = true;`;

      if (address.length > 0 && address[0].lat !== null && address[0].lng !== null) {
        return {
          lat: address[0].lat,
          lng: address[0].lng,
          isServiceable: address[0].isServiceable,
        };
      }
      return null;
    } catch (error) {
      this.logger.error('Error fetching customer address:', error);
      return null;
    }
  }
}
