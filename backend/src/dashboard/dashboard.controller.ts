import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../auth/roles.decorator';

@Controller('dashboard')
@Roles('admin')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('stats')
  getStats() { return this.service.getStats(); }
}
