import { Controller, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { PaymentRequiredException } from '../common/exceptions/payment-required.exception';

@Controller('sections/:id/enrich')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post()
  async enrich(
    @CurrentUser('id') userId: string,
    @Param('id') sectionId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    req.on('close', () => res.end());

    try {
      const { enriched } = await this.ai.enrichSection(
        userId,
        sectionId,
        (batch, done, total) => {
          send('progress', { words: batch, done, total });
        },
      );
      send('done', { enriched });
    } catch (err) {
      if (err instanceof PaymentRequiredException) {
        send('quota', { message: err.message, available: err.getResponse() });
      } else {
        send('error', {
          message: err instanceof Error ? err.message : 'Error inesperado',
        });
      }
    } finally {
      res.end();
    }
  }
}
