import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  IUserAddress,
  IUserAddressRetriever,
} from '../interfaces/search.interfaces';

/**
 * Retrieves user's default active address from the database.
 */
@Injectable()
export class UserAddressRetriever implements IUserAddressRetriever {
  private readonly logger = new Logger(UserAddressRetriever.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves the user's default active address.
   * @param userId The user's ID
   * @returns User's address or null if not found
   */
  async getUser(userId: string): Promise<{ name: string } | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id: userId },
      });
    } catch (error) {
      this.logger.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Retrieves the user's default active address.
   * @param userId The user's ID
   * @returns User's address or null if not found
   */
  async getUserAddress(
    userId: string,
  ): Promise<IUserAddress | null> {
    try {
      const address = await this.prisma.$queryRaw<IUserAddress[]>`
        SELECT
          ca.id,
          ca."isServiceable",
          ST_Y(ca.geopoint::geometry) AS lat,
          ST_X(ca.geopoint::geometry) AS lng,
          l."serviceRadiusKm"
        FROM "CustomerAddress" ca
        LEFT JOIN "Location" l
          ON l.id = ca."locationId"
        WHERE ca."customerId" = ${userId}
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
      this.logger.error('Error fetching user address:', error);
      return null;
    }
  }
}
