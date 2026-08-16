import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(
    firstName: string,
    lastName: string,
    username: string,
    email: string,
    password: string,
    phone: string | undefined,
    restaurantId: string,
    systemRoleId: string,
    jobRoleId: string | undefined,
    contractType: ContractType,
    contractStartDate: string,
    contractEndDate: string | undefined,
  ) {
    const existingEmail = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingEmail) {
      throw new ConflictException('Email already exists.');
    }

    const existingUsername = await this.prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (existingUsername) {
      throw new ConflictException('Username already exists.');
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

    if (jobRoleId) {
      const jobRole = await this.prisma.jobRole.findFirst({
        where: {
          id: jobRoleId,
          restaurantId,
        },
      });

      if (!jobRole) {
        throw new NotFoundException('Job role not found.');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
        username,
        email,
        password: hashedPassword,
        phone,
        restaurantId,
        systemRoleId,
        jobRoleId,
        contractType,
        contractStartDate: new Date(contractStartDate),
        contractEndDate: contractEndDate
          ? new Date(contractEndDate)
          : undefined,
        mustChangePassword: true,
      },
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      restaurantId: user.restaurantId,
      role: role.name,
      jobRoleId: user.jobRoleId,
      contractType: user.contractType,
      contractStartDate: user.contractStartDate,
      contractEndDate: user.contractEndDate,
      mustChangePassword: user.mustChangePassword,
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
        username: true,
        email: true,
        phone: true,
        isActive: true,
        mustChangePassword: true,
        contractType: true,
        contractStartDate: true,
        contractEndDate: true,
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
        username: true,
        email: true,
        phone: true,
        isActive: true,
        mustChangePassword: true,
        contractType: true,
        contractStartDate: true,
        contractEndDate: true,
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

    if (dto.username !== undefined) {
      const existingUsername = await this.prisma.user.findFirst({
        where: {
          username: dto.username,
          NOT: {
            id: userId,
          },
        },
      });

      if (existingUsername) {
        throw new ConflictException('Username already exists.');
      }
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

    return this.prisma.user.update({
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

        ...(dto.username !== undefined && {
          username: dto.username,
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

        ...(dto.contractType !== undefined && {
          contractType: dto.contractType,
        }),

        ...(dto.contractStartDate !== undefined && {
          contractStartDate: new Date(dto.contractStartDate),
        }),

        ...(dto.contractEndDate !== undefined && {
          contractEndDate: new Date(dto.contractEndDate),
        }),
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phone: true,
        isActive: true,
        mustChangePassword: true,
        contractType: true,
        contractStartDate: true,
        contractEndDate: true,
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
  }
}
