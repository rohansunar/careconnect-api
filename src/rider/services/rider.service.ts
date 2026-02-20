import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { UpdateRiderProfileDto } from '../dto/update-rider-profile.dto';

@Injectable()
export class RiderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new rider with the provided data.
   * @param data - The rider data to create (name, phone, email, address, vendor_id).
   * @param isAdmin - Whether the creator is admin (affects limit enforcement).
   * @returns The created rider data.
   */
  async createRider(
    data: {
      name: string;
      phone: string;
    },
    user: { id: string; role: string },
  ) {
    // Check if phone number already exists
    const existingRider = await this.prisma.rider.findUnique({
      where: { phone: data.phone },
    });

    let isAdmin = true;
    let vendorId = '';

    if (user.role === 'vendor') {
      isAdmin = false;
      vendorId = user.id;
    }

    if (existingRider) {
      throw new BadRequestException(
        'Rider with this phone number already exists',
      );
    }

    // Enforce 10-rider limit per vendor for non-admin creations
    if (!isAdmin && vendorId) {
      const riderCount = await this.prisma.rider.count({
        where: { vendorId },
      });
      if (riderCount >= 10) {
        throw new BadRequestException('Vendor cannot have more than 10 riders');
      }
    }

    await this.prisma.rider.create({ data: { ...data, vendorId } });

    return { success: true };
  }

  /**
   * Retrieves riders based on user role.
   * @param user - The current user.
   * @returns List of riders.
   */
  async getRiders(user: { id: string; role: string }) {
    if (user.role === 'vendor') {
      return this.prisma.rider.findMany({
        where: { vendorId: user.id },
        select: {
          id: true,
          name: true,
          phone: true,
        },
      });
    } else if (user.role === 'admin') {
      return this.prisma.rider.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          vendor: {
            select: {
              id: true,
              name: true,
            },
          },
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      });
    } else {
      throw new BadRequestException('Unauthorized to view riders');
    }
  }

  /**
   * Retrieves the profile information for a specific rider.
   * @param riderId - The unique identifier of the rider.
   * @returns The rider's profile data including id, name, phone, email, address.
   */
  async getProfile(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    return rider;
  }

  /**
   * Updates rider-controlled profile fields (email, address).
   * @param riderId - Authenticated rider id
   * @param dto - Partial fields to update
   */
  async updateProfile(riderId: string, dto: UpdateRiderProfileDto) {
    const { email, address } = dto;

    if (!email && !address) {
      throw new BadRequestException(
        'Provide at least one field: email or address',
      );
    }

    try {
      const updated = await this.prisma.rider.update({
        where: { id: riderId },
        data: {
          ...(email ? { email } : {}),
          ...(address ? { address } : {}),
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
        },
      });

      return updated;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Rider not found');
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('Email already in use');
      }
      throw error;
    }
  }
}
