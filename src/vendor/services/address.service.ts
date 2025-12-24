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
  constructor(private prisma: PrismaService) {}

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

    const { city, ...rest } = data;
    let cityId: string | undefined;
    if (city) {
      const cityRecord = await this.prisma.city.findFirst({
        where: { name: city },
      });
      if (!cityRecord) {
        throw new BadRequestException('City not found');
      }
      cityId = cityRecord.id;
    }
    console.log({
      vendorId,
      ...rest,
      ...(cityId && { cityId }),
    });
    const address = await this.prisma.vendorAddress.create({
      data: {
        vendorId,
        ...rest,
        ...(cityId && { cityId }),
      },
    });

    return address;
  }

  /**
   * Retrieves a VendorAddress by its ID.
   * @param id - The unique identifier of the address.
   * @returns The VendorAddress.
   */
  async getAddressById(id: string): Promise<any> {
    const address = await this.prisma.vendorAddress.findUnique({
      where: { id },
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
    const existingAddress = await this.prisma.vendorAddress.findUnique({
      where: { id },
    });

    if (!existingAddress) {
      throw new NotFoundException('Vendor address not found');
    }

    const { city, ...rest } = data;
    let updateData: any = { ...rest };
    if (city !== undefined) {
      if (city) {
        const cityRecord = await this.prisma.city.findFirst({
          where: { name: city },
        });
        if (!cityRecord) {
          throw new BadRequestException('City not found');
        }
        updateData.cityId = cityRecord.id;
      } else {
        updateData.cityId = null;
      }
    }

    const updatedAddress = await this.prisma.vendorAddress.update({
      where: { id },
      data: updateData,
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

    return address;
  }

  /**
   * Deletes a VendorAddress by ID.
   * @param id - The unique identifier of the address.
   */
  async deleteAddress(id: string): Promise<void> {
    const existingAddress = await this.prisma.vendorAddress.findUnique({
      where: { id },
    });

    if (!existingAddress) {
      throw new NotFoundException('Vendor address not found');
    }

    await this.prisma.vendorAddress.delete({
      where: { id },
    });
  }
}
