import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class CustomerAddressService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new customer address for the authenticated customer.
   * @param customerId - The unique identifier of the customer.
   * @param data - The address data to create.
   * @returns The created customer address with city relation.
   */
  async create(
    customerId: string,
    data: {
      label?: string;
      address?: string;
      cityId?: string;
      pincode?: string;
    },
  ) {
    // Validate city exists if cityId is provided
    if (data.cityId) {
      const city = await this.prisma.city.findUnique({
        where: { id: data.cityId },
      });
      if (!city) {
        throw new BadRequestException('City not found');
      }
    }

    const customerAddress = await this.prisma.customerAddress.create({
      data: {
        customerId,
        ...data,
      },
      include: {
        city: true,
      },
    });

    return customerAddress;
  }

  /**
   * Retrieves all addresses for a specific customer.
   * @param customerId - The unique identifier of the customer.
   * @returns A list of customer addresses with city relations.
   */
  async findAll(customerId: string) {
    const addresses = await this.prisma.customerAddress.findMany({
      where: { customerId },
      include: {
        city: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return addresses;
  }

  /**
   * Retrieves a specific customer address by ID for the authenticated customer.
   * @param customerId - The unique identifier of the customer.
   * @param addressId - The unique identifier of the address.
   * @returns The customer address with city relation.
   */
  async findOne(customerId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId,
      },
      include: {
        city: true,
      },
    });

    if (!address) {
      throw new NotFoundException('Customer address not found');
    }

    return address;
  }

  /**
   * Updates an existing customer address for the authenticated customer.
   * @param customerId - The unique identifier of the customer.
   * @param addressId - The unique identifier of the address.
   * @param data - The fields to update.
   * @returns The updated customer address with city relation.
   */
  async update(
    customerId: string,
    addressId: string,
    data: {
      label?: string;
      address?: string;
      cityId?: string;
      pincode?: string;
    },
  ) {
    // Check if address exists and belongs to customer
    const existingAddress = await this.prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId,
      },
    });

    if (!existingAddress) {
      throw new NotFoundException('Customer address not found');
    }

    // Validate city exists if cityId is provided
    if (data.cityId) {
      const city = await this.prisma.city.findUnique({
        where: { id: data.cityId },
      });
      if (!city) {
        throw new BadRequestException('City not found');
      }
    }

    const updatedAddress = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data,
      include: {
        city: true,
      },
    });

    return updatedAddress;
  }

  /**
   * Deletes a customer address for the authenticated customer.
   * @param customerId - The unique identifier of the customer.
   * @param addressId - The unique identifier of the address.
   * @returns A success message.
   */
  async delete(customerId: string, addressId: string) {
    // Check if address exists and belongs to customer
    const existingAddress = await this.prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId,
      },
    });

    if (!existingAddress) {
      throw new NotFoundException('Customer address not found');
    }

    await this.prisma.customerAddress.delete({
      where: { id: addressId },
    });

    return { message: 'Customer address deleted successfully' };
  }
}
