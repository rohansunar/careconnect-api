import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(
    private prisma: PrismaService,
  ) {}

  /**
   * Creates a new VendorAddress for the given vendorId, ensuring no duplicate address exists for the vendor.
   * @param vendorId - The unique identifier of the vendor.
   * @param data - The address data to create.
   * @returns The created VendorAddress.
   */
  async createAddress(vendorId: string, data: CreateAddressDto): Promise<any> {
    // Check if vendor already has an address
    const existingAddress = await this.prisma.vendorAddress.findUnique({
      where: { vendorId },
    });
    if (existingAddress) {
      throw new BadRequestException('Vendor already has an address');
    }
    // Check if location exists
    const locationExists = await this.prisma.location.findUnique({
      where: { id: data.locationId },
    });
    if (!locationExists) {
      throw new BadRequestException('Location does not exist');
    }

    const address = await this.prisma.vendorAddress.create({
      data: {
        vendorId,
        ...data,
      },
    });

    return address;
  }

  /**
   * Retrieves a VendorAddress by its ID.
   * @param id - The unique identifier of the address.
   * @returns The VendorAddress.
   */
  async getAddressById(vendorId: string): Promise<any> {
    const address = await this.prisma.vendorAddress.findUnique({
      where: { vendorId },
    });

    if (!address) {
      throw new NotFoundException('Vendor address not found');
    }

    return address;
  }

  /**
   * Updates an existing VendorAddress by ID.
   * @param id - The unique identifier of the address.
   * @param data - The fields to update.
   * @returns The updated VendorAddress.
   */
  async updateAddress(id: string, data: UpdateAddressDto): Promise<any> {
    const updatedAddress = await this.prisma.vendorAddress.update({
      where: { id },
      data,
    });

    return updatedAddress;
  }

  /**
   * Retrieves a VendorAddress by vendor ID.
   * @param vendorId - The unique identifier of the vendor.
   * @returns The VendorAddress or null if not found.
   */
  async getAddressByVendorId(vendorId: string): Promise<any> {
    const address = await this.prisma.vendorAddress.findUnique({
      where: { vendorId },
    });
    if (address && address.locationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: address.locationId },
        select: { name: true },
      });
      if (location) {
        (address as any).location = location.name;
        delete (address as any).locationId;
      }
    }
    return address;
  }

  /**
   * Deletes a VendorAddress by ID.
   * @param id - The unique identifier of the address.
   */
  async deleteAddress(id: string): Promise<any> {
    return await this.prisma.vendorAddress.delete({
      where: { id },
    });
  }
}
