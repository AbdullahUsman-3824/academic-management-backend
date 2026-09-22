import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SectionsService } from '../services/sections.service';
import {
  AutoCreateSectionsDto,
  MoveStudentsDto,
  ManualAssignDto,
} from '../dto/section.dto';

@Controller('batches/:batchId/sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  list(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.sectionsService.listSections(batchId);
  }

  @Get('students-in-default')
  studentsInDefault(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.sectionsService.getStudentsInDefault(batchId);
  }

  // Automatic creation
  @Post('auto')
  autoCreate(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: AutoCreateSectionsDto,
  ) {
    return this.sectionsService.autoCreateSections(batchId, dto);
  }

  // Manual creation
  @Post('manual')
  manualAssign(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: ManualAssignDto,
  ) {
    return this.sectionsService.manualAssign(batchId, dto);
  }

  // Bulk move students
  @Post('move-students')
  moveStudents(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: MoveStudentsDto,
  ) {
    return this.sectionsService.moveStudents(batchId, dto);
  }

  // Delete section → students go back to default
  @Delete(':sectionId')
  deleteSection(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ) {
    return this.sectionsService.deleteSection(batchId, sectionId);
  }

  @Post('reset')
  resetAllSections(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.sectionsService.resetAllSections(batchId);
  }
}
