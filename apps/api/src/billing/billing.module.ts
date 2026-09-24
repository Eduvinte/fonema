import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { FlowService } from './flow.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, FlowService],
})
export class BillingModule {}
