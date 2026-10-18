import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

import { PrismaService } from '../prisma/prisma.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async setAvailability(userId: string, dto: SetAvailabilityDto) {
    const weekStart = new Date(dto.weekStart);

    if (isNaN(weekStart.getTime())) {
      throw new BadRequestException('Invalid weekStart date.');
    }

    // Compute next Monday (00:00 UTC) as the earliest allowed week
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = today.getUTCDay();
    const daysToNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setUTCDate(today.getUTCDate() + daysToNextMonday);

    if (weekStart < nextMonday) {
      throw new BadRequestException(
        'Availability can only be set for next week or later.',
      );
    }

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be before endTime.');
    }

    return this.prisma.availability.upsert({
      where: {
        userId_weekStart_dayOfWeek: {
          userId,
          weekStart,
          dayOfWeek: dto.dayOfWeek,
        },
      },
      update: {
        startTime: dto.startTime,
        endTime: dto.endTime,
        note: dto.note ?? null,
      },
      create: {
        userId,
        weekStart,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        note: dto.note ?? null,
      },
    });
  }

  async removeAvailability(id: string, userId: string, role: string) {
    const slot = await this.prisma.availability.findUnique({ where: { id } });

    if (!slot) {
      throw new NotFoundException('Availability slot not found.');
    }

    const isOwnerOrManager = role === 'Owner' || role === 'Manager';

    if (slot.userId !== userId && !isOwnerOrManager) {
      throw new ForbiddenException(
        "Cannot delete another employee's availability.",
      );
    }

    return this.prisma.availability.delete({ where: { id } });
  }

  async getMyWeekAvailability(userId: string, weekStart: string) {
    const date = new Date(weekStart);

    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid weekStart date.');
    }

    return this.prisma.availability.findMany({
      where: {
        userId,
        weekStart: date,
      },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async getWeekAvailability(restaurantId: string, weekStart: string) {
    const date = new Date(weekStart);

    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid weekStart date.');
    }

    return this.prisma.availability.findMany({
      where: {
        weekStart: date,
        user: { restaurantId },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobRole: {
              select: { name: true, color: true },
            },
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async generateSchedule(restaurantId: string, weekStart: string) {
    const date = new Date(weekStart);

    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid weekStart date.');
    }

    const slots = await this.prisma.availability.findMany({
      where: {
        weekStart: date,
        user: { restaurantId },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            jobRole: { select: { name: true } },
            contractType: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    if (slots.length === 0) {
      throw new BadRequestException(
        'No availability data found for this week.',
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'AI scheduling is not configured. Set ANTHROPIC_API_KEY in the backend .env file.',
      );
    }

    const DAY_NAMES = [
      '',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    const availabilityText = slots
      .map(
        (s) =>
          `${s.user.firstName} ${s.user.lastName} (${s.user.jobRole?.name ?? 'No role'}, ${s.user.contractType ?? 'Unknown contract'}): ${DAY_NAMES[s.dayOfWeek]} ${s.startTime}–${s.endTime}${s.note ? ` [${s.note}]` : ''}`,
      )
      .join('\n');

    const prompt = `You are a restaurant scheduling assistant. Based on the employee availability below for the week of ${weekStart}, create a fair and efficient weekly work schedule. Consider employee contract types and job roles. Make sure shifts are reasonable (4-8 hours) and cover typical restaurant needs (lunch and dinner service). Format the schedule clearly by day.\n\nAvailability:\n${availabilityText}`;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const schedule =
      textBlock && textBlock.type === 'text'
        ? textBlock.text
        : 'Could not generate schedule.';

    return { schedule };
  }
}
