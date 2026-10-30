import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { KioskModule } from './kiosk/kiosk.module';
import { PrismaModule } from './prisma/prisma.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { UsersModule } from './users/users.module';
import { JobRolesModule } from './job-roles/job-roles.module';
import { WorkingHoursModule } from './working-hours/working-hours.module';
import { SchedulesModule } from './schedules/schedules.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    RestaurantModule,
    JobRolesModule,
    AvailabilityModule,
    WorkingHoursModule,
    SchedulesModule,
    KioskModule,
    TimeEntriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
