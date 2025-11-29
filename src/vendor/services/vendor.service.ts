import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves the profile information for a specific vendor.
   * @param vendorId - The unique identifier of the vendor.
   * @returns The vendor's profile data including id, name, phone, email, address, and availability details.
   */
  async getProfile(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        is_active: true,
        is_available_today: true,
        service_radius_m: true,
        delivery_time_msg: true,
      },
    });

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    return vendor;
  }

  /**
   * Updates the profile information for a specific vendor with validation.
   * @param vendorId - The unique identifier of the vendor.
   * @param data - The fields to update (name, phone, email, address, delivery_time_msg, service_radius_m).
   * @returns The updated vendor's profile data.
   */
  async updateProfile(
    vendorId: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      address?: any;
      delivery_time_msg?: string;
      service_radius_m?: number;
    },
  ) {
    // Validate phone number format if provided (E.164 international format)
    if (data.phone && !/^\+[1-9]\d{1,14}$/.test(data.phone)) {
      throw new BadRequestException('Invalid phone number format');
    }

    const vendor = await this.prisma.vendor.update({
      where: { id: vendorId },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        is_active: true,
        is_available_today: true,
        service_radius_m: true,
        delivery_time_msg: true,
      },
    });

    return vendor;
  }

  /**
   * Updates the availability status for a specific vendor.
   * @param vendorId - The unique identifier of the vendor.
   * @param data - The availability fields to update (is_active, is_available_today).
   * @returns The updated vendor's profile data.
   */
  async updateAvailability(
    vendorId: string,
    data: {
      is_active?: boolean;
      is_available_today?: boolean;
    },
  ) {
    const vendor = await this.prisma.vendor.update({
      where: { id: vendorId },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        is_active: true,
        is_available_today: true,
        service_radius_m: true,
        delivery_time_msg: true,
      },
    });

    return vendor;
  }
}
