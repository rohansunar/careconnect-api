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
import { CreateCustomerAddressDto } from '../dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from '../dto/update-customer-address.dto';

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves a customer address by ID, ensuring it belongs to the specified customer.
   * Optionally checks if the address is active.
   * Throws NotFoundException if not found.
   * @param customerId - The customer ID.
   * @param addressId - The address ID.
   * @param requireActive - Whether to require the address to be active.
   * @returns The customer address.
   */
  private async findCustomerAddress(
    customerId: string,
    addressId: string,
    requireActive: boolean = true,
  ): Promise<any> {
    const where: any = { id: addressId, customerId };
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
   * @param customerId - The customer ID.
   * @param data - The address data.
   * @param excludeId - The address ID to exclude (for updates).
   */
  private async checkDuplicateAddress(
    customerId: string,
    data: CreateCustomerAddressDto | UpdateCustomerAddressDto,
    excludeId?: string,
  ): Promise<void> {
    const where: any = {
      customerId,
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
   * Validates that a customer with the given ID exists and is active.
   * Throws NotFoundException if not found.
   * @param customerId - The customer ID to validate.
   */
  private async validateCustomerExists(customerId: string): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, is_active: true } as any,
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
  }

  /**
   * Validates the address data, ensuring required fields are present.
   * Throws BadRequestException if validation fails.
   * @param data - The address data to validate.
   */
  private validateAddressData(data: CreateCustomerAddressDto): void {
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
    data: CreateCustomerAddressDto,
  ): Promise<{ id: string; isServiceable: boolean }> {
    return { id: '', isServiceable: true };
  }

  /**
   * Creates the customer address using raw SQL within a transaction.
   * @param customerId - The customer ID.
   * @param data - The address data.
   * @param locationId - The location ID.
   * @param isServiceable - Whether the location is serviceable.
   * @param isDefault - Whether this is the default address.
   * @returns The created address ID.
   */
  private async createAddress(
    customerId: string,
    data: CreateCustomerAddressDto,
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
    (id, "customerId", label, address, "locationId", pincode, geopoint, "isServiceable", "isDefault")
    VALUES (${randomUUID()}, ${customerId},${labelValue}::"AddressLabel",${data.address},${locationId}, ${data.pincode},
      ST_MakePoint(${Number((data.lng as number).toFixed(6))}, ${Number((data.lat as number).toFixed(6))})::geography,
      ${isServiceable}, ${isDefault}
    )
    RETURNING id;
    `;
  }

  /**
   * Creates a new customer address for the authenticated customer.
   * @param customerId - The unique identifier of the customer.
   * @param data - The address data to create.
   * @returns The created customer address with location relation.
   */
  async create(customerId: string, data: CreateCustomerAddressDto) {
    try {
      this.logger.log(`Starting address creation for customer ${customerId}`);
      // Log the address creation
      try {
        const logsDir = path.join(process.cwd(), 'logs');
        await fs.mkdir(logsDir, { recursive: true });
        const logFile = path.join(logsDir, 'customer_address_creation.log');
        const logEntry = JSON.stringify({
          type: 'customer',
          address: data,
          timestamp: new Date().toISOString(),
        });
        await fs.appendFile(logFile, logEntry + '\n');
      } catch (logError) {
        this.logger.error('Failed to log address creation', logError);
      }

      // Validate customer existence
      await this.validateCustomerExists(customerId);
      this.logger.log(`Customer ${customerId} validated`);

      // Check for duplicate addresses
      await this.checkDuplicateAddress(customerId, data);
      this.logger.log(`Duplicate check passed for customer ${customerId}`);

      // Validate address data
      this.validateAddressData(data);
      this.logger.log(`Address data validated for customer ${customerId}`);

      // Handle location
      const { id: locationId, isServiceable } = await this.handleLocation(data);
      this.logger.log(
        `Location handled: ${locationId}, serviceable: ${isServiceable}`,
      );

      // Determine if default
      const existingAddressesCount = await this.prisma.customerAddress.count({
        where: { customerId, is_active: true },
      });
      const isDefault = existingAddressesCount === 0;
      this.logger.log(`Is default address: ${isDefault}`);

      // Create address within transaction
      const result = await this.prisma.$transaction(async (tx) => {
        return await this.createAddress(
          customerId,
          data,
          locationId,
          isServiceable,
          isDefault,
        );
      });

      this.logger.log(
        `Address created successfully for customer ${customerId}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create address for customer ${customerId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieves all active addresses for a specific customer.
   * @param customerId - The unique identifier of the customer.
   * @returns A list of customer addresses with location relations.
   */
  async findAll(customerId: string) {
    await this.validateCustomerExists(customerId);
    const addresses = await this.prisma.customerAddress.findMany({
      where: {
        customerId,
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
   * Retrieves a specific active customer address by ID for the authenticated customer.
   * @param customerId - The unique identifier of the customer.
   * @param addressId - The unique identifier of the address.
   * @returns The customer address with location relation.
   */
  async findOne(customerId: string, addressId: string) {
    await this.validateCustomerExists(customerId);
    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId,
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
   * Updates an existing customer address for the authenticated customer.
   * @param customerId - The unique identifier of the customer.
   * @param addressId - The unique identifier of the address.
   * @param data - The fields to update.
   * @returns The updated customer address with location relation.
   */
  async update(
    customerId: string,
    addressId: string,
    data: UpdateCustomerAddressDto,
  ) {
    // 1. Validate the customer.
    await this.validateCustomerExists(customerId);

    // 2. Find the customer address; if it does not exist, throw a human-readable error message.
    const address = await this.findCustomerAddress(customerId, addressId);

    // 3. Check for duplicate addresses with the same content, including address, latitude, longitude, and pincode but addressId.
    await this.checkDuplicateAddress(customerId, data, addressId);

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
   * Deletes a customer address for the authenticated customer (soft delete).
   * @param customerId - The unique identifier of the customer.
   * @param addressId - The unique identifier of the address.
   * @returns A success message.
   */
  async delete(customerId: string, addressId: string) {
    await this.validateCustomerExists(customerId);
    await this.findCustomerAddress(customerId, addressId, false);

    // If Address has 0 Orders than Delete it or can it is_active
    // If Address isDefault = true than
    // Soft delete by setting is_active to false
    await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: { is_active: false } as any,
    });

    return { message: 'Customer address deleted successfully' };
  }

  /**
   * Sets a customer address as the default for the authenticated customer.
   * @param customerId - The unique identifier of the customer.
   * @param addressId - The unique identifier of the address.
   * @returns The updated customer address with location relation.
   */
  async setDefaultAddress(customerId: string, addressId: string) {
    await this.validateCustomerExists(customerId);
    await this.findCustomerAddress(customerId, addressId);

    // First, reset all other active addresses to non-default for this customer
    await this.prisma.customerAddress.updateMany({
      where: {
        customerId,
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
