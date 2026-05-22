import { Controller, Get, Post, Body, Query, Request } from '@nestjs/common';
import { BetsService } from './bets.service';
import { CreateBetsDto } from './dto/create-bets.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('bets')
export class BetsController {
  constructor(private service: BetsService) {}

  @Get()
  findAll(@Request() req, @Query('lottery_id') lotteryId?: string, @Query('agent_id') agentId?: string) {
    return this.service.findAll(req.user, lotteryId, agentId);
  }

  @Post('batch')
  @Roles('agent')
  batchCreate(@Body() dto: CreateBetsDto, @Request() req) {
    return this.service.batchCreate(dto, req.user.id);
  }

  @Get('my-tickets')
  @Roles('agent')
  myTickets(@Request() req) {
    return this.service.getMyTickets(req.user.id);
  }

  @Get('sales-summary')
  @Roles('agent')
  salesSummary(@Request() req, @Query('date') date?: string) {
    return this.service.getSalesSummary(req.user.id, date);
  }

  @Get('net-pay')
  @Roles('agent')
  netPay(@Request() req) {
    return this.service.getNetPay(req.user.id);
  }

  @Get('risk-view')
  @Roles('admin')
  riskView() {
    return this.service.getRiskView();
  }
}
