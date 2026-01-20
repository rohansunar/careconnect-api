import { Injectable } from '@nestjs/common';
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
      const address = await this.prisma.customerAddress.findFirst({
        where: {
          customerId,
          isDefault: true,
          isActive: true,
        },
        include: {
          location: true, // whatever fields exist
        },
      });
      if (address && address.lat !== null && address.lng !== null) {
        return {
          lat: address.lat,
          lng: address.lng,
          location: address.location,
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching customer address:', error);
      return null;
    }
  }
}
