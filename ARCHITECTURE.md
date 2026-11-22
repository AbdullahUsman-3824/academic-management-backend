# Academic Management System --- Architecture

> **Document status:** Proposed architecture\
> **Backend:** NestJS + Prisma + PostgreSQL\
> **Frontend:** React + Vite\
> **Schema organization:** Split Prisma schema files under `prisma/`
>
> This document describes the target architecture agreed for the
> Academic Management System. It is an architectural blueprint, not
> confirmation that all proposed changes have already been implemented
> or migrated to the database.

------------------------------------------------------------------------

## 1. Architectural goals

The system should support:

-   Academic years containing one or more academic sessions.
-   Batches with their own curricula.
-   Configurable semesters.
-   Students permanently assigned to one batch.
-   Students changing sections between academic sessions.
-   Course offerings assigned to one teacher per course, section,
    academic session, and offering type.
-   Automatic regular-course enrollment after course allocations are
    finalized.
-   Separate course offerings and enrollments for failed-course retakes.
-   Preservation of each student's course attempts, marks, and results.
-   Historical academic records without duplicating data unnecessarily.

There is currently one academic program. A separate `Program` model is
not required by the agreed scope.

## 2. Core domain concepts

The system separates the academic structure into five concepts:

1.  **Course catalog** --- the courses the institution offers.
2.  **Batch curriculum** --- the courses a particular batch must study
    and the semester in which each course belongs.
3.  **Course allocation** --- the actual offering of a curriculum course
    to a section in an academic session, with an assigned faculty
    member.
4.  **Course enrollment** --- the association between a student's
    academic record and an actual course allocation.
5.  **Assessment and result** --- the assessment marks and final result
    for a particular enrollment/attempt.

These concepts must remain separate. A course in the catalog is not
automatically an active offering, and a curriculum assignment is not
itself a student enrollment.

## 3. Academic structure

### 3.1 AcademicYear

Represents an academic year.

Important fields:

-   `id`
-   `name`
-   `startDate`
-   `endDate`
-   `status`

Relationships:

-   One academic year has many academic sessions.
-   One academic year can be the entry year for many batches.

The start and end dates are explicit. The system must not assume that an
academic year starts on 1 January.

### 3.2 AcademicSession

Represents an academic teaching period within an academic year.

Important fields:

-   `id`
-   `academicYearId`
-   `name`
-   `startDate`
-   `endDate`
-   `status`
-   `progressed`

Relationships:

-   Belongs to one academic year.
-   Has many student academic records.
-   Has many course allocations.

A student's academic progression is recorded against academic sessions.

### 3.3 Batch

Represents a student cohort.

Important fields:

-   `id`
-   `name`
-   `entryYearId`
-   `programDuration`
-   `sectionCapacity`
-   `status`

Relationships:

-   Belongs to an entry academic year.
-   Has many students.
-   Has many sections.
-   Has many batch course assignments.

**Batch transfer is not supported.** A student's `batchId` remains fixed
for the student's lifetime in the system. Consequently,
`StudentAcademicRecord` does not need its own `batchId`; the batch is
obtained through `Student`.

### 3.4 Section

Represents a section within a batch.

Important fields:

-   `id`
-   `batchId`
-   `name`
-   `isDefault`

Relationships:

-   Belongs to one batch.
-   Has many student academic records.
-   Has many course allocations.

A student may change sections between academic sessions. The student's
section is therefore stored on `StudentAcademicRecord`, not permanently
on `Student`.

The section's batch must match the student's fixed batch. This must be
validated when creating or updating an academic record.

### 3.5 Semester

Represents a configurable semester definition.

Important fields:

-   `id`
-   `number`
-   `name`
-   `displayName`
-   `minCredits`
-   `maxCredits`
-   `isActive`

Semesters are **configurable**, not hardcoded to 1--8. An administrator
can add further semesters when required.

`number` should be unique and represent the semester's ordering. Do not
add a database check constraint that restricts semester numbers to 1--8.

A semester is referenced by:

-   `BatchCourseAssignment`, to identify the curriculum semester of a
    course.
-   `StudentAcademicRecord`, to identify the student's current academic
    semester.

These two references have different meanings when a student is repeating
an earlier course.

### 3.6 StudentAcademicRecord

Represents a student's academic placement in one academic session.

Important fields:

-   `id`
-   `studentId`
-   `academicSessionId`
-   `sectionId`
-   `semesterId`
-   `status`

Relationships:

-   Belongs to one student.
-   Belongs to one academic session.
-   Belongs to one section.
-   Belongs to one current semester.
-   Has many course enrollments.

Recommended uniqueness:

``` prisma
@@unique([studentId, academicSessionId])
```

This establishes one academic record per student per academic session.

The following fields are redundant and should be removed from the target
model:

-   `batchId` --- derive it through `Student.batchId`.
-   `semesterNumber` --- derive it through `Semester.number`.

The section is stored on each academic record so that section changes
between sessions are represented historically.

**Important distinction:** `StudentAcademicRecord.semesterId` is the
student's current semester. It does not necessarily equal the semester
of every course the student is taking. A student in Semester 2 may
retake a course originally assigned to Semester 1.

------------------------------------------------------------------------

## 4. Course catalog and curriculum

### 4.1 Course

Represents a course in the institution's course catalog.

Important fields:

-   `id`
-   `code`
-   `name`
-   `description`
-   `creditHours`
-   `status`

A course is a reusable catalog item. It can be included in the curricula
of multiple batches.

Course catalog data should not be confused with a batch's curriculum or
an actual course offering.

### 4.2 BatchCourseAssignment

This is the authoritative curriculum mapping.

It defines which course belongs to which semester for a particular
batch.

Target fields:

-   `id`
-   `batchId`
-   `courseId`
-   `semesterId`
-   `isCompulsory`
-   `displayOrder`

Relationships:

-   Belongs to one batch.
-   Belongs to one course.
-   Belongs to one semester.
-   Can have many course allocations.

Recommended uniqueness:

``` prisma
@@unique([batchId, semesterId, courseId])
```

This prevents the same course from being assigned more than once to the
same batch and semester.

The current `semesterNumber` field should be replaced with `semesterId`,
creating a proper foreign-key relationship to `Semester`.

### 4.3 SemesterCourse

The existing `SemesterCourse` model maps courses directly to semesters
without considering a batch.

Because different batches can have different curricula,
`BatchCourseAssignment` becomes the authoritative curriculum model.

The target architecture removes `SemesterCourse`, provided all active
services, controllers, queries, seed scripts, and frontend API consumers
have been migrated away from it.

Do not drop the existing table until its data and code dependencies have
been reviewed and any required information has been migrated.

------------------------------------------------------------------------

## 5. Course allocation and delivery

### 5.1 CourseAllocation

Represents an actual offering of a batch curriculum course to a section
in an academic session, assigned to one faculty member.

A course allocation should reference `BatchCourseAssignment`, rather
than independently storing `courseId` and `semesterNumber`.

Target fields:

-   `id`
-   `batchCourseAssignmentId`
-   `facultyId`
-   `sectionId`
-   `academicSessionId`
-   `type`
-   `status`
-   timestamps

Recommended enum:

``` prisma
enum CourseAllocationType {
  REGULAR
  RETAKE
}
```

Relationships:

-   Belongs to one batch course assignment.
-   Belongs to one faculty member.
-   Belongs to one section.
-   Belongs to one academic session.
-   Has many course enrollments.
-   Has many assessments.

The course and its curriculum semester are derived through
`BatchCourseAssignment`.

Recommended uniqueness:

``` prisma
@@unique([
  batchCourseAssignmentId,
  sectionId,
  academicSessionId,
  type
])
```

This allows one regular allocation and one retake allocation for the
same curriculum course, section, and academic session, while preventing
duplicate allocations of the same type.

The unique constraint also enforces the agreed rule of one teacher per
course, section, academic session, and allocation type. A second faculty
member cannot be assigned by creating another allocation with the same
unique key.

### 5.2 Allocation validation

The application must validate:

1.  The allocation's section belongs to the same batch as its
    `BatchCourseAssignment`.
2.  The academic session is valid for the intended academic operation.
3.  The faculty member is active and eligible to teach the course.
4.  The same allocation key does not already exist.
5.  Regular and retake allocations are treated as separate offering
    types.

For regular enrollment, a student's academic-record section must match
the regular allocation's section.

For retake enrollment, the retake allocation's section represents the
delivery group for the retake. It may be different from the student's
normal section, but it must belong to the student's batch. This permits
the institution to group failed students separately.

If the institution later needs multiple parallel retake groups of the
same course, section, session, and type, the allocation identity will
need an additional grouping/cohort dimension instead of weakening the
one-teacher rule.

------------------------------------------------------------------------

## 6. Student course enrollment and attempts

### 6.1 CourseEnrollment

Represents one student's enrollment in one actual course allocation.

Target fields:

-   `id`
-   `studentAcademicRecordId`
-   `allocationId`
-   `attemptNumber`
-   `status`
-   `isExtra`
-   `enrolledAt`
-   `droppedAt`
-   timestamps

Recommended relationships:

-   Belongs to one `StudentAcademicRecord`.
-   Belongs to one `CourseAllocation`.
-   Has its own result.

Recommended uniqueness:

``` prisma
@@unique([studentAcademicRecordId, allocationId])
```

Target changes from the current model:

-   Make `allocationId` required.
-   Remove `courseId`; derive the course through
    `CourseAllocation -> BatchCourseAssignment -> Course`.
-   Add `attemptNumber`.
-   Keep `isExtra` if the institution needs courses outside the normal
    curriculum.
-   Preserve dropped and historical enrollments rather than deleting
    them.

`attemptNumber` identifies the student's attempt at the same course. It
is assigned by the enrollment service after checking previous attempts.
The service must do this transactionally to avoid concurrent duplicate
attempt numbers.

### 6.2 Regular enrollment workflow

Regular enrollments are generated only after an administrator finalizes
the relevant course allocations.

The expected workflow is:

1.  Create student academic records for the academic session.
2.  Create regular course allocations for the batch curriculum and
    relevant sections.
3.  Validate that the required regular allocations are complete.
4.  Finalize/publish the allocations.
5.  Generate enrollments for eligible students in the matching batch,
    semester, and section.
6.  Preserve existing enrollments and avoid generating duplicates.

The system should expose an explicit finalize/publish operation.
Creating an individual allocation should not immediately enroll
students, because the administrator may not have finished assigning all
courses.

The finalize operation must be idempotent: running it again must not
create duplicate enrollments.

### 6.3 Retake enrollment workflow

A failed course remains in the student's history. Its previous
enrollment, marks, and result must not be overwritten or deleted.

Expected workflow:

1.  Identify students with a finalized failing result for a course.
2.  Determine whether each student is eligible to retake it under
    institutional policy.
3.  Create a separate `RETAKE` course allocation.
4.  Assign a faculty member and delivery section to that allocation.
5.  Enroll eligible students against the retake allocation.
6.  Assign the next `attemptNumber`.
7.  Store the new marks and result against the new enrollment.

Example:

  Attempt   Allocation type   Result
  --------- ----------------- --------
  1         REGULAR           Failed
  2         RETAKE            Passed

The original result remains unchanged. Each attempt has its own
`CourseEnrollment` and `StudentCourseResult`.

The retake allocation references the original `BatchCourseAssignment`.
Therefore, its curriculum semester remains the semester in which the
course was originally prescribed, even if the student is currently in a
later semester.

Retake eligibility, maximum attempts, fees, and progression rules are
institutional policies. They should be implemented as explicit business
rules rather than inferred solely from the `isReappear` flag.

------------------------------------------------------------------------

## 7. Assessment and grading

### 7.1 AssessmentCategory

Represents categories such as quizzes, assignments, midterms, and
finals.

Existing fields can be retained:

-   `id`
-   `name`
-   `weightage`
-   `displayOrder`
-   `isActive`

**Policy requiring confirmation:** The current model stores `weightage`
globally. If category weightage can differ by course, academic session,
or assessment scheme, introduce a separate
assessment-scheme/configuration model. Do not assume global weightage is
correct for every course without confirming institutional policy.

### 7.2 Assessment

Represents an assessment created for a course allocation.

Existing relationships are appropriate:

-   Belongs to one `CourseAllocation`.
-   Belongs to one `AssessmentCategory`.
-   Belongs to the faculty member who created it.
-   Has many student marks.

An assessment is attached to the actual offering, not directly to a
batch, semester, or course catalog entry.

### 7.3 StudentMark

Represents one student's marks in one assessment for one specific course
enrollment/attempt.

Target fields:

-   `id`
-   `assessmentId`
-   `courseEnrollmentId`
-   `marksObtained`
-   `remarks`
-   `enteredBy`
-   `updatedBy`
-   timestamps

Recommended uniqueness:

``` prisma
@@unique([assessmentId, courseEnrollmentId])
```

Replace the direct `studentId` relation with `courseEnrollmentId`. The
student is derived through:

`StudentMark -> CourseEnrollment -> StudentAcademicRecord -> Student`

This ensures marks belong to a specific attempt, including retakes.

The service must validate that the enrollment's allocation is the same
allocation as the assessment's allocation. A mark must not be recorded
for an enrollment in an unrelated offering.

### 7.4 StudentCourseResult

Represents the final result for one course enrollment/attempt.

Target fields:

-   `id`
-   `courseEnrollmentId`
-   `totalPercentage`
-   `grade`
-   `gradePoint`
-   `creditHours`
-   `status`
-   `calculatedAt`
-   `finalizedAt`
-   `finalizedBy`
-   timestamps

Recommended uniqueness:

``` prisma
@@unique([courseEnrollmentId])
```

The following fields can be derived and should normally be removed from
the target model:

-   `studentId`
-   `courseId`
-   `academicSessionId`
-   `isReappear`

The enrollment identifies the student and allocation; the allocation
identifies the course and academic session. Retake status is represented
by the allocation type and attempt history.

Keep `creditHours` as a result snapshot if transcripts must preserve the
credit-hour value used when the result was calculated, even if the
catalog course is changed later.

### 7.5 GradeScale

Represents the institution's percentage-to-grade and grade-point
mapping.

The existing model can remain. Ensure that grade-scale ranges do not
overlap and that the grading service handles boundary values
consistently.

------------------------------------------------------------------------

## 8. People models

### 8.1 Student

The `Student` model remains the permanent student profile.

Important relationships:

-   `User`
-   `Batch`
-   `StudentAcademicRecord[]`

`Student.batchId` remains the single source of truth for the student's
batch.

Direct `Student` relations to marks and course results become
unnecessary if those models are accessed through `CourseEnrollment`.
Remove those direct Prisma relations only after updating the relevant
service queries and API response projections.

### 8.2 Faculty

The existing `Faculty` model remains.

Important relationships:

-   `User`
-   `CourseAllocation[]`
-   Assessments created
-   Marks entered
-   Marks updated

No major structural change is required for the agreed architecture.

------------------------------------------------------------------------

## 9. Relationship overview

``` mermaid
erDiagram
    AcademicYear ||--o{ AcademicSession : contains
    AcademicYear ||--o{ Batch : entry_year
    Batch ||--o{ Student : contains
    Batch ||--o{ Section : has
    Batch ||--o{ BatchCourseAssignment : curriculum
    Semester ||--o{ BatchCourseAssignment : schedules
    Course ||--o{ BatchCourseAssignment : includes

    Student ||--o{ StudentAcademicRecord : history
    AcademicSession ||--o{ StudentAcademicRecord : records
    Section ||--o{ StudentAcademicRecord : places
    Semester ||--o{ StudentAcademicRecord : current_semester

    BatchCourseAssignment ||--o{ CourseAllocation : offered_as
    Section ||--o{ CourseAllocation : delivered_to
    Faculty ||--o{ CourseAllocation : teaches
    AcademicSession ||--o{ CourseAllocation : offered_in

    StudentAcademicRecord ||--o{ CourseEnrollment : enrolls
    CourseAllocation ||--o{ CourseEnrollment : contains

    CourseAllocation ||--o{ Assessment : assesses
    AssessmentCategory ||--o{ Assessment : categorizes
    CourseEnrollment ||--o{ StudentMark : receives
    Assessment ||--o{ StudentMark : records

    CourseEnrollment ||--o| StudentCourseResult : produces
```

------------------------------------------------------------------------

## 10. Important business invariants

The application and database must preserve the following rules:

1.  A student belongs to one fixed batch.
2.  A student's section is recorded per academic session and can change
    between sessions.
3.  A student's section must belong to the student's batch.
4.  A batch curriculum assignment references exactly one batch, course,
    and semester.
5.  The same course cannot be assigned twice to the same batch and
    semester.
6.  A course allocation references a batch curriculum assignment.
7.  The allocation's section must belong to the curriculum assignment's
    batch.
8.  For a given curriculum assignment, section, academic session, and
    allocation type, only one allocation may exist.
9.  Regular and retake allocations are distinct.
10. A regular enrollment must match the student's current
    academic-record section.
11. A retake enrollment may use a designated retake section within the
    student's batch.
12. A course enrollment must reference an actual allocation.
13. Each attempt has its own enrollment and result.
14. Previous failed attempts and their marks/results are preserved.
15. An assessment and its student mark must refer to the same course
    allocation through the enrollment.
16. Finalizing allocations must be idempotent and must not create
    duplicate enrollments.
17. Course results must be finalized according to the institution's
    grading and progression policies.

Some cross-model invariants cannot be expressed with ordinary Prisma
relation declarations alone. Enforce them in transactional service logic
and, where appropriate, with database constraints or triggers.

------------------------------------------------------------------------

## 11. Suggested Prisma schema organization

Keep the existing split-schema organization:

``` text
prisma/
├── schema.prisma
├── auth.prisma
├── people.prisma
├── academic.prisma
├── courses.prisma
├── assessment.prisma
├── migrations/
└── seed/
```

Suggested model ownership:

  -----------------------------------------------------------------------
  File                                Models
  ----------------------------------- -----------------------------------
  `auth.prisma`                       Role, Permission, RolePermission,
                                      User

  `people.prisma`                     Student, Faculty

  `academic.prisma`                   AcademicYear, AcademicSession,
                                      Batch, Section, Semester,
                                      StudentAcademicRecord

  `courses.prisma`                    Course, BatchCourseAssignment,
                                      CourseAllocation, CourseEnrollment,
                                      StudentCourseResult, GradeScale

  `assessment.prisma`                 AssessmentCategory, Assessment,
                                      StudentMark
  -----------------------------------------------------------------------

`SemesterCourse` is excluded from the target design.

------------------------------------------------------------------------

## 12. Suggested implementation sequence

Implement the architecture in small, reviewable steps.

### Phase 1 --- Inspect dependencies

Before changing models:

-   Search all backend services, controllers, DTOs, tests, and seed
    scripts for `SemesterCourse`.
-   Search for direct uses of `StudentAcademicRecord.batchId` and
    `semesterNumber`.
-   Search for `CourseAllocation.courseId` and `semesterNumber`.
-   Search for `CourseEnrollment.courseId` and nullable `allocationId`.
-   Search for direct `StudentMark.studentId` and `StudentCourseResult`
    fields.
-   Review frontend API consumers and response contracts.
-   Record the current database migration status and take a verified
    backup.

### Phase 2 --- Academic and curriculum normalization

-   Remove redundant academic-record fields after migrating dependent
    code.
-   Add `Semester` relation to `BatchCourseAssignment`.
-   Migrate `semesterNumber` values to matching `semesterId` values.
-   Remove the hardcoded semester range constraint.
-   Migrate dependencies from `SemesterCourse` to
    `BatchCourseAssignment`.
-   Remove `SemesterCourse` only after its data and code dependencies
    are resolved.

### Phase 3 --- Allocation redesign

-   Add `CourseAllocationType`.
-   Add `batchCourseAssignmentId`.
-   Backfill it by matching the existing batch, course, and semester.
-   Remove redundant `courseId` and `semesterNumber` after verification.
-   Add the new uniqueness constraint.
-   Validate section/batch consistency.

### Phase 4 --- Enrollment and retake redesign

-   Make `allocationId` required.
-   Backfill existing enrollments to their matching allocations.
-   Add and backfill `attemptNumber`.
-   Remove redundant `courseId`.
-   Implement regular enrollment generation after allocation
    finalization.
-   Implement retake eligibility and separate retake enrollment.
-   Ensure operations are transactional and idempotent.

### Phase 5 --- Assessment and result normalization

-   Add `courseEnrollmentId` to student marks and backfill it.
-   Validate that marks and assessments refer to the same allocation.
-   Remove direct `studentId` from marks after verification.
-   Ensure each enrollment has at most one final result.
-   Backfill result enrollment links and preserve historical credit-hour
    snapshots.
-   Remove redundant result fields only after all consumers are updated.

### Phase 6 --- API and regression testing

Test at least:

-   Creating a batch with a curriculum.
-   Adding configurable semesters.
-   Creating academic records for a session.
-   Moving a student to another section in a later session.
-   Allocating one regular course to multiple sections.
-   Preventing a second teacher allocation for the same unique
    allocation key.
-   Creating a separate retake allocation.
-   Finalizing allocations and generating enrollments.
-   Calling finalization more than once without duplicates.
-   Preventing enrollment in a regular allocation for a different
    section.
-   Enrolling an eligible failed student in a retake allocation.
-   Preserving the original failed attempt.
-   Recording marks independently for regular and retake attempts.
-   Calculating and finalizing separate results for each attempt.

------------------------------------------------------------------------

## 13. Database migration and data-safety rules

The production/remote database already contains data and an existing
migration history. Schema changes must be incremental and
data-preserving.

**Never use the following as a shortcut for this refactor:**

``` bash
npx prisma migrate reset
npx prisma db push
```

Do not recreate or overwrite existing migration files that have already
been applied.

For every schema change:

1.  Confirm the current Git branch and clean working tree.
2.  Confirm `prisma migrate status`.
3.  Take and verify a database backup.
4.  Inspect the current database schema and data.
5.  Write an explicit migration that adds/backfills/validates data
    before dropping old columns or constraints.
6.  Review generated SQL before applying it.
7.  Test the migration against a safe database copy.
8.  Verify row counts, foreign keys, unique constraints, and important
    application queries.
9.  Apply the migration through the agreed deployment process.
10. Regenerate Prisma Client and run build/tests.

A migration should not drop a column until its replacement has been
populated and verified. Preserve existing IDs wherever possible.

The two previously restored migrations dated `20261121000000` and
`20261121000001` are part of the existing migration history. They must
not be recreated or blindly reapplied.

------------------------------------------------------------------------

## 14. Decisions still requiring institutional policy

The structural architecture is agreed, but the following business
policies should be confirmed before implementing their detailed
services:

-   Whether a student can retake a course more than once.
-   Whether a student can take multiple retakes in the same academic
    session.
-   Whether retakes have a maximum attempt count or additional fee.
-   Whether passing a retake replaces the previous grade, preserves both
    grades, or uses a specific GPA policy.
-   Whether `AssessmentCategory.weightage` is global or configurable per
    course/session.
-   Whether one course can have multiple parallel retake groups in the
    same section and session.
-   The exact conditions under which a session's allocations are
    considered complete and eligible for finalization.

These policies should be explicit and testable. Do not silently encode
assumptions in database constraints.

------------------------------------------------------------------------

## 15. Final target architecture summary

The central relationship chain is:

``` text
Batch
  └── BatchCourseAssignment
        ├── Course
        ├── Semester
        └── CourseAllocation
              ├── Faculty
              ├── Section
              ├── AcademicSession
              ├── Assessment
              └── CourseEnrollment
                    ├── StudentAcademicRecord
                    │     ├── Student
                    │     ├── AcademicSession
                    │     ├── Section
                    │     └── Current Semester
                    ├── StudentMark
                    └── StudentCourseResult
```

**Core principle:** The batch curriculum defines what a batch should
study; course allocations define how and where a course is delivered;
course enrollments record which students take a particular offering and
attempt; assessments and results belong to that attempt.

This separation supports batch-specific curricula, section changes,
automatic enrollment, and dedicated retake offerings without mixing
academic history or overwriting previous results.
