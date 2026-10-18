import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AvailabilityService } from './availability.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    restaurantId: string;
    role: string;
    permissions: string[];
  };
}

@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  setAvailability(
    @Body() dto: SetAvailabilityDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.setAvailability(req.user.userId, dto);
  }

  @Delete(':id')
  removeAvailability(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.removeAvailability(
      id,
      req.user.userId,
      req.user.role,
    );
  }

  @Get('my-week')
  getMyWeekAvailability(
    @Query('weekStart') weekStart: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.getMyWeekAvailability(
      req.user.userId,
      weekStart,
    );
  }

  @UseGuards(RolesGuard)
  @RequirePermission('EDIT_SCHEDULE')
  @Get('week')
  getWeekAvailability(
    @Query('weekStart') weekStart: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.getWeekAvailability(
      req.user.restaurantId,
      weekStart,
    );
  }

  @UseGuards(RolesGuard)
  @RequirePermission('EDIT_SCHEDULE')
  @Post('generate-schedule')
  generateSchedule(
    @Body('weekStart') weekStart: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.generateSchedule(
      req.user.restaurantId,
      weekStart,
    );
  }
}
