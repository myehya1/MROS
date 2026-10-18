import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

const KIOSK_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

async function generateUniqueKioskCode(prisma: PrismaService): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = Array.from(
      { length: 6 },
      () =>
        KIOSK_CODE_CHARS[Math.floor(Math.random() * KIOSK_CODE_CHARS.length)],
    ).join('');
    const existing = await prisma.restaurant.findUnique({
      where: { kioskCode: code },
    });
    if (!existing) return code;
  }
  throw new Error('Could not generate unique kiosk code.');
}

@Injectable()
export class RestaurantService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found.');

    // Lazy-generate kiosk code for restaurants created before this feature
    if (!restaurant.kioskCode) {
      const kioskCode = await generateUniqueKioskCode(this.prisma);
      return this.prisma.restaurant.update({
        where: { id: restaurantId },
        data: { kioskCode },
      });
    }

    return restaurant;
  }

  async update(restaurantId: string, dto: UpdateRestaurantDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: {
        id: restaurantId,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found.');
    }

    const data = {
      name: dto.name,
      address: dto.address,
      phone: dto.phone,
      email: dto.email,
    };

    return this.prisma.restaurant.update({
      where: {
        id: restaurantId,
      },
      data: {
        ...(data.name !== undefined && {
          name: data.name,
        }),
        ...(data.address !== undefined && {
          address: data.address,
        }),
        ...(data.phone !== undefined && {
          phone: data.phone,
        }),
        ...(data.email !== undefined && {
          email: data.email,
        }),
      },
    });
  }
}
