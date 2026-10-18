import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KioskService {
  constructor(private readonly prisma: PrismaService) {}

  async punch(kioskCode: string, employeeNumber: number, password: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { kioskCode },
    });

    if (!restaurant) throw new UnauthorizedException('Invalid kiosk code.');

    const user = await this.prisma.user.findFirst({
      where: { restaurantId: restaurant.id, employeeNumber, isActive: true },
    });

    // Same error for unknown number or wrong password to prevent enumeration
    if (!user)
      throw new UnauthorizedException('Invalid employee number or password.');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      throw new UnauthorizedException('Invalid employee number or password.');

    const openEntry = await this.prisma.timeEntry.findFirst({
      where: { userId: user.id, checkOut: null },
      orderBy: { checkIn: 'desc' },
    });

    const now = new Date();

    if (openEntry) {
      await this.prisma.timeEntry.update({
        where: { id: openEntry.id },
        data: { checkOut: now },
      });
      return {
        action: 'check-out',
        firstName: user.firstName,
        lastName: user.lastName,
        employeeNumber: user.employeeNumber,
        checkIn: openEntry.checkIn,
        checkOut: now,
      };
    }

    await this.prisma.timeEntry.create({
      data: { userId: user.id, checkIn: now },
    });
    return {
      action: 'check-in',
      firstName: user.firstName,
      lastName: user.lastName,
      employeeNumber: user.employeeNumber,
      checkIn: now,
      checkOut: null,
    };
  }
}
