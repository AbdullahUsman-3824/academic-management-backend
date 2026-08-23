import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StudentsModule } from './modules/people/students/students.module';
import { FacultyModule } from './modules/people/faculty/faculty.module';
import { BatchesModule } from './modules/academics/batches/batches.module';
import { SectionsModule } from './modules/academics/sections/sections.module';
import { StudentAcademicRecordsModule } from './modules/academics/student-academic-records/student-academic-records.module';
import { AcademicsModule } from './modules/academics/academics/academics.module';
import { CoursesModule } from './modules/courses/courses/courses.module';
import { EnrollmentsModule } from './modules/courses/enrollments/enrollments.module';
import { AllocationsModule } from './modules/courses/allocations/allocations.module';
import { CategoriesModule } from './modules/assessments/categories/categories.module';
import { AssessmentsModule } from './modules/assessments/assessments/assessments.module';
import { MarksModule } from './modules/assessments/marks/marks.module';
import { ResultsModule } from './modules/assessments/results/results.module';
import { GradeScalesModule } from './modules/assessments/grade-scales/grade-scales.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    StudentsModule,
    FacultyModule,
    BatchesModule,
    SectionsModule,
    StudentAcademicRecordsModule,
    AcademicsModule,
    CoursesModule,
    EnrollmentsModule,
    AllocationsModule,
    CategoriesModule,
    AssessmentsModule,
    MarksModule,
    ResultsModule,
    GradeScalesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
