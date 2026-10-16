import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FacultyService } from '../services/faculty.service';
import { CreateFacultyDto } from '../dto/create-faculty.dto';
import { UpdateFacultyDto } from '../dto/update-faculty.dto';
import { QueryFacultyDto } from '../dto/query-faculty.dto';
import { UpdateFacultyStatusDto } from '../dto/update-faculty-status.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';

@Controller('faculty')
@UseGuards(JwtAuthGuard)
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) {}

  @Post()
  async create(@Body() createFacultyDto: CreateFacultyDto) {
    const data = await this.facultyService.create(createFacultyDto);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: QueryFacultyDto) {
    const result = await this.facultyService.findAll(query);
    return { success: true, ...result };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.facultyService.findOne(id);
    return { success: true, data };
  }

  @Get(':id/teaching-load')
  async getTeachingLoad(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    const data = await this.facultyService.getTeachingLoad(
      id,
      academicSessionId,
    );
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFacultyDto: UpdateFacultyDto,
  ) {
    const data = await this.facultyService.update(id, updateFacultyDto);
    return { success: true, data };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateFacultyStatusDto,
  ) {
    const data = await this.facultyService.updateStatus(id, updateStatusDto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.facultyService.remove(id);
    return { success: true, ...data };
  }
}
