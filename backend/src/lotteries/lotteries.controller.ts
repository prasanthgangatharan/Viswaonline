import { Controller, Get, Post, Patch, Delete, Body, Param, Request } from '@nestjs/common';
import { LotteriesService } from './lotteries.service';
import { CreateLotteryDto } from './dto/create-lottery.dto';
import { UpdateLotteryDto } from './dto/update-lottery.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('lotteries')
export class LotteriesController {
  constructor(private service: LotteriesService) {}

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user?.role);
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateLotteryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateLotteryDto, @Request() req) {
    return this.service.update(id, dto, req.user.id);
  }

  @Patch(':id/close')
  @Roles('admin')
  close(@Param('id') id: string, @Body('admin_password') password: string, @Request() req) {
    return this.service.close(id, req.user.id, password);
  }

  @Delete(':id')
  @Roles('admin')
  delete(@Param('id') id: string, @Body('admin_password') password: string, @Request() req) {
    return this.service.delete(id, req.user.id, password);
  }
}
