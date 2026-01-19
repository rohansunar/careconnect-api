import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { LocationService } from '../../common/services/location.service';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';

@Injectable()
export class VendorAddressService {
  constructor(
    private prisma: PrismaService,
    private locationService: LocationService,
  ) {}

  /**
   * Creates a new VendorAddress for the given vendorId.
   * @param vendorId - The unique identifier of the vendor.
   * @param data - The address data to create.
   * @returns The created VendorAddress.
   */
  async createAddress(vendorId: string, data: CreateAddressDto): Promise<any> {
    if (data.lat === undefined || data.lng === undefined) {
      throw new BadRequestException('Latitude and longitude are required');
    }
    const locationId = await this.locationService.findOrCreateLocation({
      lat: data.lat,
      lng: data.lng,
      city: data.city,
    });

    // Create vendor address
    const address = await this.prisma.vendorAddress.create({
      data: {
        vendorId,
        locationId,
        lng: data.lng,
        lat: data.lat,
        pincode: data.pincode,
        address: data.address,
      },
    });

    return address;
  }

  /**
   * Retrieves a VendorAddress by vendor ID.
   * @param vendorId - The unique identifier of the vendor.
   * @returns The VendorAddress.
   */
  async getAddressByVendorId(vendorId: string): Promise<any> {
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
  async updateAddress(vendorId: string, data: UpdateAddressDto): Promise<any> {
    const updateData: any = {
      lng: data.lng,
      lat: data.lat,
      pincode: data.pincode,
      address: data.address,
    };

    if (data.lat !== undefined && data.lng !== undefined) {
      const locationId = await this.locationService.findOrCreateLocation({
        lat: data.lat,
        lng: data.lng,
        city: data.city,
      });
      updateData.locationId = locationId;
    }

    const updatedAddress = await this.prisma.vendorAddress.update({
      where: { vendorId },
      data: updateData,
    });

    return updatedAddress;
  }

  /**
   * Retrieves a VendorAddress by vendor ID with location details.
   * @param vendorId - The unique identifier of the vendor.
   * @returns The VendorAddress with location.name included or null if not found.
   */
  async getAddressByVendorIdWithLocation(vendorId: string): Promise<any> {
    const address = await this.prisma.vendorAddress.findUnique({
      where: { vendorId },
    });

    if (address) {
      const { locationId, vendorId, ...updateAddress } = address;
      return updateAddress;
    }
    return address;
  }

  /**
   * Deletes a VendorAddress by vendor ID.
   * @param vendorId - The unique identifier of the vendor.
   */
  async deleteAddress(vendorId: string): Promise<any> {
    return await this.prisma.vendorAddress.delete({
      where: { vendorId },
    });
  }
}
