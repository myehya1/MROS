import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { JobRolesService } from './job-roles.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    restaurantId: string;
    role: string;
  };
}

@Controller('job-roles')
export class JobRolesController {
  constructor(private readonly jobRolesService: JobRolesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner', 'Manager')
  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.jobRolesService.findAll(request.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner', 'Manager')
  @Get(':id')
  findOne(
    @Param('id') jobRoleId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.jobRolesService.findOne(jobRoleId, request.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner')
  @Post()
  create(@Body() dto: CreateJobRoleDto, @Req() request: AuthenticatedRequest) {
    return this.jobRolesService.create(request.user.restaurantId, dto);
  }
}
