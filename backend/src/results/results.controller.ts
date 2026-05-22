import { Controller, Get, Post, Body } from '@nestjs/common';
import { ResultsService } from './results.service';
import { DeclareResultDto } from './dto/declare-result.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('results')
export class ResultsController {
  constructor(private service: ResultsService) {}

  @Get() findAll() { return this.service.findAll(); }

  @Post('declare')
  @Roles('admin')
  declare(@Body() dto: DeclareResultDto) { return this.service.declare(dto); }
}
