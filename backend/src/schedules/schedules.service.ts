import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ScheduleStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';

type Constraints = {
  excludedEmployees: string[];
  maxShiftHours: number;
  maxWeeklyHours: number;
};

const EMPTY_CONSTRAINTS: Constraints = {
  excludedEmployees: [],
  maxShiftHours: 12,
  maxWeeklyHours: 60,
};

function parseTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function utcDate(value: string): Date {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date.');
  return date;
}

function intersects(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  private parseWeek(weekStart: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart ?? '')) {
      throw new BadRequestException('weekStart must be an ISO date (YYYY-MM-DD).');
    }
    const date = utcDate(weekStart);
    if (date.getUTCDay() !== 1) {
      throw new BadRequestException('weekStart must be a Monday.');
    }
    return date;
  }

  async getByWeek(restaurantId: string, weekStart: string) {
    const week = this.parseWeek(weekStart);
    return this.prisma.schedule.findUnique({
      where: { restaurantId_weekStart: { restaurantId, weekStart: week } },
      include: {
        shifts: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            jobRole: { select: { id: true, name: true, color: true } },
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
      },
    });
  }

  async createDraft(restaurantId: string, weekStart: string) {
    const week = this.parseWeek(weekStart);
    const existing = await this.prisma.schedule.findUnique({
      where: { restaurantId_weekStart: { restaurantId, weekStart: week } },
    });
    if (existing) throw new ConflictException('A schedule already exists for this week.');
    return this.prisma.schedule.create({
      data: { restaurantId, weekStart: week },
      include: { shifts: true },
    });
  }

  private async getInstructionsConstraints(
    instructions: string | undefined,
    employees: { id: string; firstName: string; lastName: string }[],
  ): Promise<{ constraints: Constraints; warning?: string }> {
    if (!instructions?.trim()) return { constraints: EMPTY_CONSTRAINTS };
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        constraints: EMPTY_CONSTRAINTS,
        warning: 'Natural-language instructions were not applied because AI is not configured.',
      };
    }

    const client = new Anthropic({ apiKey });
    let message;
    try {
      message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 500,
      tools: [
        {
          name: 'set_scheduling_constraints',
          description: 'Convert the manager request into constraints for the schedule optimizer.',
          input_schema: {
            type: 'object',
            properties: {
              excludedEmployees: {
                type: 'array',
                items: { type: 'string' },
                description: 'Exact employee names the manager asked not to schedule.',
              },
              maxShiftHours: { type: 'number', description: 'Maximum hours per shift, from 1 to 12.' },
              maxWeeklyHours: { type: 'number', description: 'Maximum total hours per employee, from 1 to 80.' },
            },
            required: ['excludedEmployees', 'maxShiftHours', 'maxWeeklyHours'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'set_scheduling_constraints' },
      messages: [
        {
          role: 'user',
          content: `Extract only the scheduling constraints expressed by the manager. Do not invent requirements. Available employees: ${employees.map((employee) => `${employee.firstName} ${employee.lastName}`).join(', ')}. Manager request: ${instructions}`,
        },
      ],
      });
    } catch {
      return { constraints: EMPTY_CONSTRAINTS, warning: 'AI could not interpret the instruction; generated using availability and working hours only.' };
    }
    const result = message.content.find((block) => block.type === 'tool_use');
    if (!result || result.type !== 'tool_use') {
      return { constraints: EMPTY_CONSTRAINTS, warning: 'Could not interpret the scheduling instructions; generated without them.' };
    }
    const input = result.input as Partial<Constraints>;
    return {
      constraints: {
        excludedEmployees: Array.isArray(input.excludedEmployees) ? input.excludedEmployees : [],
        maxShiftHours: typeof input.maxShiftHours === 'number' ? Math.max(1, Math.min(12, input.maxShiftHours)) : EMPTY_CONSTRAINTS.maxShiftHours,
        maxWeeklyHours: typeof input.maxWeeklyHours === 'number' ? Math.max(1, Math.min(80, input.maxWeeklyHours)) : EMPTY_CONSTRAINTS.maxWeeklyHours,
      },
    };
  }

  async generate(restaurantId: string, weekStart: string, instructions?: string) {
    const week = this.parseWeek(weekStart);
    const nextWeek = new Date(week);
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
    const [schedule, employees, openingHours, availability, timeEntries] = await Promise.all([
      this.prisma.schedule.findUnique({
        where: { restaurantId_weekStart: { restaurantId, weekStart: week } },
        include: { shifts: true },
      }),
      this.prisma.user.findMany({
        where: { restaurantId, isActive: true, jobRoleId: { not: null } },
        select: { id: true, firstName: true, lastName: true, jobRoleId: true },
      }),
      this.prisma.workingHours.findMany({ where: { restaurantId }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }),
      this.prisma.availability.findMany({
        where: { weekStart: week, user: { restaurantId, isActive: true } },
      }),
      this.prisma.timeEntry.findMany({
        where: { user: { restaurantId }, checkIn: { lt: nextWeek }, OR: [{ checkOut: null }, { checkOut: { gt: week } }] },
        select: { userId: true, checkIn: true, checkOut: true },
      }),
    ]);

    if (schedule?.status === ScheduleStatus.PUBLISHED) {
      throw new ConflictException('This schedule is published. Reopen it before regenerating.');
    }
    if (openingHours.length === 0) throw new BadRequestException('Set restaurant working hours before generating a schedule.');
    if (availability.length === 0) throw new BadRequestException('No employee availability found for this week.');

    const { constraints, warning } = await this.getInstructionsConstraints(instructions, employees);
    const excluded = new Set(
      employees.filter((employee) => constraints.excludedEmployees.some((name) => `${employee.firstName} ${employee.lastName}`.toLowerCase() === name.toLowerCase())).map((employee) => employee.id),
    );
    const loads = new Map<string, number>(employees.map((employee) => [employee.id, 0]));
    const assigned: CreateShiftDto[] = [];
    const coverageWarnings: string[] = [];

    for (const hours of openingHours) {
      const date = new Date(week);
      date.setUTCDate(date.getUTCDate() + hours.dayOfWeek - 1);
      const dateString = date.toISOString().slice(0, 10);
      const start = parseTime(hours.startTime);
      const end = parseTime(hours.endTime);
      if (end <= start) {
        coverageWarnings.push(`Invalid opening hours on day ${hours.dayOfWeek}: ${hours.startTime}–${hours.endTime}.`);
        continue;
      }
      if ((end - start) / 60 > constraints.maxShiftHours) {
        coverageWarnings.push(`Opening period on day ${hours.dayOfWeek} exceeds the ${constraints.maxShiftHours}-hour shift limit.`);
        continue;
      }

      const candidates = employees.filter((employee) => {
        if (excluded.has(employee.id) || !employee.jobRoleId || (loads.get(employee.id) ?? 0) + (end - start) / 60 > constraints.maxWeeklyHours) return false;
        const available = availability.some((slot) => slot.userId === employee.id && slot.dayOfWeek === hours.dayOfWeek && parseTime(slot.startTime) <= start && parseTime(slot.endTime) >= end);
        if (!available) return false;
        const hasShiftConflict = assigned.some((shift) => shift.userId === employee.id && shift.date === dateString && intersects(start, end, parseTime(shift.startTime), parseTime(shift.endTime)));
        if (hasShiftConflict) return false;
        const hasEntryConflict = timeEntries.some((entry) => {
          if (entry.userId !== employee.id) return false;
          const entryDate = entry.checkIn.toISOString().slice(0, 10);
          if (entryDate !== dateString) return false;
          const entryStart = entry.checkIn.getUTCHours() * 60 + entry.checkIn.getUTCMinutes();
          const entryEnd = entry.checkOut ? entry.checkOut.getUTCHours() * 60 + entry.checkOut.getUTCMinutes() : 24 * 60;
          return intersects(start, end, entryStart, entryEnd);
        });
        return !hasEntryConflict;
      }).sort((a, b) => (loads.get(a.id) ?? 0) - (loads.get(b.id) ?? 0));

      const chosen = candidates.slice(0, hours.minStaff);
      for (const employee of chosen) {
        assigned.push({ userId: employee.id, jobRoleId: employee.jobRoleId!, date: dateString, startTime: hours.startTime, endTime: hours.endTime });
        loads.set(employee.id, (loads.get(employee.id) ?? 0) + (end - start) / 60);
      }
      if (chosen.length < hours.minStaff) {
        coverageWarnings.push(`Day ${hours.dayOfWeek} ${hours.startTime}–${hours.endTime}: found ${chosen.length} of ${hours.minStaff} required employees.`);
      }
    }

    const saved = await this.prisma.$transaction(async (tx) => {
      const current = await tx.schedule.upsert({
        where: { restaurantId_weekStart: { restaurantId, weekStart: week } },
        update: { status: ScheduleStatus.DRAFT },
        create: { restaurantId, weekStart: week },
      });
      await tx.shift.deleteMany({ where: { scheduleId: current.id } });
      if (assigned.length) {
        await tx.shift.createMany({ data: assigned.map((shift) => ({ ...shift, scheduleId: current.id, date: utcDate(shift.date) })) });
      }
      return tx.schedule.findUniqueOrThrow({
        where: { id: current.id },
        include: { shifts: { include: { user: { select: { id: true, firstName: true, lastName: true } }, jobRole: { select: { id: true, name: true, color: true } } }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] } },
      });
    });
    return { ...saved, coverageWarnings, instructionWarning: warning ?? null };
  }

  async replaceShifts(restaurantId: string, scheduleId: string, shifts: CreateShiftDto[]) {
    if (!Array.isArray(shifts)) throw new BadRequestException('Expected an array of shifts.');
    const schedule = await this.prisma.schedule.findFirst({ where: { id: scheduleId, restaurantId }, include: { shifts: true } });
    if (!schedule) throw new NotFoundException('Schedule not found.');
    if (schedule.status === ScheduleStatus.PUBLISHED) throw new ConflictException('Published schedules cannot be edited.');
    const weekEnd = new Date(schedule.weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const userIds = [...new Set(shifts.map((shift) => shift.userId))];
    const roleIds = [...new Set(shifts.map((shift) => shift.jobRoleId))];
    const [users, roles, availability, timeEntries] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: userIds }, restaurantId, isActive: true }, select: { id: true, jobRoleId: true } }),
      this.prisma.jobRole.findMany({ where: { id: { in: roleIds }, restaurantId }, select: { id: true } }),
      this.prisma.availability.findMany({ where: { weekStart: schedule.weekStart, userId: { in: userIds } } }),
      this.prisma.timeEntry.findMany({ where: { userId: { in: userIds }, checkIn: { lt: weekEnd }, OR: [{ checkOut: null }, { checkOut: { gt: schedule.weekStart } }] }, select: { userId: true, checkIn: true, checkOut: true } }),
    ]);
    if (users.length !== userIds.length || roles.length !== roleIds.length) throw new BadRequestException('All employees and job roles must belong to this restaurant.');

    for (const shift of shifts) {
      const date = utcDate(shift.date);
      if (date < schedule.weekStart || date >= weekEnd) throw new BadRequestException('Shift dates must fall within the schedule week.');
      if (parseTime(shift.startTime) >= parseTime(shift.endTime)) throw new BadRequestException('Shift startTime must be before endTime.');
      const user = users.find((item) => item.id === shift.userId);
      if (!user || user.jobRoleId !== shift.jobRoleId) throw new BadRequestException('A shift must use the employee’s assigned job role.');
      const dayOfWeek = ((date.getUTCDay() + 6) % 7) + 1;
      const hasAvailability = availability.some((slot) => slot.userId === shift.userId && slot.dayOfWeek === dayOfWeek && parseTime(slot.startTime) <= parseTime(shift.startTime) && parseTime(slot.endTime) >= parseTime(shift.endTime));
      if (!hasAvailability) throw new ConflictException('The employee is not available for the full shift.');
      const hasTimeEntryConflict = timeEntries.some((entry) => {
        if (entry.userId !== shift.userId || entry.checkIn.toISOString().slice(0, 10) !== shift.date.slice(0, 10)) return false;
        const entryStart = entry.checkIn.getUTCHours() * 60 + entry.checkIn.getUTCMinutes();
        const entryEnd = entry.checkOut ? entry.checkOut.getUTCHours() * 60 + entry.checkOut.getUTCMinutes() : 24 * 60;
        return intersects(parseTime(shift.startTime), parseTime(shift.endTime), entryStart, entryEnd);
      });
      if (hasTimeEntryConflict) throw new ConflictException('The employee has an existing time entry during this shift.');
      const conflicts = shifts.some((other) => other !== shift && other.userId === shift.userId && other.date.slice(0, 10) === shift.date.slice(0, 10) && intersects(parseTime(shift.startTime), parseTime(shift.endTime), parseTime(other.startTime), parseTime(other.endTime)));
      if (conflicts) throw new ConflictException('An employee cannot have overlapping shifts.');
    }

    await this.prisma.$transaction([
      this.prisma.shift.deleteMany({ where: { scheduleId } }),
      ...(shifts.length ? [this.prisma.shift.createMany({ data: shifts.map((shift) => ({ ...shift, date: utcDate(shift.date), scheduleId })) })] : []),
    ]);
    return this.getByWeek(restaurantId, schedule.weekStart.toISOString().slice(0, 10));
  }

  async publish(restaurantId: string, id: string) {
    const schedule = await this.prisma.schedule.findFirst({ where: { id, restaurantId }, include: { shifts: true } });
    if (!schedule) throw new NotFoundException('Schedule not found.');
    if (schedule.shifts.length === 0) throw new BadRequestException('Add shifts before publishing the schedule.');
    return this.prisma.schedule.update({ where: { id }, data: { status: ScheduleStatus.PUBLISHED }, include: { shifts: true } });
  }
}
