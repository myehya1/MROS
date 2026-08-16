import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateJobRoleDto } from './dto/create-job-role.dto';

@Injectable()
export class JobRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.jobRole.findMany({
      where: {
        restaurantId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        restaurantId: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(jobRoleId: string, restaurantId: string) {
    const jobRole = await this.prisma.jobRole.findFirst({
      where: {
        id: jobRoleId,
        restaurantId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        restaurantId: true,
      },
    });

    if (!jobRole) {
      throw new NotFoundException('Job role not found.');
    }

    return jobRole;
  }

  async create(restaurantId: string, dto: CreateJobRoleDto) {
    const existingRole = await this.prisma.jobRole.findFirst({
      where: {
        restaurantId,
        name: dto.name,
      },
    });

    if (existingRole) {
      throw new ConflictException('A job role with this name already exists.');
    }

    return this.prisma.jobRole.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        restaurantId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        restaurantId: true,
      },
    });
  }
}
