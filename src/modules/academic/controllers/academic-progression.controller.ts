import {
  Controller,
  Get,
  Post,
  Body,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { AcademicProgressionService } from '../services/academic-progression.service';
import { ImplementProgressionDto } from '../dto/implement-progression.dto';

@Controller('academics/progression')
export class AcademicProgressionController {
  constructor(
    private readonly progressionService: AcademicProgressionService,
  ) {}

  // GET /academics/progression/preview?academicSessionId=uuid (optional)
  @Get('preview')
  getPreview(
    @Query('academicSessionId', new ParseUUIDPipe({ optional: true }))
    academicSessionId?: string,
  ) {
    return this.progressionService.getPreview(academicSessionId);
  }

  // POST /academics/progression/implement
  @Post('implement')
  implement(@Body() dto: ImplementProgressionDto) {
    return this.progressionService.implement(dto);
  }
}
