import { Module } from '@nestjs/common';
import { DatabaseInitService } from './database-init.service';

@Module({ providers: [DatabaseInitService] })
export class DatabaseModule {}
