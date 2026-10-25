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

  @Get('assigned-courses/:batchId/:semesterNumber')
  // @Permissions('allocations:read')
  async getAssignedCourses(
    @Param('batchId') batchId: string,
    @Param('semesterNumber') semesterNumber: string,
    @Query('sectionId') sectionId?: string,
  ) {
    const data = await this.allocationsService.getAssignedCourses(
      batchId,
      parseInt(semesterNumber, 10),
      sectionId,
    );
    return { success: true, data };
  }

  @Post()
  async create(@Body() dto: CreateAllocationDto) {
    const data = await this.allocationsService.create(dto);
    return {
      success: true,
      message: 'Allocation created successfully',
      data,
    };
  }

  @Post('bulk')
  async bulkCreate(@Body() dto: BulkAllocationDto) {
    const data = await this.allocationsService.bulkCreate(dto);
    return {
      success: true,
      message: 'Bulk allocations processed',
      data,
    };
  }

  @Get()
  async findAll(@Query() query: GetAllocationsQueryDto) {
    const result = await this.allocationsService.findAll(query);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get('section/:sectionId/semester/:semesterNumber')
  async getBySectionSemester(
    @Param('sectionId') sectionId: string,
    @Param('semesterNumber') semesterNumber: string,
  ) {
    const data = await this.allocationsService.getAllocationsBySectionSemester(
      sectionId,
      Number(semesterNumber),
    );
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.allocationsService.findOne(id);
    return {
      success: true,
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.allocationsService.remove(id);
    return {
      success: true,
      message: result.message,
    };
  }
}
