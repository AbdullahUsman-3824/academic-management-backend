import { Injectable } from '@nestjs/common';
import { CreateAcademicYearDto } from '../dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from '../dto/update-academic-year.dto';
import { AcademicYearsService } from './academic-years.service';
import { AcademicSessionsService } from './academic-sessions.service';
import { CreateAcademicSessionDto } from '../dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from '../dto/update-academic-session.dto';
// import { BatchService } from './batch.service';

@Injectable()
export class AcademicService {
  constructor(
    private readonly academicYearService: AcademicYearsService,
    private readonly academicSessionService: AcademicSessionsService,
    // private readonly batchService: BatchService,
  ) {}

  async findAllYears() {
  return this.academicYearService.findAll();
}

  async findOneYear(id: string) {
  return this.academicYearService.findOne(id);
}

  async updateYear(id: string, dto: UpdateAcademicYearDto) {
  return this.academicYearService.update(id, dto);
}


  async removeYear(id: string) {
  return this.academicYearService.remove(id);
}


async createSession(dto: CreateAcademicSessionDto) {
  return this.academicSessionService.create(dto);
}

async findAllSessions() {
  return this.academicSessionService.findAll();
}


async findOneSession(id: string) {
  return this.academicSessionService.findOne(id);
}

async updateSession(id: string, dto: UpdateAcademicSessionDto) {
  return this.academicSessionService.update(id, dto);
}

async removeSession(id: string) {
  return this.academicSessionService.remove(id);
}

  async create(dto: CreateAcademicYearDto) {
  return this.academicYearService.create(dto);
}
  // TODO
  // createAcademicYear()
  // getStructure()
  // createIntake()
  // activateSession()
  // completeSession()
}
