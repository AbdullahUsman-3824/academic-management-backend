import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SectionService } from '../services/section.service';
import {
  AutoCreateSectionsDto,
  MoveStudentsDto,
  ManualAssignDto,
} from '../dto/section.dto'; // adjust path if you moved the DTOs

@Controller('batches/:batchId/sections')
export class SectionsController {
  constructor(private readonly sectionService: SectionService) {}

  // 1. List real sections of a batch
  @Get()
  list(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.sectionService.listSections(batchId);
  }

  // 2. Students still in default section
  @Get('students-in-default')
  studentsInDefault(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.sectionService.getStudentsInDefault(batchId);
  }

  // 3. Auto create sections by capacity
  @Post('auto')
  autoCreate(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: AutoCreateSectionsDto,
  ) {
    return this.sectionService.autoCreateSections(batchId, dto);
  }

  // 4. Manual create + assign sections
  @Post('manual')
  manualAssign(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: ManualAssignDto,
  ) {
    return this.sectionService.manualAssign(batchId, dto);
  }

  // 5. Move students between sections
  @Post('move-students')
  moveStudents(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: MoveStudentsDto,
  ) {
    return this.sectionService.moveStudents(batchId, dto);
  }

  // 6. Delete one section (students go back to default)
  @Delete(':sectionId')
  deleteSection(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ) {
    return this.sectionService.deleteSection(batchId, sectionId);
  }

  // 7. Reset all sections of a batch
  @Post('reset')
  resetAllSections(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.sectionService.resetAllSections(batchId);
  }
}