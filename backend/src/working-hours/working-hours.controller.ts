import {
  Body,
  Controller,
  Delete,
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
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { WorkingHoursService } from './working-hours.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    restaurantId: string;
    role: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('working-hours')
export class WorkingHoursController {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.workingHoursService.findAll(req.user.restaurantId);
  }

  @UseGuards(RolesGuard)
  @Roles('Owner')
  @Post()
  create(@Body() dto: CreateWorkingHoursDto, @Req() req: AuthenticatedRequest) {
    return this.workingHoursService.create(req.user.restaurantId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('Owner')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkingHoursDto>,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.workingHoursService.update(id, req.user.restaurantId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('Owner')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.workingHoursService.remove(id, req.user.restaurantId);
  }
}
