import { Module } from '@nestjs/common';

import { JobRolesController } from './job-roles.controller';
import { JobRolesService } from './job-roles.service';

@Module({
  controllers: [JobRolesController],
  providers: [JobRolesService],
})
export class JobRolesModule {}
