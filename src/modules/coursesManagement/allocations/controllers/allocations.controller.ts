import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AllocationsService } from '../services/allocations.service';
import {
  CreateAllocationDto,
  BulkAllocationDto,
  UpdateAllocationDto,
} from '../dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';

@Controller('allocations')
@UseGuards(JwtAuthGuard)
export class AllocationsController {
  constructor(private readonly allocationsService: AllocationsService) {}

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

  @Get('groups/current')
  getCurrentSessionGroups() {
    return this.allocationsService.getCurrentSessionGroups();
  }

  @Get('faculty-options')
  async getFacultyOptions() {
    const data = await this.allocationsService.getFacultyOptions();
    return {
      success: true,
      data,
    };
  }

  @Get('current/:sectionId')
  getCurrent(@Param('sectionId', ParseUUIDPipe) sectionId: string) {
    return this.allocationsService.getCurrentSectionAllocations(sectionId);
  }

  @Get('history/:sectionId')
  getHistory(@Param('sectionId', ParseUUIDPipe) sectionId: string) {
    return this.allocationsService.getSectionAllocationHistory(sectionId);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAllocationDto,
  ) {
    const data = await this.allocationsService.update(id, dto);
    return {
      success: true,
      message: 'Allocation faculty updated successfully',
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
