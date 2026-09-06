import { Injectable } from '@nestjs/common';
import { CreateAcademicYearDto } from '../dto/create-academic.dto';
import { UpdateAcademicYearDto } from '../dto/update-academic-year.dto';
import { AcademicYearsService } from './academic-years.service';
import { AcademicSessionsService } from './academic-sessions.service';
// import { BatchService } from './batch.service';

@Injectable()
export class AcademicService {
  constructor(
    private readonly academicYearService: AcademicYearsService,
    private readonly academicSessionService: AcademicSessionsService,
    // private readonly batchService: BatchService,
  ) {}
  async create(dto: CreateAcademicYearDto) {
    const { sessions, ...rest } = dto;

    const academicYear = await this.academicYearService.create(rest);

    // Then create each session and associate it with the academic year
    if (sessions && sessions.length > 0) {
      for (const sessionDto of sessions) {
        await this.academicSessionService.create({
          ...sessionDto,
          academicYearId: academicYear.id,
        });
      }
    }
  }

  findAll() {
    return `This action returns all academic`;
  }

  findOne(id: number) {
    return `This action returns a #${id} academic`;
  }

  update(id: number, updateAcademicYearDto: UpdateAcademicYearDto) {
    return `This action updates a #${id} academic`;
  }

  remove(id: number) {
    return `This action removes a #${id} academic`;
  }
  // TODO
  // createAcademicYear()
  // getStructure()
  // createIntake()
  // activateSession()
  // completeSession()
}
