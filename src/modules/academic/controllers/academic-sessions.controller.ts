import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AcademicSessionsService } from '../services/academic-sessions.service';
import { UpdateAcademicSessionDto } from '../dto/update-academic-session.dto';
import { AcademicSessionStatus } from '../../../generated/prisma/enums';

@Controller('academics/sessions')
export class AcademicSessionController {
  constructor(private readonly sessionService: AcademicSessionsService) {}

  // GET /academics/sessions?status=upcoming|active|completed|cancelled&academicYearId=uuid
  @Get()
  findAllSessions(
    @Query('status') status?: AcademicSessionStatus,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.sessionService.findAll({ status, academicYearId });
  }

  // GET /academics/sessions/:id
  @Get(':id')
  findOneSession(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessionService.findOne(id);
  }

  // PATCH /academics/sessions/:id
  @Patch(':id')
  updateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicSessionDto,
  ) {
    return this.sessionService.update(id, dto);
  }

  // POST /academics/sessions/:id/activate
  @Post(':id/activate')
  activateSession(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessionService.activate(id);
  }

  // POST /academics/sessions/:id/complete
  @Post(':id/complete')
  completeSession(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessionService.complete(id);
  }
}
