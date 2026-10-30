import {
  Body,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateShiftDto } from './dto/create-shift.dto';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { SchedulesService } from './schedules.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; restaurantId: string };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermission('EDIT_SCHEDULE')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  getByWeek(
    @Query('weekStart') weekStart: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.getByWeek(req.user.restaurantId, weekStart);
  }

  @Post()
  createDraft(
    @Body() dto: GenerateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.createDraft(req.user.restaurantId, dto.weekStart);
  }

  @Post('generate')
  generate(
    @Body() dto: GenerateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.generate(
      req.user.restaurantId,
      dto.weekStart,
      dto.instructions,
    );
  }

  @Put(':id/shifts')
  replaceShifts(
    @Param('id') id: string,
    @Body(new ParseArrayPipe({ items: CreateShiftDto })) shifts: CreateShiftDto[],
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.replaceShifts(
      req.user.restaurantId,
      id,
      shifts,
    );
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.schedulesService.publish(req.user.restaurantId, id);
  }
}
