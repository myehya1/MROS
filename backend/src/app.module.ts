import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { UsersModule } from './users/users.module';
import { JobRolesModule } from './job-roles/job-roles.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    RestaurantModule,
    JobRolesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
