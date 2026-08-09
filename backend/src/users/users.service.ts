import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    restaurantId: string,
    systemRoleId: string,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists.');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: {
        id: restaurantId,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found.');
    }

    const role = await this.prisma.systemRole.findUnique({
      where: {
        id: systemRoleId,
      },
    });

    if (!role) {
      throw new NotFoundException('System role not found.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        restaurantId,
        systemRoleId,
      },
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      restaurantId: user.restaurantId,
      role: role.name,
    };
  }

  async findAll(restaurantId: string) {
    return this.prisma.user.findMany({
      where: {
        restaurantId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        restaurantId: true,
        systemRole: {
          select: {
            name: true,
          },
        },
        jobRole: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(userId: string, restaurantId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        restaurantId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        restaurantId: true,
        systemRole: {
          select: {
            name: true,
          },
        },
        jobRole: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  async updateUser(userId: string, restaurantId: string, dto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        restaurantId,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found.');
    }

    if (dto.systemRoleId) {
      const role = await this.prisma.systemRole.findUnique({
        where: {
          id: dto.systemRoleId,
        },
      });

      if (!role) {
        throw new NotFoundException('System role not found.');
      }
    }

    if (dto.jobRoleId) {
      const jobRole = await this.prisma.jobRole.findFirst({
        where: {
          id: dto.jobRoleId,
          restaurantId,
        },
      });

      if (!jobRole) {
        throw new NotFoundException('Job role not found.');
      }
    }

    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(dto.firstName !== undefined && {
          firstName: dto.firstName,
        }),
        ...(dto.lastName !== undefined && {
          lastName: dto.lastName,
        }),
        ...(dto.phone !== undefined && {
          phone: dto.phone,
        }),
        ...(dto.isActive !== undefined && {
          isActive: dto.isActive,
        }),
        ...(dto.systemRoleId !== undefined && {
          systemRoleId: dto.systemRoleId,
        }),
        ...(dto.jobRoleId !== undefined && {
          jobRoleId: dto.jobRoleId,
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        restaurantId: true,
        systemRole: {
          select: {
            name: true,
          },
        },
        jobRole: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }
}
