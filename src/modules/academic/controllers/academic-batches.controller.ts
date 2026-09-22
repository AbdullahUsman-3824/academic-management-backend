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
import { BatchService } from '../services/batch.service';
import { UpdateBatchDto } from '../dto/update-batch.dto';
import { BatchStatus } from '../../../generated/prisma/enums';

@Controller('academics/batches')
export class AcademicBatchController {
  constructor(private readonly batchService: BatchService) {}

  // GET /academics/batches
  @Get()
  findAllBatches(@Query('status') status?: BatchStatus) {
    return this.batchService.findAll(status);
  }

  // GET /academics/batches/:id
  @Get(':id')
  findOneBatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.batchService.findOne(id);
  }

  // PATCH /academics/batches/:id
  @Patch(':id')
  updateBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.batchService.update(id, dto);
  }

  // POST /academics/batches/:id/activate
  @Post(':id/activate')
  activateBatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.batchService.activate(id);
  }
}
