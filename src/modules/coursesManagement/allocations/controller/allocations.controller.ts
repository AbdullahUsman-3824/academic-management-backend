import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AllocationsService } from '../service/allocations.service';
import {
  CreateAllocationDto,
  BulkAllocationDto,
  GetAllocationsQueryDto,
} from '../dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';

@Controller('allocations')
@UseGuards(JwtAuthGuard)
export class AllocationsController {
  constructor(private readonly allocationsService: AllocationsService) {}

  @Post()
  create(@Body() dto: CreateAllocationDto) {
    return this.allocationsService.create(dto);
  }

  @Post('bulk')
  bulkCreate(@Body() dto: BulkAllocationDto) {
    return this.allocationsService.bulkCreate(dto);
  }

  @Get()
  findAll(@Query() query: GetAllocationsQueryDto) {
    return this.allocationsService.findAll(query);
  }

  @Get('section/:sectionId/semester/:semesterNumber')
  getBySectionSemester(
    @Param('sectionId') sectionId: string,
    @Param('semesterNumber') semesterNumber: string,
  ) {
    return this.allocationsService.getAllocationsBySectionSemester(
      sectionId,
      Number(semesterNumber),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.allocationsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.allocationsService.remove(id);
  }
}
