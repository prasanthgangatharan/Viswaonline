import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto, UpdateAgentDto, ResetPasswordDto } from './dto/create-agent.dto';
import { Roles } from '../auth/roles.decorator';
import { IsString } from 'class-validator';

class StatusDto { @IsString() status: string; }

@Controller('agents')
@Roles('admin')
export class AgentsController {
  constructor(private service: AgentsService) {}

  @Get() findAll() { return this.service.findAll(); }

  @Post() create(@Body() dto: CreateAgentDto) { return this.service.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(id, dto);
  }

  @Patch(':id/status')
  toggleStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.service.toggleStatus(id, dto.status);
  }
}
