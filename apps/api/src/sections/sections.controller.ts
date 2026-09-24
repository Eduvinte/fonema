import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { BulkWordsDto } from '../words/dto/bulk-words.dto';

@Controller('sections')
export class SectionsController {
  constructor(private readonly sections: SectionsService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.sections.list(userId);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateSectionDto) {
    return this.sections.create(user.id, dto);
  }

  @Get(':id')
  getOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sections.getOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sections.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sections.remove(userId, id);
  }

  @Post(':id/words')
  addWords(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: BulkWordsDto,
  ) {
    return this.sections.addWords(userId, id, dto.words);
  }
}
