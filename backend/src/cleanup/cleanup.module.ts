import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({ imports: [GatewayModule], providers: [CleanupService] })
export class CleanupModule {}
