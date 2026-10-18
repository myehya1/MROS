import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimeEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByDate(restaurantId: string, dateStr: string) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) throw new BadRequestException('Invalid date.');

    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    return this.prisma.timeEntry.findMany({
      where: {
        checkIn: { gte: start, lte: end },
        user: { restaurantId },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            jobRole: { select: { name: true, color: true } },
          },
        },
      },
      orderBy: { checkIn: 'asc' },
    });
  }
}
