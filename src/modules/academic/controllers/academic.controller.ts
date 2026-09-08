import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AcademicService } from '../services/academic.service';
import { CreateAcademicYearDto } from '../dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from '../dto/update-academic-year.dto';
import { CreateAcademicSessionDto } from '../dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from '../dto/update-academic-session.dto';

@Controller('academics')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

//apis for academic year 
  @Post('year')
create(@Body() createAcademicYearDto: CreateAcademicYearDto) {
  return this.academicService.create(createAcademicYearDto);
}

  @Get('years')
findAllYears() {
  return this.academicService.findAllYears();
}

  @Get('years/:id')
findOneYear(@Param('id', ParseUUIDPipe) id: string) {
  return this.academicService.findOneYear(id);
}

  @Patch('years/:id')
updateYear(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: UpdateAcademicYearDto,
) {
  return this.academicService.updateYear(id, dto);
}


  @Delete('years/:id')
removeYear(@Param('id', ParseUUIDPipe) id: string) {
  return this.academicService.removeYear(id);
}

//apis 
@Post('sessions')
createSession(@Body() dto: CreateAcademicSessionDto) {
  return this.academicService.createSession(dto);
}

@Get('sessions')
findAllSessions() {
  return this.academicService.findAllSessions();
}


@Get('sessions/:id')
findOneSession(@Param('id', ParseUUIDPipe) id: string) {
  return this.academicService.findOneSession(id);
}

@Patch('sessions/:id')
updateSession(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: UpdateAcademicSessionDto,
) {
  return this.academicService.updateSession(id, dto);
}


@Delete('sessions/:id')
removeSession(@Param('id', ParseUUIDPipe) id: string) {
  return this.academicService.removeSession(id);
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
