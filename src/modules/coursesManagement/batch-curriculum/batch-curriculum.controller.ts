import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import {
  CopyCurriculumPreviewQueryDto,
  SaveCurriculumDto,
} from './batch-curriculum.dto';
import { BatchCurriculumService } from './batch-curriculum.service';

@Controller('batches')
export class BatchCurriculumController {
  constructor(private readonly service: BatchCurriculumService) {}

  @Get(':batchId/curriculum')
  getCurriculum(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.service.getCurriculum(batchId);
  }

  @Get(':targetBatchId/curriculum/copy-preview')
  getCopyPreview(
    @Param('targetBatchId', ParseUUIDPipe) targetBatchId: string,
    @Query() query: CopyCurriculumPreviewQueryDto,
  ) {
    return this.service.getCopyPreview(targetBatchId, query);
  }

  @Put(':batchId/curriculum')
  saveCurriculum(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: SaveCurriculumDto,
  ) {
    return this.service.saveCurriculum(batchId, dto);
  }
}
