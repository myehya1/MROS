import { Body, Controller, Post } from '@nestjs/common';

import { PunchDto } from './dto/punch.dto';
import { KioskService } from './kiosk.service';

@Controller('kiosk')
export class KioskController {
  constructor(private readonly kioskService: KioskService) {}

  @Post('punch')
  punch(@Body() dto: PunchDto) {
    return this.kioskService.punch(
      dto.kioskCode,
      dto.employeeNumber,
      dto.password,
    );
  }
}
