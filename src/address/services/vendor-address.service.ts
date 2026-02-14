import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { VendorAddress } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { LocationService } from '../../location/services/location.service';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

@Injectable()
export class VendorAddressService {
  private readonly logger = new Logger(VendorAddressService.name);

  constructor(
    private prisma: PrismaService,
    private locationService: LocationService,
  ) {}

  /**
   * Validates that a vendor with the given ID exists and is active.
   * Throws NotFoundException if not found.
   * @param vendorId - The vendor ID to validate.
   */
  private async validateVendorExists(vendorId: string): Promise<void> {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, is_active: true },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
  }

  /**
   * Validates the address data, ensuring required fields are present.
   * Throws BadRequestException if validation fails.
   * @param data - The address data to validate.
   */
  private validateAddressData(data: CreateAddressDto): void {
    if (
      data.lat === undefined ||
      data.lng === undefined ||
      data.lat === null ||
      data.lng === null
    ) {
      throw new BadRequestException('Latitude and longitude are required');
    }

    if (
      data.city === undefined ||
      data.city === null ||
      data.city === '' ||
      data.state === undefined ||
      data.state === null ||
      data.state === ''
    ) {
      throw new BadRequestException(
        'City and state are required for location lookup',
      );
    }
  }

  /**
   * Checks if a vendor address already exists.
   * Throws BadRequestException if an address already exists for the vendor.
   * @param vendorId - The vendor ID to check.
   */
  private async checkVendorAddressExists(vendorId: string): Promise<void> {
    const existingAddress = await this.prisma.vendorAddress.findFirst({
      where: { vendorId, is_active: true },
    });
    if (existingAddress) {
      throw new BadRequestException(
        'A vendor can only have one address. An address already exists for this vendor.',
      );
    }
  }

  /**
   * Handles location finding or creation.
   * @param data - The address data containing lat, lng, city, state.
   * @returns The location ID and serviceability status.
   */
  private async handleLocation(
    data: CreateAddressDto,
  ): Promise<{ id: string; isServiceable: boolean }> {
    return await this.locationService.findOrCreateLocation({
      lat: data.lat as number,
      lng: data.lng as number,
      city: data.city,
      state: data.state,
    });
  }

  /**
   * Creates the vendor address using raw SQL.
   * @param vendorId - The vendor ID.
   * @param data - The address data.
   * @param locationId - The location ID.
   * @param isServiceable - Whether the location is serviceable.
   * @returns The created address ID.
   */
  private async createAddress(
    vendorId: string,
    data: CreateAddressDto,
    locationId: string,
    isServiceable: boolean,
  ): Promise<any> {
    return await this.prisma.$queryRaw<
      {
        id: string;
      }[]
    >`
    INSERT INTO "VendorAddress" 
    (id, "vendorId", "locationId", address, pincode, geopoint, "updatedAt", "isServiceable")
    VALUES (${randomUUID()}, ${vendorId}, ${locationId}, ${data.address}, ${data.pincode},
      ST_MakePoint(${Number((data.lng as number).toFixed(6))}, ${Number((data.lat as number).toFixed(6))})::geography,
      ${new Date()},
      ${isServiceable}
    )
    RETURNING id;
    `;
  }

  /**
   * Creates a new VendorAddress for the given vendorId.
   * @param vendorId - The unique identifier of the vendor.
   * @param data - The address data to create.
   * @returns The created VendorAddress.
   */
  async create(vendorId: string, data: CreateAddressDto) {
    try {
      this.logger.log(`Starting address creation for vendor ${vendorId}`); // Ensure logs directory exists
      if (!fs.existsSync('logs')) {
        fs.mkdirSync('logs');
      }

      // Log the address creation
      const logEntry = {
        type: 'vendor',
        address: data,
        timestamp: new Date().toISOString(),
      };
      fs.appendFileSync(
        'logs/vendor_address_creation.log',
        JSON.stringify(logEntry) + '\n',
      );

      // Validate vendor existence
      await this.validateVendorExists(vendorId);
      this.logger.log(`Vendor ${vendorId} validated`);

      // Check if address already exists for vendor
      await this.checkVendorAddressExists(vendorId);
      this.logger.log(`Existing address check passed for vendor ${vendorId}`);

      // Validate address data
      this.validateAddressData(data);
      this.logger.log(`Address data validated for vendor ${vendorId}`);

      // Handle location
      const { id: locationId, isServiceable } = await this.handleLocation(data);
      this.logger.log(
        `Location handled: ${locationId}, serviceable: ${isServiceable}`,
      );

      // Create address within transaction
      const result = await this.prisma.$transaction(async () => {
        return await this.createAddress(
          vendorId,
          data,
          locationId,
          isServiceable,
        );
      });

      this.logger.log(`Address created successfully for vendor ${vendorId}`);

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create address for vendor ${vendorId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
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
      const { id: locationId, isServiceable } = await this.handleLocation(data);
      updateData.locationId = locationId;
      updateData.isServiceable = isServiceable;
    }
    const updatedAddress = await this.prisma.vendorAddress.update({
      where: { vendorId , is_active:true },
      data: updateData,
    });

    // If lat/lng provided, update geoPoint using raw SQL
    if (data.lat !== undefined && data.lng !== undefined) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "VendorAddress" SET "geopoint" = ST_MakePoint(${data.lng}, ${data.lat})::geography WHERE "vendorId" = '${vendorId}'`,
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
  ): Promise<(Partial<VendorAddress> & { location?: any }) | null> {
    try {
      if (!vendorId || vendorId.trim() === '') {
        throw new BadRequestException('Vendor ID is required');
      }

      const addresses = await this.prisma.$queryRaw<
        {
          id: string
          is_active: boolean
          address: string
          isServiceable: boolean
          pincode: string | null
          latitude: number | null
          longitude: number | null
          locationName: string | null
          locationState: string | null
        }[]
      >`SELECT 
        a.id,
        a.is_active,
        a.address,
        a."isServiceable",
        a.pincode,
        ST_Y(a.geopoint::geometry) AS latitude,
        ST_X(a.geopoint::geometry) AS longitude,
        l.name AS "locationName",
        l.state AS "locationState"
      FROM "VendorAddress" a
      LEFT JOIN "Location" l ON l.id = a."locationId"
      WHERE a."vendorId" = ${vendorId} AND a.is_active = true;
      `;

      if (!addresses || addresses.length === 0) {
        this.logger.warn(`No address found for vendor: ${vendorId}`);
        throw new NotFoundException(
          'No vendor address found. Please add an address for your vendor profile.',
        );
      }

      const address = addresses[0];
      
      return {
        id: address.id,
        is_active: address.is_active,
        address: address.address,
        isServiceable: address.isServiceable,
        pincode: address.pincode,
        location: address.locationName ? {
          name: address.locationName,
          state: address.locationState,
          lat: address.latitude,
          lng: address.longitude,
        } : undefined,
      };
    } catch (error) {
      // Re-throw NestJS exceptions as-is for proper HTTP error responses
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        this.logger.warn(`Error retrieving vendor address: ${error.message}`);
        throw error;
      }

      // Log the full error for debugging purposes
      this.logger.error(
        `Failed to retrieve address for vendor ${vendorId}: ${error.message}`,
        error.stack,
      );

      // Return a user-friendly error message
      throw new BadRequestException(
        'Unable to retrieve vendor address. Please try again later or contact support if the problem persists.',
      );
    }
  }

  /**
   * Soft deletes a VendorAddress by vendor ID by setting is_active to false.
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

    await this.prisma.$executeRawUnsafe(
      `UPDATE "VendorAddress" SET "is_active" = false WHERE "vendorId" = '${vendorId}'`,
    );
    const updatedAddress = await this.prisma.vendorAddress.findUnique({
      where: { vendorId },
    });
    if (!updatedAddress) {
      throw new NotFoundException('Vendor address not found');
    }
    return updatedAddress;
  }
}
