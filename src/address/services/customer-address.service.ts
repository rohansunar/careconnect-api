import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { LocationService } from '../../common/services/location.service';
import { CreateCustomerAddressDto } from '../dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from '../dto/update-customer-address.dto';

@Injectable()
export class CustomerAddressService {
  constructor(
    private prisma: PrismaService,
    private locationService: LocationService,
  ) {}

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
      where.isActive = true;
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
      lng: data.lng,
      lat: data.lat,
      isActive: true,
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
        'An address with the same pincode, location, lng, lat, and address already exists. Please provide a different address.',
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
      where: { id: customerId, isActive: true } as any,
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
  }

  /**
   * Creates a new customer address for the authenticated customer.
   * @param customerId - The unique identifier of the customer.
   * @param data - The address data to create.
   * @returns The created customer address with location relation.
   */
  async create(customerId: string, data: CreateCustomerAddressDto) {
    // 1. Validate the customer ID
    await this.validateCustomerExists(customerId);
    await this.checkDuplicateAddress(customerId, data);

    // Check if lat and lng are provided
    if (data.lat === undefined || data.lng === undefined) {
      throw new BadRequestException('Latitude and longitude are required');
    }

    // 2. Find or create location
    const locationId = await this.locationService.findOrCreateLocation({
      lat: data.lat,
      lng: data.lng,
      city: data.city,
      state: data.state,
    });

    // 4. Save the customer_address record
    const existingAddressesCount = await this.prisma.customerAddress.count({
      where: { customerId, isActive: true },
    });
    const isDefault = existingAddressesCount === 0;

    const customerAddress = await this.prisma.customerAddress.create({
      data: {
        customerId,
        label: data.label,
        address: data.address,
        locationId,
        pincode: data.pincode,
        lng: data.lng,
        lat: data.lat,
        isDefault,
      },
    });

    return customerAddress;
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
        isActive: true,
      } as any,
      include: {
        location: true,
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
        isActive: true,
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
      locationId = await this.locationService.findOrCreateLocation({
        lat: data.lat,
        lng: data.lng,
        state: data.state || address.location?.state,
        city: data.city || address.location?.name,
      });
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

    // Soft delete by setting is_active to false
    await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: { isActive: false } as any,
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
        isActive: true,
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
