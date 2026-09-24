import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { IsIn, IsOptional } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AudioService } from './audio.service';
import type { AudioMode } from './audio.service';

class AudioQuery {
  @IsOptional()
  @IsIn(['word', 'example'])
  mode?: AudioMode;
}

@Controller('words/:id/audio')
export class AudioController {
  constructor(private readonly audio: AudioService) {}

  @Get()
  async getAudio(
    @CurrentUser('id') userId: string,
    @Param('id') wordId: string,
    @Query() query: AudioQuery,
    @Res() res: Response,
  ) {
    const { bytes, contentType } = await this.audio.getAudio(
      userId,
      wordId,
      query.mode ?? 'word',
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('Content-Length', bytes.length);
    res.end(bytes);
  }
}
