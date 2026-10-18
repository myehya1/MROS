import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TimeEntriesService } from './time-entries.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    restaurantId: string;
    role: string;
    permissions: string[];
  };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermission('VIEW_TIME_ENTRIES')
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Get()
  findByDate(@Query('date') date: string, @Req() req: AuthenticatedRequest) {
    return this.timeEntriesService.findByDate(req.user.restaurantId, date);
  }
}
