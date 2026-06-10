import { Controller, Get, Post, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('upload-document')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file', {
    storage: require('multer').memoryStorage(),
    limits: { fileSize: 1024 * 1024 },
  }))
  uploadDocument(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file provided');
    return this.service.uploadDocument(file);
  }
}
