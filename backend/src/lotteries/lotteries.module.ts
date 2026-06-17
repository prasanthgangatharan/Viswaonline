import { Module } from '@nestjs/common';
import { LotteriesController } from './lotteries.controller';
import { LotteriesService } from './lotteries.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [GatewayModule],
  controllers: [LotteriesController],
  providers: [LotteriesService],
  exports: [LotteriesService],
})
export class LotteriesModule {}
