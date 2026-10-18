import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// Unambiguous uppercase alphanumeric chars
const KIOSK_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

async function generateUniqueKioskCode(prisma: PrismaService): Promise<string> {
  for (let attempts = 0; attempts < 10; attempts++) {
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
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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
      const kioskCode = await generateUniqueKioskCode(this.prisma);

      const restaurant = await tx.restaurant.create({
        data: {
          name: dto.restaurantName,
          kioskCode,
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
        permissions: [],
      },
    };
  }

  async login(dto: LoginDto) {
    if (!dto.email && !dto.username) {
      throw new UnauthorizedException('Email or username is required.');
    }

    const user = await this.prisma.user.findFirst({
      where: dto.username
        ? {
            username: dto.username,
          }
        : {
            email: dto.email,
          },
      include: {
        systemRole: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username/email or password.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid username/email or password.');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      username: user.username,
      restaurantId: user.restaurantId,
      role: user.systemRole.name,
      permissions: user.permissions ?? [],
    });

    return {
      message: 'Login successful.',
      accessToken,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        role: user.systemRole.name,
        permissions: user.permissions ?? [],
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        systemRole: true,
        jobRole: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive.');
    }

    return {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      restaurantId: user.restaurantId,
      role: user.systemRole.name,
      permissions: user.permissions ?? [],
      employeeNumber: user.employeeNumber,
      jobRole: user.jobRole
        ? {
            id: user.jobRole.id,
            name: user.jobRole.name,
            color: user.jobRole.color,
          }
        : null,
      contractType: user.contractType,
      contractStartDate: user.contractStartDate,
      contractEndDate: user.contractEndDate,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    if (newPassword.length < 8) {
      throw new ConflictException(
        'New password must be at least 8 characters long.',
      );
    }

    if (currentPassword === newPassword) {
      throw new ConflictException(
        'New password must be different from the current password.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        password: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive.');
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    return {
      message: 'Password changed successfully.',
      mustChangePassword: false,
    };
  }

  getSystemRoles() {
    return this.prisma.systemRole.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
