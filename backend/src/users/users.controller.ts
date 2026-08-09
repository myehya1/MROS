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
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    restaurantId: string;
    role: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner', 'Manager')
  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.usersService.findAll(request.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner', 'Manager')
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
      dto.email,
      dto.password,
      request.user.restaurantId,
      dto.systemRoleId,
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
}
