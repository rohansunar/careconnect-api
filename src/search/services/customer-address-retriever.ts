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
  async getCustomer(customerId: string): Promise<{ name: string } | null> {
    try {
      return await this.prisma.customer.findUnique({
        where: { id: customerId },
      });
    } catch (error) {
      this.logger.error('Error fetching customer:', error);
      return null;
    }
  }

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
          ca.id,
          ca."isServiceable",
          ST_Y(ca.geopoint::geometry) AS lat,
          ST_X(ca.geopoint::geometry) AS lng,
          l."serviceRadiusKm"
        FROM "CustomerAddress" ca
        LEFT JOIN "Location" l
          ON l.id = ca."locationId"
        WHERE ca."customerId" = ${customerId}
        AND ca."is_active" = true AND ca."isDefault" = true;`;

      if (
        address.length > 0 &&
        address[0].lat !== null &&
        address[0].lng !== null
      ) {
        return {
          lat: address[0].lat,
          lng: address[0].lng,
          isServiceable: address[0].isServiceable,
          serviceRadiusKm: address[0].serviceRadiusKm,
        };
      }
      return null;
    } catch (error) {
      this.logger.error('Error fetching customer address:', error);
      return null;
    }
  }
}
