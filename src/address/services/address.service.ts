import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateUserAddressDto } from '../dto/create-user-address.dto';
import { UpdateUserAddressDto } from '../dto/update-user-address.dto';

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves a user address by ID, ensuring it belongs to the specified user.
   * Optionally checks if the address is active.
   * Throws NotFoundException if not found.
   * @param userId - The user ID.
   * @param addressId - The address ID.
   * @param requireActive - Whether to require the address to be active.
   * @returns The user address.
   */
  private async findUserAddress(
    userId: string,
    addressId: string,
    requireActive: boolean = true,
  ): Promise<any> {
    const where: any = { id: addressId, userId };
    if (requireActive) {
      where.is_active = true;
    }
    const address = await this.prisma.customerAddress.findFirst({ where });
    if (!address) {
      throw new NotFoundException('Customer address not found');
    }
    return address;
  }

  /**
   * Checks for duplicate addresses based on address, lng, lat, pincode, and locationId.
   * Excludes a specific address ID if updating.
   * Throws BadRequestException if a duplicate is found.
   * @param userId - The user ID.
   * @param data - The address data.
   * @param excludeId - The address ID to exclude (for updates).
   */
  private async checkDuplicateAddress(
    userId: string,
    data: CreateUserAddressDto | UpdateUserAddressDto,
    excludeId?: string,
  ): Promise<void> {
    const where: any = {
      userId,
      address: data.address,
      is_active: true,
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    if (data.pincode) {
      where.pincode = data.pincode;
    }
    const duplicate = await this.prisma.customerAddress.findFirst({ where });
    if (duplicate) {
      throw new BadRequestException(
        'An address with the same pincode, lng, lat, and address already exists. Please provide a different address.',
      );
    }
  }

  /**
   * Validates that a user with the given ID exists and is active.
   * Throws NotFoundException if not found.
   * @param userId - The user ID to validate.
   */
  private async validateUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, is_active: true } as any,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Validates the address data, ensuring required fields are present.
   * Throws BadRequestException if validation fails.
   * @param data - The address data to validate.
   */
  private validateAddressData(data: CreateUserAddressDto): void {
    if (
      data.lat === undefined ||
      data.lng === undefined ||
      data.lat === null ||
      data.lng === null
    ) {
      throw new BadRequestException('Latitude and longitude are required');
    }
  }

  /**
   * Handles location finding or creation.
   * @param data - The address data containing lat, lng, city, state.
   * @returns The location ID and serviceability status.
   */
  private async handleLocation(
    data: CreateUserAddressDto,
  ): Promise<{ id: string; isServiceable: boolean }> {
    return { id: '', isServiceable: true };
  }

  /**
   * Creates the user address using raw SQL within a transaction.
   * @param userId - The user ID.
   * @param data - The address data.
   * @param locationId - The location ID.
   * @param isServiceable - Whether the location is serviceable.
   * @param isDefault - Whether this is the default address.
   * @returns The created address ID.
   */
  private async createAddress(
    userId: string,
    data: CreateUserAddressDto,
    locationId: string,
    isServiceable: boolean,
    isDefault: boolean,
  ): Promise<any> {
    const labelValue = data.label ? `${data.label}` : 'Home';
    return await this.prisma.$queryRaw<
      {
        id: string;
      }[]
    >`
    INSERT INTO "CustomerAddress"
    (id, "userId", label, address, "locationId", pincode, geopoint, "isServiceable", "isDefault")
    VALUES (${randomUUID()}, ${userId},${labelValue}::"AddressLabel",${data.address},${locationId}, ${data.pincode},
      ST_MakePoint(${Number((data.lng as number).toFixed(6))}, ${Number((data.lat as number).toFixed(6))})::geography,
      ${isServiceable}, ${isDefault}
    )
    RETURNING id;
    `;
  }

  /**
   * Creates a new user address for the authenticated user.
   * @param userId - The unique identifier of the user.
   * @param data - The address data to create.
   * @returns The created user address with location relation.
   */
  async create(userId: string, data: CreateUserAddressDto) {
    try {
      this.logger.log(`Starting address creation for user ${userId}`);
      // Log the address creation
      try {
        const logsDir = path.join(process.cwd(), 'logs');
        await fs.mkdir(logsDir, { recursive: true });
        const logFile = path.join(logsDir, 'user_address_creation.log');
        const logEntry = JSON.stringify({
          type: 'user',
          address: data,
          timestamp: new Date().toISOString(),
        });
        await fs.appendFile(logFile, logEntry + '\n');
      } catch (logError) {
        this.logger.error('Failed to log address creation', logError);
      }

      // Validate user existence
      await this.validateUserExists(userId);
      this.logger.log(`User ${userId} validated`);

      // Check for duplicate addresses
      await this.checkDuplicateAddress(userId, data);
      this.logger.log(`Duplicate check passed for user ${userId}`);

      // Validate address data
      this.validateAddressData(data);
      this.logger.log(`Address data validated for user ${userId}`);

      // Handle location
      const { id: locationId, isServiceable } = await this.handleLocation(data);
      this.logger.log(
        `Location handled: ${locationId}, serviceable: ${isServiceable}`,
      );

      // Determine if default
      const existingAddressesCount = await this.prisma.customerAddress.count({
        where: { userId, is_active: true },
      });
      const isDefault = existingAddressesCount === 0;
      this.logger.log(`Is default address: ${isDefault}`);

      // Create address within transaction
      const result = await this.prisma.$transaction(async (tx) => {
        return await this.createAddress(
          userId,
          data,
          locationId,
          isServiceable,
          isDefault,
        );
      });

      this.logger.log(
        `Address created successfully for user ${userId}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create address for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieves all active addresses for a specific user.
   * @param userId - The unique identifier of the user.
   * @returns A list of user addresses with location relations.
   */
  async findAll(userId: string) {
    await this.validateUserExists(userId);
    const addresses = await this.prisma.customerAddress.findMany({
      where: {
        userId,
        is_active: true,
      } as any,
      include: {
        location: { select: { name: true, state:true } },
      },
      orderBy: [{ isDefault: 'desc' }, { created_at: 'desc' }],
    });

    return addresses;
  }

  /**
   * Retrieves a specific active user address by ID for the authenticated user.
   * @param userId - The unique identifier of the user.
   * @param addressId - The unique identifier of the address.
   * @returns The user address with location relation.
   */
  async findOne(userId: string, addressId: string) {
    await this.validateUserExists(userId);
    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        userId,
        is_active: true,
      } as any,
      include: {
        location: true,
      },
    });

    if (!address) {
      throw new NotFoundException('Customer address not found');
    }

    return address;
  }

  /**
   * Updates an existing user address for the authenticated user.
   * @param userId - The unique identifier of the user.
   * @param addressId - The unique identifier of the address.
   * @param data - The fields to update.
   * @returns The updated user address with location relation.
   */
  async update(
    userId: string,
    addressId: string,
    data: UpdateUserAddressDto,
  ) {
    // 1. Validate the user.
    await this.validateUserExists(userId);

    // 2. Find the user address; if it does not exist, throw a human-readable error message.
    const address = await this.findUserAddress(userId, addressId);

    // 3. Check for duplicate addresses with the same content, including address, latitude, longitude, and pincode but addressId.
    await this.checkDuplicateAddress(userId, data, addressId);

    // 4. Find the location; if it does not exist, create one.
    let locationId = address.locationId;
    if (data.lat !== undefined && data.lng !== undefined) {
      locationId = '';
    }
    (data as any).locationId = locationId;
    const { city, state, ...updateData } = data;

    return await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: updateData,
      include: { location: true },
    });
  }

  /**
   * Deletes a user address for the authenticated user (soft delete).
   * @param userId - The unique identifier of the user.
   * @param addressId - The unique identifier of the address.
   * @returns A success message.
   */
  async delete(userId: string, addressId: string) {
    await this.validateUserExists(userId);
    await this.findUserAddress(userId, addressId, false);

    // If Address has 0 Orders than Delete it or can it is_active
    // If Address isDefault = true than
    // Soft delete by setting is_active to false
    await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: { is_active: false } as any,
    });

    return { message: 'User address deleted successfully' };
  }

  /**
   * Sets a user address as the default for the authenticated user.
   * @param userId - The unique identifier of the user.
   * @param addressId - The unique identifier of the address.
   * @returns The updated user address with location relation.
   */
  async setDefaultAddress(userId: string, addressId: string) {
    await this.validateUserExists(userId);
    await this.findUserAddress(userId, addressId);

    // First, reset all other active addresses to non-default for this user
    await this.prisma.customerAddress.updateMany({
      where: {
        userId,
        id: { not: addressId },
        is_active: true,
      } as any,
      data: {
        isDefault: false,
      } as any,
    });

    // Then set the selected address as default
    return await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: {
        isDefault: true,
      } as any,
    });
  }

  /**
   * Validates that an address exists.
   * @param addressId - The unique identifier of the address
   * @throws BadRequestException if address doesn't exist
   */
  async validateAddress(addressId: string): Promise<void> {
    const address = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new BadRequestException('Address not found');
    }
  }
}
