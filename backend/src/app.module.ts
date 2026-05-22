import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { LotteriesModule } from './lotteries/lotteries.module';
import { BetsModule } from './bets/bets.module';
import { AgentsModule } from './agents/agents.module';
import { ResultsModule } from './results/results.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SupabaseModule } from './supabase/supabase.module';
import { GatewayModule } from './gateway/gateway.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    GatewayModule,
    AuthModule,
    LotteriesModule,
    BetsModule,
    AgentsModule,
    ResultsModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
