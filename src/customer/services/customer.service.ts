import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves the profile information for a specific vendor.
   * @param customerId - The unique identifier of the vendor.
   * @returns The customer's profile data including id, name, phone, email.
   */
  async getProfile(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    return customer;
  }

  /**
   * Updates the profile information for a specific vendor with validation.
   * @param customerId - The unique identifier of the vendor.
   * @param data - The fields to update (name, phone, email).
   * @returns The updated customer's profile data.
   */
  async updateProfile(
    customerId: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
    },
  ) {
    // Validate phone number format if provided (E.164 international format)
    if (data.phone && !/^\+[1-9]\d{1,14}$/.test(data.phone)) {
      throw new BadRequestException('Invalid phone number format');
    }

    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    return customer;
  }
}


