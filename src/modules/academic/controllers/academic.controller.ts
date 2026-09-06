import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AcademicService } from '../services/academic.service';
import { CreateAcademicYearDto } from '../dto/create-academic.dto';
import { UpdateAcademicYearDto } from '../dto/update-academic-year.dto';

@Controller('academics')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  @Post('year')
  create(@Body() createAcademicYearDto: CreateAcademicYearDto) {
    return this.academicService.create(createAcademicYearDto);
  }

  @Get()
  findAll() {
    return this.academicService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.academicService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAcademicYearDto: UpdateAcademicYearDto,
  ) {
    return this.academicService.update(+id, updateAcademicYearDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.academicService.remove(+id);
  }
  // TODO
  // POST /academics/years
  // GET  /academics/structure

  // POST /academics/years/:id/intake

  // POST /academics/sessions/:id/activate
  // POST /academics/sessions/:id/complete

  // GET  /academics/sections
  // POST /academics/sections
  // PATCH /academics/sections/:id
}
