import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { AVAILABLE_PERMISSIONS } from './decorators/permissions.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    restaurantId: string;
    role: string;
    permissions: string[];
  };
}

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    return this.authService.getMe(request.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: ChangePasswordBody,
  ) {
    return this.authService.changePassword(
      request.user.userId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner')
  @Get('owner-test')
  ownerTest(@Req() request: AuthenticatedRequest) {
    return {
      message: 'Owner access granted.',
      user: request.user,
    };
  }

  // Returns system roles and available permissions for the employee creation form
  @UseGuards(JwtAuthGuard)
  @Get('system-roles')
  getSystemRoles() {
    return this.authService.getSystemRoles();
  }

  // Returns available permission keys with labels
  @UseGuards(JwtAuthGuard)
  @Get('permissions')
  getAvailablePermissions() {
    return AVAILABLE_PERMISSIONS;
  }
}
