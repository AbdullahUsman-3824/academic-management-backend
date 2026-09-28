import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AllocationsService } from '../service/allocations.service';
import { CreateAllocationDto } from '../dto/create-allocation.dto';

@Controller('course-allocations')
export class AllocationsController {
  constructor(private readonly service: AllocationsService) {}

  @Post()
  create(@Body() dto: CreateAllocationDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('academicSessionId') academicSessionId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('facultyId') facultyId?: string,
  ) {
    return this.service.findAll({
      academicSessionId,
      sectionId,
      facultyId,
    });
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}