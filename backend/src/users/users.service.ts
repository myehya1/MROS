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

  // ==================================================
  // CREATE USER
  // ==================================================

  async createUser(
    firstName: string,
    lastName: string,
    username: string | undefined,
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
    // --------------------------------------------------
    // Check email
    // --------------------------------------------------

    const existingEmail = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingEmail) {
      throw new ConflictException('Email already exists.');
    }

    // --------------------------------------------------
    // Check username
    // --------------------------------------------------

    if (username) {
      const existingUsername = await this.prisma.user.findUnique({
        where: {
          username,
        },
      });

      if (existingUsername) {
        throw new ConflictException('Username already exists.');
      }
    }

    // --------------------------------------------------
    // Check restaurant
    // --------------------------------------------------

    const restaurant = await this.prisma.restaurant.findUnique({
      where: {
        id: restaurantId,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found.');
    }

    // --------------------------------------------------
    // Check system role
    // --------------------------------------------------

    const role = await this.prisma.systemRole.findUnique({
      where: {
        id: systemRoleId,
      },
    });

    if (!role) {
      throw new NotFoundException('System role not found.');
    }

    // --------------------------------------------------
    // Check job role
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Hash password
    // --------------------------------------------------

    const hashedPassword = await bcrypt.hash(password, 10);

    // --------------------------------------------------
    // Get next employee number
    // --------------------------------------------------

    const lastEmployee = await this.prisma.user.findFirst({
      where: {
        restaurantId,
        employeeNumber: {
          not: null,
        },
      },
      orderBy: {
        employeeNumber: 'desc',
      },
      select: {
        employeeNumber: true,
      },
    });

    let employeeNumber =
      Math.max(lastEmployee?.employeeNumber ?? 10000, 10000) + 1;

    // --------------------------------------------------
    // Create user
    //
    // employeeNumber is protected by the database
    // unique constraint:
    //
    // (restaurantId, employeeNumber)
    //
    // If another request gets the same number first,
    // Prisma returns P2002. We increment the number
    // and retry.
    // --------------------------------------------------

    while (true) {
      try {
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
            employeeNumber,
          },
        });

        // ------------------------------------------------
        // Return created user
        // ------------------------------------------------

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          email: user.email,
          phone: user.phone,
          isActive: user.isActive,
          restaurantId: user.restaurantId,

          systemRole: {
            name: role.name,
          },

          jobRoleId: user.jobRoleId,

          contractType: user.contractType,
          contractStartDate: user.contractStartDate,
          contractEndDate: user.contractEndDate,

          mustChangePassword: user.mustChangePassword,

          employeeNumber: user.employeeNumber,

          permissions: user.permissions,
        };
      } catch (error: unknown) {
        // ------------------------------------------------
        // Handle Prisma unique constraint errors
        // ------------------------------------------------

        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2002'
        ) {
          const meta =
            'meta' in error &&
            typeof error.meta === 'object' &&
            error.meta !== null
              ? error.meta
              : null;

          const target =
            meta && 'target' in meta && Array.isArray(meta.target)
              ? meta.target
              : [];

          // ----------------------------------------------
          // Employee number collision
          // ----------------------------------------------

          if (target.includes('employeeNumber')) {
            employeeNumber += 1;
            continue;
          }

          // ----------------------------------------------
          // Email / username collision
          // ----------------------------------------------

          throw new ConflictException(
            'An employee with the same email or username already exists.',
          );
        }

        throw error;
      }
    }
  }

  // ==================================================
  // FIND ALL USERS
  // ==================================================

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
        employeeNumber: true,
        permissions: true,

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

  // ==================================================
  // FIND ONE USER
  // ==================================================

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
        employeeNumber: true,

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

  // ==================================================
  // UPDATE USER
  // ==================================================

  async updateUser(userId: string, restaurantId: string, dto: UpdateUserDto) {
    // --------------------------------------------------
    // Check existing user
    // --------------------------------------------------

    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        restaurantId,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found.');
    }

    // --------------------------------------------------
    // Check username
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Check system role
    // --------------------------------------------------

    if (dto.systemRoleId !== undefined) {
      const role = await this.prisma.systemRole.findUnique({
        where: {
          id: dto.systemRoleId,
        },
      });

      if (!role) {
        throw new NotFoundException('System role not found.');
      }
    }

    // --------------------------------------------------
    // Check job role
    // --------------------------------------------------

    if (dto.jobRoleId !== undefined) {
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

    // --------------------------------------------------
    // Update user
    // --------------------------------------------------

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
        employeeNumber: true,
        permissions: true,

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

  // ==================================================
  // UPDATE PERMISSIONS
  // ==================================================

  async updatePermissions(
    userId: string,
    restaurantId: string,
    permissions: string[],
  ) {
    // --------------------------------------------------
    // Check existing user
    // --------------------------------------------------

    const existing = await this.prisma.user.findFirst({
      where: {
        id: userId,
        restaurantId,
      },
    });

    if (!existing) {
      throw new NotFoundException('User not found.');
    }

    // --------------------------------------------------
    // Update permissions
    // --------------------------------------------------

    return this.prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        permissions,
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        permissions: true,
      },
    });
  }
}
