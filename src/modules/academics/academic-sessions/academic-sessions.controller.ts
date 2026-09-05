import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { AcademicSessionsService } from './academic-sessions.service';
import { CreateAcademicSessionDto } from '../academic-sessions/dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from '../academic-sessions/dto/update-academic-session.dto';

@Controller('academic-sessions')
export class AcademicSessionsController {
  constructor(private readonly service: AcademicSessionsService) {}

  @Post()
  create(@Body() dto: CreateAcademicSessionDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('academicYearId') academicYearId?: string) {
    if (academicYearId) {
      return this.service.findByYear(academicYearId);
    }
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicSessionDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}