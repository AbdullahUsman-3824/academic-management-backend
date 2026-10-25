import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { SectionService } from '../services/section.service';
import {
  CreateSectionDto,
  UpdateSectionDto,
  MoveStudentsSectionDto,
} from '../dto/section.dto';

@Controller('academics/batches/:batchId/sections')
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  // POST /academics/batches/:batchId/sections
  @Post()
  create(
    @Body() dto: CreateSectionDto,
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ) {
    return this.sectionService.createSection(dto, batchId);
  }

  // GET /academics/batches/:batchId/sections
  @Get()
  findAll(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.sectionService.listSections(batchId);
  }

  // PATCH /academics/batches/:batchId/sections/:sectionId
  @Patch(':sectionId')
  update(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionService.updateSection(batchId, sectionId, dto);
  }

  // DELETE /academics/batches/:batchId/sections/:sectionId
  @Delete(':sectionId')
  deleteSection(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ) {
    return this.sectionService.deleteSection(batchId, sectionId);
  }

  // POST /academics/batches/:batchId/sections/move-students
  @Post('move-students')
  moveStudents(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: MoveStudentsSectionDto,
  ) {
    return this.sectionService.moveStudents(batchId, dto);
  }
}
