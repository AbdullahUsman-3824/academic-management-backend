import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AcademicProgressionService } from '../services/academic-progression.service';
import { StartProgressionDto } from '../dto/start-progression.dto';
import { ConfirmWithRecordDto } from '../dto/confirm-with-record.dto';
import { AssignSemesterDto } from '../dto/assign-semester.dto';
import { AssignSectionsDto } from '../dto/assign-sections.dto';

@Controller('academics/progression')
export class AcademicProgressionController {
  constructor(
    private readonly progressionService: AcademicProgressionService,
  ) {}

  // GET /academics/progression/check
  @Get('check')
  check() {
    return this.progressionService.check();
  }

  // POST /academics/progression/start
  @Post('start')
  @HttpCode(HttpStatus.OK)
  start(@Body() dto: StartProgressionDto) {
    // TODO: replace undefined with req.user.id once auth guard is wired up
    return this.progressionService.start(dto, undefined);
  }

  /**
   * GET /academic-progression/:id/preview
   *
   * Calculates and returns the progression summary for a given progression id:
   * - Per-batch breakdown of students with vs without academic records
   * - Computed target semesters based on any decisions already stored
   *
   * Purely read + compute — safe to call multiple times.
   */
  @Get(':id/preview')
  getPreview(@Param('id', ParseUUIDPipe) id: string) {
    return this.progressionService.getPreview(id);
  }

  /**
   * POST /academic-progression/:id/with-record/confirm
   *
   * Saves the withRecord decision (auto-progress or manual adjustments).
   * Updates status → with_record_done.
   * Only writes to academic_progressions — no permanent records touched.
   * Idempotent: calling again with different data overwrites the decision.
   */
  @Post(':id/with-record/confirm')
  @HttpCode(HttpStatus.OK)
  confirmWithRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmWithRecordDto,
  ) {
    return this.progressionService.confirmWithRecord(id, dto);
  }

  /**
   * POST /academic-progression/:id/without-record/semester
   *
   * Saves the semester assignment decision for students with no prior record.
   * Supports a default semester, batch-level overrides, and student-level overrides.
   * Updates status → semester_assigned.
   * Only writes to academic_progressions — no permanent records touched.
   * Idempotent: re-submitting overwrites the stored decision.
   */
  @Post(':id/without-record/semester')
  @HttpCode(HttpStatus.OK)
  assignSemester(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignSemesterDto,
  ) {
    return this.progressionService.assignSemester(id, dto);
  }

  /**
   * POST /academic-progression/:id/without-record/sections
   *
   * Saves the section assignment strategy for new students:
   * single (keep all in one default section), split_50_50, or custom.
   * Updates status → sections_assigned.
   * Only writes to academic_progressions — no permanent records touched.
   * Idempotent: re-submitting overwrites the stored decision.
   */
  @Post(':id/without-record/sections')
  @HttpCode(HttpStatus.OK)
  assignSections(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignSectionsDto,
  ) {
    return this.progressionService.assignSections(id, dto);
  }

  /**
   * GET /academic-progression/:id/final-preview
   *
   * Returns the full calculated view after all decisions are saved:
   * per-batch student lists with resolved semesters + section breakdown.
   * Advances status → final_preview (idempotent).
   * No permanent records written.
   */
  @Get(':id/final-preview')
  getFinalPreview(@Param('id', ParseUUIDPipe) id: string) {
    return this.progressionService.getFinalPreview(id);
  }

  /**
   * POST /academic-progression/:id/lock
   *
   * THE ONLY endpoint that writes permanent StudentAcademicRecord rows.
   * Executes inside a single DB transaction — full rollback on any failure.
   * Sets status → locked.
   * Cannot be called on an already-locked or cancelled progression.
   */
  @Post(':id/lock')
  @HttpCode(HttpStatus.OK)
  lock(@Param('id', ParseUUIDPipe) id: string) {
    return this.progressionService.lock(id);
  }
}
