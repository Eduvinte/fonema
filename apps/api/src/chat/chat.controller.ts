import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';

class ChatStreamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;
}

class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('conversations')
  list(@CurrentUser('id') userId: string) {
    return this.chat.listConversations(userId);
  }

  @Post('conversations')
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chat.createConversation(userId, dto.title);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.chat.deleteConversation(userId, id);
  }

  @Get('conversations/:id/messages')
  messages(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.chat.getMessages(userId, id);
  }

  @Post('conversations/:id/stream')
  async stream(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ChatStreamDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.chat.assertPremium(userId);

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
      const result = await this.chat.streamMessage(userId, id, dto.message, {
        onDelta: (text) => send('delta', { text }),
        onAction: (action) => send('action', { action }),
      });
      send('done', result);
    } catch (err) {
      const status = (err as { getStatus?: () => number }).getStatus?.() ?? 500;
      send('error', {
        status,
        message: err instanceof Error ? err.message : 'Error inesperado',
      });
    } finally {
      res.end();
    }
  }

  @Post('messages/:id/execute')
  @HttpCode(HttpStatus.OK)
  execute(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.chat.execute(userId, id);
  }

  @Post('messages/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  dismiss(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.chat.dismiss(userId, id);
  }
}
