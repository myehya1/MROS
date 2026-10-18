import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';

@Injectable()
export class WorkingHoursService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(restaurantId: string) {
    return this.prisma.workingHours.findMany({
      where: { restaurantId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async create(restaurantId: string, dto: CreateWorkingHoursDto) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be before endTime.');
    }

    return this.prisma.workingHours.create({
      data: {
        restaurantId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        minStaff: dto.minStaff,
      },
    });
  }

  async update(
    id: string,
    restaurantId: string,
    dto: Partial<CreateWorkingHoursDto>,
  ) {
    const slot = await this.prisma.workingHours.findFirst({
      where: { id, restaurantId },
    });

    if (!slot) throw new NotFoundException('Working hours slot not found.');

    const startTime = dto.startTime ?? slot.startTime;
    const endTime = dto.endTime ?? slot.endTime;

    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime.');
    }

    return this.prisma.workingHours.update({
      where: { id },
      data: {
        startTime,
        endTime,
        minStaff: dto.minStaff ?? slot.minStaff,
      },
    });
  }

  async remove(id: string, restaurantId: string) {
    const slot = await this.prisma.workingHours.findFirst({
      where: { id, restaurantId },
    });

    if (!slot) throw new NotFoundException('Working hours slot not found.');

    return this.prisma.workingHours.delete({ where: { id } });
  }
}
