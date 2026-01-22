import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { VendorAddress } from '@prisma/client';
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
   * Checks if an address already exists for the vendor and throws BadRequestException if it does.
   * Sets isServiceable to true by default.
   * @param vendorId - The unique identifier of the vendor.
   * @param data - The address data to create.
   * @returns The created VendorAddress.
   */
  async createAddress(vendorId: string, data: CreateAddressDto) {
    // Check if address already exists
    const existingAddress = await this.prisma.vendorAddress.findUnique({
      where: { vendorId },
    });
    if (existingAddress) {
      throw new BadRequestException('Address already exists for this vendor');
    }

    if (data.lat === undefined || data.lng === undefined) {
      throw new BadRequestException('Latitude and longitude are required');
    }

    const locationId = await this.locationService.findOrCreateLocation({
      lat: data.lat,
      lng: data.lng,
      state: data.state,
    });

    const vendorAddress = await this.prisma.$queryRaw<
      {
        id: string;
      }[]
    >`
      INSERT INTO "VendorAddress" (vendorId, address, locationId, pincode, geo_point,isServiceable)
      VALUES ('${vendorId}','${data.address}','${locationId}, '${data.pincode}',
        ST_MakePoint(${data.lng}, ${data.lat})::geography,true
      )
      RETURNING id;
    `;

    return vendorAddress;
  }

  /**
   * Retrieves a VendorAddress by vendor ID.
   * @param vendorId - The unique identifier of the vendor.
   * @returns The VendorAddress.
   */
  async getAddressByVendorId(vendorId: string): Promise<VendorAddress> {
    const address = await this.prisma.vendorAddress.findUnique({
      where: { vendorId },
    });

    if (!address) {
      throw new NotFoundException('Vendor address not found');
    }

    return address;
  }

  /**
   * Updates an existing VendorAddress by vendorId.
   * If lat/lng are provided, updates locationId and geoPoint using raw SQL.
   * @param vendorId - The unique identifier of the vendor.
   * @param data - The fields to update.
   * @returns The updated VendorAddress.
   */
  async updateAddress(
    vendorId: string,
    data: UpdateAddressDto,
  ): Promise<VendorAddress> {
    const updateData: any = {};

    if (data.pincode !== undefined) {
      updateData.pincode = data.pincode;
    }
    if (data.address !== undefined) {
      updateData.address = data.address;
    }

    if (data.lat !== undefined && data.lng !== undefined) {
      const locationId = await this.locationService.findOrCreateLocation({
        lat: data.lat,
        lng: data.lng,
        state: data.state,
      });
      updateData.locationId = locationId;
    }

    const updatedAddress = await this.prisma.vendorAddress.update({
      where: { vendorId },
      data: updateData,
    });

    // If lat/lng provided, update geoPoint using raw SQL
    if (data.lat !== undefined && data.lng !== undefined) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "VendorAddress" SET "geoPoint" = ST_MakePoint(${data.lng}, ${data.lat})::geography WHERE "vendorId" = '${vendorId}'`,
      );
    }

    return updatedAddress;
  }

  /**
   * Retrieves a VendorAddress by vendor ID with location details.
   * @param vendorId - The unique identifier of the vendor.
   * @returns The VendorAddress with location included.
   */
  async getAddressByVendorIdWithLocation(
    vendorId: string,
  ): Promise<VendorAddress & { location?: any }> {
    const address = await this.prisma.vendorAddress.findUnique({
      where: { vendorId },
      include: { location: true },
    });

    if (!address) {
      throw new NotFoundException('Vendor address not found');
    }

    return address;
  }

  /**
   * Soft deletes a VendorAddress by vendor ID by setting isActive to false.
   * @param vendorId - The unique identifier of the vendor.
   * @returns The updated VendorAddress.
   */
  async deleteAddress(vendorId: string): Promise<VendorAddress> {
    const address = await this.prisma.vendorAddress.findUnique({
      where: { vendorId },
    });

    if (!address) {
      throw new NotFoundException('Vendor address not found');
    }

    return await this.prisma.vendorAddress.update({
      where: { vendorId },
      data: { isActive: false },
    });
  }
}
