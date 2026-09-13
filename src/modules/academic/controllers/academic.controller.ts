import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AcademicService } from '../services/academic.service';
import { AcademicYearsService } from '../services/academic-years.service';
import { AcademicSessionsService } from '../services/academic-sessions.service';
import { BatchService } from '../services/batch.service';
import { UpdateAcademicYearDto } from '../dto/update-academic-year.dto';
import { UpdateAcademicSessionDto } from '../dto/update-academic-session.dto';
import { UpdateBatchDto } from '../dto/update-batch.dto';
import { AcademicSetupDto } from '../dto/academic-setup.dto';
import {
  AcademicYearStatus,
  AcademicSessionStatus,
  BatchStatus,
} from '../enums/academic-status.enum';

@Controller('academics')
export class AcademicController {
  constructor(
    private readonly academicService: AcademicService,
    private readonly yearService: AcademicYearsService,
    private readonly sessionService: AcademicSessionsService,
    private readonly batchService: BatchService,
  ) {}

  // ================================================
  //               Academic APIs
  // ================================================

  // POST /academics/setup
  @Post('setup')
  createSetup(@Body() dto: AcademicSetupDto) {
    return this.academicService.setup(dto);
  }

  // GET /academics/overview
  @Get('overview')
  getOverview() {
    return this.academicService.getOverview();
  }

  // ================================================
  //               Academic Year APIs
  // ================================================

  // GET /academics/years?status=active|inactive|completed
  @Get('years')
  findAllYears(@Query('status') status?: AcademicYearStatus) {
    return this.yearService.findAll(status);
  }

  // GET /academics/years/:id
  @Get('years/:id')
  findOneYear(@Param('id', ParseUUIDPipe) id: string) {
    return this.yearService.findOne(id);
  }

  // PATCH /academics/years/:id
  @Patch('years/:id')
  updateYear(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.yearService.update(id, dto);
  }

  // ================================================
  //              Academic Session APIs
  // ================================================

  // GET /academics/sessions?status=upcoming|active|completed|cancelled&academicYearId=uuid
  @Get('sessions')
  findAllSessions(
    @Query('status') status?: AcademicSessionStatus,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.sessionService.findAll({ status, academicYearId });
  }

  // GET /academics/sessions/:id
  @Get('sessions/:id')
  findOneSession(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessionService.findOne(id);
  }

  // PATCH /academics/sessions/:id
  @Patch('sessions/:id')
  updateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicSessionDto,
  ) {
    return this.sessionService.update(id, dto);
  }

  // POST /academics/sessions/:id/activate
  @Post('sessions/:id/activate')
  activateSession(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessionService.activate(id);
  }

  // POST /academics/sessions/:id/complete
  @Post('sessions/:id/complete')
  completeSession(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessionService.complete(id);
  }

  // ================================================
  //             Academic Batch APIs
  // ================================================

  // GET /academics/batches
  @Get('batches')
  findAllBatches(@Query('status') status?: BatchStatus) {
    return this.batchService.findAll(status);
  }

  // GET /academics/batches/:id
  @Get('batches/:id')
  findOneBatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.batchService.findOne(id);
  }

  // PATCH /academics/batches/:id
  @Patch('batches/:id')
  updateBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.batchService.update(id, dto);
  }

  // POST /academics/batches/:id/activate
  @Post('batches/:id/activate')
  activateBatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.batchService.activate(id);
  }
}
