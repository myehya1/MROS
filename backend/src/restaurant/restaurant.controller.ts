import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { RestaurantService } from './restaurant.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    restaurantId: string;
    role: string;
  };
}

@Controller('restaurant')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner', 'Manager')
  @Get()
  findOne(@Req() request: AuthenticatedRequest) {
    return this.restaurantService.findOne(request.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner')
  @Patch()
  update(
    @Body() dto: UpdateRestaurantDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.restaurantService.update(request.user.restaurantId, dto);
  }
}
