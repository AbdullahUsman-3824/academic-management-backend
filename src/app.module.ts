import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { StudentsModule } from './modules/people/students/students.module';
import { FacultyModule } from './modules/people/faculty/faculty.module';
import { CoursesModule } from './modules/coursesManagement/courses/courses.module';
import { EnrollmentsModule } from './modules/coursesManagement/enrollments/enrollments.module';
import { AllocationsModule } from './modules/coursesManagement/allocations/allocations.module';
import { CategoriesModule } from './modules/assessments/categories/categories.module';
import { AssessmentsModule } from './modules/assessments/assessments/assessments.module';
import { MarksModule } from './modules/assessments/marks/marks.module';
import { ResultsModule } from './modules/assessments/results/results.module';
import { GradeScalesModule } from './modules/assessments/grade-scales/grade-scales.module';
// import { AcademicYearsModule } from './modules/academics/academic-years/academic-years.module';
import { AcademicModule } from './modules/academic/academic.module';
import { SectionsModule } from './modules/sections/sections.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UserModule,
    StudentsModule,
    FacultyModule,
    CoursesModule,
    EnrollmentsModule,
    AllocationsModule,
    CategoriesModule,
    AssessmentsModule,
    MarksModule,
    ResultsModule,
    GradeScalesModule,
    AcademicModule,
    SectionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
