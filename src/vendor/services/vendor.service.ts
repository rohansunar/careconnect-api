import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

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
      throw new Error('Vendor not found');
    }

    return vendor;
  }

  async updateProfile(vendorId: string, data: {
    name?: string;
    phone?: string;
    email?: string;
    address?: any;
    delivery_time_msg?: string;
    service_radius_m?: number;
  }) {
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

  async updateAvailability(vendorId: string, data: {
    is_active?: boolean;
    is_available_today?: boolean;
  }) {
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