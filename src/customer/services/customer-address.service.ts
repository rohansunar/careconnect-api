import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateCustomerAddressDto } from '../dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from '../dto/update-customer-address.dto';

@Injectable()
export class CustomerAddressService {
  constructor(private prisma: PrismaService) {}

  /**
   * Validates that a city with the given ID exists in the database.
   * Throws BadRequestException if not found.
   * @param cityId - The city ID to validate.
   */
  private async validateCity(cityId: string | undefined): Promise<void> {
    if (!cityId) return;
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
    });
    if (!city) {
      throw new BadRequestException('City not found');
    }
  }

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
   * Checks for duplicate addresses based on address, location, pincode, and cityId.
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
      // location: data.location, @TODO - Check Later
      isActive: true,
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    if (data.pincode) {
      where.pincode = data.pincode;
    }
    if (data.cityId) {
      where.cityId = data.cityId;
    }

    const duplicate = await this.prisma.customerAddress.findFirst({ where });
    if (duplicate) {
      throw new BadRequestException(
        'An address with the same pincode, city, location, and address already exists. Please provide a different address.',
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
   * @returns The created customer address with city relation.
   */
  async create(customerId: string, data: CreateCustomerAddressDto) {
    await this.validateCustomerExists(customerId);
    await this.validateCity(data.cityId);
    await this.checkDuplicateAddress(customerId, data);
    const existingAddressesCount = await this.prisma.customerAddress.count({
      where: { customerId, isActive: true } as any,
    });
    const isDefault = existingAddressesCount === 0;
    const customerAddress = await this.prisma.customerAddress.create({
      data: {
        customerId,
        ...data,
        isDefault,
      },
      include: {
        city: true,
      },
    });

    return customerAddress;
  }

  /**
   * Retrieves all active addresses for a specific customer.
   * @param customerId - The unique identifier of the customer.
   * @returns A list of customer addresses with city relations.
   */
  async findAll(customerId: string) {
    await this.validateCustomerExists(customerId);
    const addresses = await this.prisma.customerAddress.findMany({
      where: {
        customerId,
        isActive: true,
      } as any,
      include: {
        city: true,
      },
      orderBy: [{ isDefault: 'desc' }, { created_at: 'desc' }],
    });

    return addresses;
  }

  /**
   * Retrieves a specific active customer address by ID for the authenticated customer.
   * @param customerId - The unique identifier of the customer.
   * @param addressId - The unique identifier of the address.
   * @returns The customer address with city relation.
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
    data: UpdateCustomerAddressDto,
  ) {
    await this.validateCustomerExists(customerId);
    await this.findCustomerAddress(customerId, addressId);
    await this.checkDuplicateAddress(customerId, data, addressId);
    await this.validateCity(data.cityId);

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
   * @returns The updated customer address with city relation.
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
    const updatedAddress = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: {
        isDefault: true,
      } as any,
      include: {
        city: true,
      },
    });

    return updatedAddress;
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
