import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { FlowService } from './flow.service';

@Injectable()
export class BillingService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly flow: FlowService,
    private readonly analytics: AnalyticsService,
  ) {}

  async getState(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    let cardRegistered = false;
    let cardInfo: { creditCardType?: string; last4CardDigits?: string } = {};
    if (user.flowCustomerId) {
      try {
        const customer = await this.flow.getCustomer(user.flowCustomerId);
        cardRegistered = Boolean(customer.last4CardDigits);
        cardInfo = {
          creditCardType: customer.creditCardType,
          last4CardDigits: customer.last4CardDigits,
        };
      } catch {
        // si Flow no responde, seguimos con lo que tenemos en BD
      }
    }

    return {
      plan: user.plan,
      hasCard: cardRegistered,
      card: cardInfo,
      subscriptionId: user.flowSubscriptionId,
    };
  }

  async startCheckout(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (user.plan === Plan.PREMIUM) {
      throw new BadRequestException('Ya tienes el plan Premium activo');
    }

    let customerId = user.flowCustomerId;
    if (!customerId) {
      customerId = await this.flow.createCustomer(
        user.name ?? user.email,
        user.email,
        user.id,
      );
      await this.prisma.user.update({
        where: { id: userId },
        data: { flowCustomerId: customerId },
      });
    }

    const returnUrl = this.config.getOrThrow<string>('BILLING_RETURN_URL');
    const { url, token } = await this.flow.registerCard(customerId, returnUrl);
    return { redirectUrl: `${url}?token=${token}` };
  }

  async getRegisterStatus(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!user.flowCustomerId) return { registered: false };

    const customer = await this.flow.getCustomer(user.flowCustomerId);
    return {
      registered: Boolean(customer.last4CardDigits),
      creditCardType: customer.creditCardType,
      last4CardDigits: customer.last4CardDigits,
    };
  }

  async subscribe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (user.plan === Plan.PREMIUM) {
      throw new BadRequestException('Ya tienes el plan Premium activo');
    }
    if (!user.flowCustomerId) {
      throw new BadRequestException('Primero registra tu tarjeta');
    }

    const customer = await this.flow.getCustomer(user.flowCustomerId);
    if (!customer.last4CardDigits) {
      throw new BadRequestException('Aún no registras tu tarjeta de crédito');
    }

    const planId = this.config.getOrThrow<string>('FLOW_PLAN_ID');
    const { subscriptionId } = await this.flow.createSubscription(
      user.flowCustomerId,
      planId,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { flowSubscriptionId: subscriptionId },
    });

    this.analytics.track('SUBSCRIPTION_CREATED', userId, { subscriptionId });
    return { subscriptionId };
  }

  async cancel(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!user.flowSubscriptionId) {
      throw new BadRequestException('No tienes una suscripción activa');
    }

    await this.flow.cancelSubscription(user.flowSubscriptionId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { plan: Plan.FREE, flowSubscriptionId: null },
    });

    return { ok: true };
  }

  async handleWebhook(token: string) {
    const status = await this.flow.getPaymentStatus(token);

    if (status.status === 2) {
      await this.activateFromPayment(status);
    }

    return { ok: true };
  }

  async sync(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    let subscriptionId = user.flowSubscriptionId;

    if (!subscriptionId && user.flowCustomerId) {
      const subscriptions = await this.flow.getCustomerSubscriptions(
        user.flowCustomerId,
      );
      const active = subscriptions.find((s) => s.status === 1);
      if (active) {
        subscriptionId = active.subscriptionId;
        await this.prisma.user.update({
          where: { id: userId },
          data: { flowSubscriptionId: subscriptionId },
        });
      }
    }

    let activated = false;

    if (subscriptionId) {
      try {
        const subscription = await this.flow.getSubscription(subscriptionId);
        const paidInvoices = (subscription.invoices ?? [])
          .map((inv) => inv.payment)
          .filter(
            (payment): payment is NonNullable<typeof payment> =>
              payment != null && payment.status === 2,
          );
        for (const payment of paidInvoices) {
          await this.activateFromPayment(payment);
          activated = true;
        }
      } catch {
        // si subscription/get falla, seguimos con los pagos del día
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    for (const date of [today, yesterday]) {
      const payments = await this.flow.getPaymentsByDate(date);
      const relevant = payments.filter((p) => {
        if (p.status !== 2) return false;
        if (subscriptionId && p.commerceOrder.startsWith(subscriptionId))
          return true;
        return p.payer.toLowerCase() === user.email.toLowerCase();
      });
      for (const payment of relevant) {
        await this.activateFromPayment(payment);
        activated = true;
      }
    }

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    return { plan: updated.plan, activated };
  }

  private async activateFromPayment(status: {
    flowOrder: number | string;
    commerceOrder: string;
    status: number;
    subject: string;
    amount: number | string;
    payer: string;
  }) {
    let userId: string | null = null;

    try {
      const subscriptionId = status.commerceOrder.split('-')[0];
      if (subscriptionId) {
        const subscription = await this.flow.getSubscription(subscriptionId);
        const user = await this.prisma.user.findUnique({
          where: { flowCustomerId: subscription.customerId },
        });
        userId = user?.id ?? null;
      }
    } catch {
      userId = null;
    }

    if (!userId) {
      const user = await this.prisma.user.findUnique({
        where: { email: status.payer.toLowerCase() },
      });
      userId = user?.id ?? null;
    }

    if (!userId) return;

    const flowOrder = Number(status.flowOrder);

    const existing = await this.prisma.payment.findUnique({
      where: { flowOrder },
    });

    await this.prisma.$transaction([
      this.prisma.payment.upsert({
        where: { flowOrder },
        update: { status: status.status, paidAt: new Date() },
        create: {
          userId,
          flowOrder,
          commerceOrder: status.commerceOrder,
          amount: Number(status.amount),
          status: status.status,
          subject: status.subject,
          paidAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { plan: Plan.PREMIUM },
      }),
    ]);

    this.analytics.track('PAYMENT_RECEIVED', userId, {
      flowOrder,
      amount: Number(status.amount),
      firstTime: !existing,
    });
  }
}
