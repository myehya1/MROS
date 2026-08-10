import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: {
        id: restaurantId,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found.');
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
