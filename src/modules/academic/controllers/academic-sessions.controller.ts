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
import { AcademicSessionStatus } from '../../../generated/prisma/enums';
import {
  CreateAcademicSessionDto,
  UpdateAcademicSessionDto,
} from '../dto/academic-session.dto';

@Controller('academics/sessions')
export class AcademicSessionController {
  constructor(private readonly sessionService: AcademicSessionsService) {}

  // GET /academics/sessions?status=...&academicYearId=...
  @Get()
  findAllSessions(
    @Query('academicYearId', new ParseUUIDPipe({ optional: true }))
    academicYearId?: string,
    @Query('status') status?: AcademicSessionStatus,
  ) {
    return this.sessionService.findAll({ status, academicYearId });
  }

  // GET /academics/sessions/list?academicYearId=uuid&status=...
  @Get('list')
  listForSelect(
    @Query('academicYearId', new ParseUUIDPipe({ optional: true }))
    academicYearId?: string,
    @Query('status') status?: AcademicSessionStatus,
  ) {
    return this.sessionService.listForSelect({ academicYearId, status });
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

  // POST /academics/sessions
  @Post()
  createSession(@Body() dto: CreateAcademicSessionDto) {
    return this.sessionService.create(dto);
  }
}
