import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';

@Injectable()
export class VendorAddressService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new VendorAddress for the given vendorId.
   * @param vendorId - The unique identifier of the vendor.
   * @param data - The address data to create.
   * @returns The created VendorAddress.
   */
  async createAddress(vendorId: string, data: CreateAddressDto): Promise<any> {
    // Query for duplicate location
    const whereClause: any = {
      name: data.address,
      state: data.state,
    };
    if (data.lat !== undefined) {
      whereClause.lat = data.lat;
    }
    if (data.lng !== undefined) {
      whereClause.lng = data.lng;
    }
    let location = await this.prisma.location.findFirst({
      where: whereClause,
    });

    let locationId: string;
    if (location) {
      locationId = location.id;
    } else {
      // Create new location
      location = await this.prisma.location.create({
        data: {
          name: data.city,
          state: data.state,
          country: 'India', // Default country
          lat: data.lat!,
          lng: data.lng!,
          serviceRadiusKm: 50, // Default radius
          isServiceable: false, // Default
        },
      });
      locationId = location.id;
    }

    // Create vendor address
    const address = await this.prisma.vendorAddress.create({
      data: {
        vendorId,
        locationId,
        state: data.state,
        lng: data.lng,
        lat: data.lat,
        pincode: data.pincode,
        address: data.address,
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
