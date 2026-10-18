import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { UsersService } from './users.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    restaurantId: string;
    role: string;
    permissions: string[];
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission('MANAGE_EMPLOYEES')
  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.usersService.findAll(request.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission('MANAGE_EMPLOYEES')
  @Get(':id')
  findOne(@Param('id') userId: string, @Req() request: AuthenticatedRequest) {
    return this.usersService.findOne(userId, request.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner')
  @Post()
  createUser(@Body() dto: CreateUserDto, @Req() request: AuthenticatedRequest) {
    return this.usersService.createUser(
      dto.firstName,
      dto.lastName,
      dto.username,
      dto.email,
      dto.password,
      dto.phone,
      request.user.restaurantId,
      dto.systemRoleId,
      dto.jobRoleId,
      dto.contractType,
      dto.contractStartDate,
      dto.contractEndDate,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner')
  @Patch(':id')
  updateUser(
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.updateUser(userId, request.user.restaurantId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner')
  @Patch(':id/permissions')
  updatePermissions(
    @Param('id') userId: string,
    @Body() dto: UpdatePermissionsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.updatePermissions(
      userId,
      request.user.restaurantId,
      dto.permissions,
    );
  }
}
