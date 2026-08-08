import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists.');
    }

    const ownerRole = await this.prisma.systemRole.findUnique({
      where: {
        name: 'Owner',
      },
    });

    if (!ownerRole) {
      throw new ConflictException('Owner role not found.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: dto.restaurantName,
        },
      });

      const user = await tx.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          password: hashedPassword,
          restaurantId: restaurant.id,
          systemRoleId: ownerRole.id,
        },
      });

      return {
        restaurant,
        user,
      };
    });

    return {
      message: 'Restaurant created successfully.',
      restaurant: {
        id: result.restaurant.id,
        name: result.restaurant.name,
      },
      user: {
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        role: ownerRole.name,
      },
    };
  }
}
