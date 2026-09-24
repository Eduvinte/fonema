import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  getState(@CurrentUser('id') userId: string) {
    return this.billing.getState(userId);
  }

  @Post('checkout')
  startCheckout(@CurrentUser('id') userId: string) {
    return this.billing.startCheckout(userId);
  }

  @Get('register-status')
  registerStatus(@CurrentUser('id') userId: string) {
    return this.billing.getRegisterStatus(userId);
  }

  @Post('subscribe')
  subscribe(@CurrentUser('id') userId: string) {
    return this.billing.subscribe(userId);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  sync(@CurrentUser('id') userId: string) {
    return this.billing.sync(userId);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser('id') userId: string) {
    return this.billing.cancel(userId);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  webhook(@Body() body: { token?: string }) {
    if (!body?.token) return { ok: true };
    return this.billing.handleWebhook(body.token);
  }
}
