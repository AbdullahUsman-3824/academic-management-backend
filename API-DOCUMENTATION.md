# Academic Management System - API Documentation

> **Last Updated**: October 18, 2026  
> **Version**: 1.0  
> **Base URL**: `http://localhost:3000/api`

This documentation covers all API endpoints developed after October 12, 2026, including courses management, faculty portal, allocations, enrollments, assessments, and academic progression features.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication](#authentication)
3. [Academic Management APIs](#academic-management-apis)
4. [Course Management APIs](#course-management-apis)
5. [Faculty APIs](#faculty-apis)
6. [Student APIs](#student-apis)
7. [Enrollment APIs](#enrollment-apis)
8. [Allocation APIs](#allocation-apis)
9. [Assessment APIs](#assessment-apis)
10. [Database Schema](#database-schema)
11. [Workflow & Business Logic](#workflow--business-logic)

---

## Architecture Overview

### Module Structure

```
src/modules/
├── academic/                    # Academic structure (years, sessions, batches, sections)
│   ├── controllers/
│   │   ├── academic.controller.ts
│   │   ├── academic-sessions.controller.ts
│   │   ├── academic-years.controller.ts
│   │   └── academic-batches.controller.ts
│   └── services/
│       ├── academic.service.ts
│       ├── academic-sessions.service.ts
│       ├── academic-progression.service.ts
│       ├── batch.service.ts
│       ├── section.service.ts
│       └── student-academic-record.service.ts
│
├── coursesManagement/           # All course-related operations
│   ├── courses/                 # Course catalog
│   ├── semester-courses/        # Course templates by semester
│   ├── batch-courses/          # Batch-specific course assignments
│   ├── allocations/            # Faculty-Course-Section assignments
│   └── enrollments/            # Student course enrollments
│
├── people/                      # People management
│   ├── faculty/                # Faculty members
│   └── students/               # Students
│
└── assessments/                 # Assessment & grading
    └── assessments/            # Assessment creation and marks entry
```

### Key Concepts

1. **Academic Structure Hierarchy**:
   ```
   AcademicYear → AcademicSession → Batch → Section → StudentAcademicRecord
   ```

2. **Course Assignment Flow**:
   ```
   Course (catalog) → SemesterCourse (template) → BatchCourseAssignment → Allocation (faculty) → Enrollment (student)
   ```

3. **Assessment Flow**:
   ```
   Allocation → Assessment → StudentMark → Results
   ```

---

## Authentication

All protected routes require JWT authentication via the `Authorization` header.

**Header Format**:
```
Authorization: Bearer <jwt_token>
```

### Login Endpoint

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "ADMIN" | "FACULTY" | "STUDENT"
    },
    "accessToken": "jwt_token_here"
  }
}
```

---

## Academic Management APIs

### 1. Academic Setup

Create the complete academic structure for a year.

```http
POST /api/academics/setup
Authorization: Bearer <token>
Content-Type: application/json

{
  "academicYearId": "uuid",
  "sessionData": {
    "name": "Fall 2026",
    "type": "FALL" | "SPRING",
    "startDate": "2026-09-01",
    "endDate": "2026-12-31"
  },
  "batches": [
    {
      "name": "Batch 2026",
      "programId": "uuid",
      "admissionYear": 2026,
      "graduationYear": 2031,
      "sections": [
        {
          "name": "Section A",
          "capacity": 60
        }
      ]
    }
  ]
}
```

### 2. Get Academic Overview

```http
GET /api/academics/overview
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "currentYear": { "id": "uuid", "name": "2026-2027", "status": "ACTIVE" },
    "currentSession": { "id": "uuid", "name": "Fall 2026", "status": "ACTIVE" },
    "batches": [
      {
        "id": "uuid",
        "name": "Batch 2026",
        "studentCount": 120,
        "sections": ["A", "B"]
      }
    ]
  }
}
```

### 3. Academic Sessions

#### List Sessions
```http
GET /api/academics/sessions?status=ACTIVE&academicYearId=uuid
```

#### Get Session Details
```http
GET /api/academics/sessions/:id
```

#### Update Session
```http
PATCH /api/academics/sessions/:id
Content-Type: application/json

{
  "startDate": "2026-09-01",
  "endDate": "2026-12-31"
}
```

#### Activate Session
```http
POST /api/academics/sessions/:id/activate
```

#### Complete Session
```http
POST /api/academics/sessions/:id/complete
```

### 4. Batches

#### List Batches
```http
GET /api/academics/batches?status=ACTIVE
```

#### Get Batch Details
```http
GET /api/academics/batches/:id
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Batch 2026",
    "program": { "id": "uuid", "name": "5-Year Integrated Law" },
    "admissionYear": 2026,
    "graduationYear": 2031,
    "sections": [
      { "id": "uuid", "name": "Section A", "capacity": 60, "studentCount": 58 }
    ]
  }
}
```

#### Update Batch
```http
PATCH /api/academics/batches/:id
Content-Type: application/json

{
  "status": "ACTIVE" | "COMPLETED" | "ARCHIVED"
}
```

---

## Course Management APIs

### 1. Course Catalog

#### Create Course
```http
POST /api/courses
Content-Type: application/json

{
  "code": "LAW101",
  "name": "Introduction to Law",
  "credits": 4,
  "type": "CORE" | "ELECTIVE" | "MANDATORY",
  "description": "Foundational law course",
  "status": "ACTIVE"
}
```

#### List Courses
```http
GET /api/courses?status=ACTIVE&type=CORE&search=law&page=1&limit=10
```

**Query Parameters**:
- `status`: ACTIVE | DRAFT | ARCHIVED
- `type`: CORE | ELECTIVE | MANDATORY
- `search`: Text search in code/name
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "LAW101",
      "name": "Introduction to Law",
      "credits": 4,
      "type": "CORE",
      "status": "ACTIVE"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

#### Get Course Details
```http
GET /api/courses/:id
```

#### Update Course
```http
PATCH /api/courses/:id
Content-Type: application/json

{
  "name": "Updated Course Name",
  "credits": 5
}
```

#### Update Course Status
```http
PATCH /api/courses/:id/status
Content-Type: application/json

{
  "status": "ARCHIVED"
}
```

#### Delete Course
```http
DELETE /api/courses/:id
```

### 2. Semester Courses (Templates)

Semester courses define which courses are offered in each semester across all batches.

#### Create Semester Course
```http
POST /api/semester-courses
Content-Type: application/json

{
  "semesterId": "uuid",
  "courseId": "uuid",
  "isElective": false
}
```

#### Bulk Create Semester Courses
```http
POST /api/semester-courses/bulk
Content-Type: application/json

{
  "semesterId": "uuid",
  "courses": [
    { "courseId": "uuid1", "isElective": false },
    { "courseId": "uuid2", "isElective": true }
  ]
}
```

#### Get Courses by Semester
```http
GET /api/semester-courses/semester/:semesterId
```

#### Get Courses by Semester Number
```http
GET /api/semester-courses/semester-number/:number
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "semester": { "id": "uuid", "name": "Semester 1", "number": 1 },
      "course": {
        "id": "uuid",
        "code": "LAW101",
        "name": "Introduction to Law",
        "credits": 4
      },
      "isElective": false
    }
  ]
}
```

#### Delete Semester Course
```http
DELETE /api/semester-courses/:id
```

### 3. Batch Course Assignments

Assign specific courses to a batch for a semester (can differ from template).

#### Assign Single Course
```http
POST /api/batch-course-assignments
Content-Type: application/json

{
  "batchId": "uuid",
  "courseId": "uuid",
  "semesterNumber": 1,
  "sectionId": "uuid",  // Optional: for section-specific courses
  "isElective": false
}
```

#### Bulk Assign Courses
```http
POST /api/batch-course-assignments/bulk
Content-Type: application/json

{
  "batchId": "uuid",
  "semesterNumber": 1,
  "sectionId": "uuid",  // Optional
  "courses": [
    { "courseId": "uuid1", "isElective": false },
    { "courseId": "uuid2", "isElective": true }
  ]
}
```

#### Copy from Template
Copy courses from semester template to a specific batch.

```http
POST /api/batch-course-assignments/copy-from-template
Content-Type: application/json

{
  "batchId": "uuid",
  "semesterNumber": 1,
  "sectionId": "uuid"  // Optional
}
```

**Response**:
```json
{
  "count": 8,
  "message": "Successfully copied 8 courses from template for Semester 1"
}
```

#### Preview Template Copy
```http
GET /api/batch-course-assignments/preview-template/:batchId?semesterNumber=1&sectionId=uuid
```

#### Get Batch Courses
```http
GET /api/batch-course-assignments?batchId=uuid&semesterNumber=1&sectionId=uuid
```

#### Get Single Assignment
```http
GET /api/batch-course-assignments/:id
```

#### Update Assignment
```http
PATCH /api/batch-course-assignments/:id
Content-Type: application/json

{
  "isElective": true
}
```

#### Remove Assignment
```http
DELETE /api/batch-course-assignments/:id
```

#### Remove All for Batch/Semester
```http
DELETE /api/batch-course-assignments?batchId=uuid&semesterNumber=1
```

---

## Allocation APIs

Allocations assign faculty to teach specific courses in specific sections.

### Create Allocation
```http
POST /api/allocations
Authorization: Bearer <token>
Content-Type: application/json

{
  "facultyId": "uuid",
  "courseId": "uuid",
  "sectionId": "uuid",
  "academicSessionId": "uuid",
  "semesterNumber": 1
}
```

### Bulk Create Allocations
```http
POST /api/allocations/bulk
Content-Type: application/json

{
  "academicSessionId": "uuid",
  "allocations": [
    {
      "facultyId": "uuid1",
      "courseId": "uuid1",
      "sectionId": "uuid1",
      "semesterNumber": 1
    },
    {
      "facultyId": "uuid2",
      "courseId": "uuid2",
      "sectionId": "uuid1",
      "semesterNumber": 1
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Bulk allocations processed",
  "data": {
    "created": 5,
    "failed": 0,
    "errors": []
  }
}
```

### List Allocations
```http
GET /api/allocations?facultyId=uuid&sectionId=uuid&academicSessionId=uuid&page=1&limit=10
```

**Query Parameters**:
- `facultyId`: Filter by faculty
- `sectionId`: Filter by section
- `academicSessionId`: Filter by session
- `semesterNumber`: Filter by semester
- `courseId`: Filter by course
- `page`, `limit`: Pagination

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "faculty": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "employeeId": "FAC001"
      },
      "course": {
        "id": "uuid",
        "code": "LAW101",
        "name": "Introduction to Law",
        "credits": 4
      },
      "section": {
        "id": "uuid",
        "name": "Section A",
        "batch": { "name": "Batch 2026" }
      },
      "academicSession": {
        "id": "uuid",
        "name": "Fall 2026"
      },
      "semesterNumber": 1
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

### Get Allocation Details
```http
GET /api/allocations/:id
```

### Get Allocated Courses for Section/Semester
```http
GET /api/allocations/assigned-courses/:batchId/:semesterNumber?sectionId=uuid
```

This returns courses with their faculty assignments.

### Get Allocations by Section and Semester
```http
GET /api/allocations/section/:sectionId/semester/:semesterNumber
```

### Delete Allocation
```http
DELETE /api/allocations/:id
```

---

## Enrollment APIs

Enrollments link students to courses via allocations.

### Create Enrollment
```http
POST /api/enrollments
Authorization: Bearer <token>
Content-Type: application/json

{
  "studentAcademicRecordId": "uuid",
  "allocationId": "uuid"
}
```

### Bulk Enroll Students
```http
POST /api/enrollments/bulk
Content-Type: application/json

{
  "studentAcademicRecordIds": ["uuid1", "uuid2", "uuid3"],
  "allocationId": "uuid"
}
```

### Bulk Re-Enroll (Auto-enrollment for next semester)
```http
POST /api/enrollments/bulk-re-enroll
Content-Type: application/json

{
  "batchId": "uuid",           // Optional: specific batch
  "academicSessionId": "uuid", // Optional: specific session
  "dryRun": false              // true for preview
}
```

**Response**:
```json
{
  "success": true,
  "message": "Bulk re-enrollment completed",
  "data": {
    "processed": 120,
    "enrolled": 115,
    "skipped": 5,
    "errors": []
  }
}
```

### List Enrollments
```http
GET /api/enrollments?studentId=uuid&allocationId=uuid&status=ENROLLED&page=1&limit=10
```

**Query Parameters**:
- `studentId`: Filter by student
- `allocationId`: Filter by allocation
- `studentAcademicRecordId`: Filter by academic record
- `status`: ENROLLED | DROPPED | COMPLETED
- `page`, `limit`: Pagination

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "ENROLLED",
      "enrolledAt": "2026-10-15T10:00:00Z",
      "allocation": {
        "id": "uuid",
        "course": {
          "code": "LAW101",
          "name": "Introduction to Law",
          "credits": 4
        },
        "faculty": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "section": {
          "name": "Section A"
        }
      },
      "studentAcademicRecord": {
        "student": {
          "firstName": "Jane",
          "lastName": "Smith",
          "rollNumber": "2026001"
        }
      }
    }
  ],
  "pagination": {
    "total": 8,
    "page": 1,
    "limit": 10
  }
}
```

### Get Enrollment Details
```http
GET /api/enrollments/:id
```

### Get Student Enrollments
```http
GET /api/enrollments/student/:studentId?academicSessionId=uuid
```

### Get Available Allocations for Course
```http
GET /api/enrollments/available-allocations/:courseId
```

Returns allocations where students can still enroll.

### Get Enrollment Stats
```http
GET /api/enrollments/stats/:studentAcademicRecordId
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalEnrolled": 8,
    "totalCredits": 32,
    "byStatus": {
      "ENROLLED": 8,
      "DROPPED": 0,
      "COMPLETED": 0
    }
  }
}
```

### Update Enrollment Status
```http
PATCH /api/enrollments/:id/status
Content-Type: application/json

{
  "status": "DROPPED" | "COMPLETED"
}
```

### Drop Enrollment
```http
PATCH /api/enrollments/:id/drop
```

### Delete Enrollment
```http
DELETE /api/enrollments/:id
```

---

## Faculty APIs

### Get My Profile (Faculty)
```http
GET /api/faculty/me
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employeeId": "FAC001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@college.edu",
    "phone": "+1234567890",
    "department": "Law",
    "designation": "Assistant Professor",
    "qualification": "PhD in Law",
    "status": "ACTIVE"
  }
}
```

### Get My Teaching Load
```http
GET /api/faculty/me/teaching-load?academicSessionId=uuid
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "facultyId": "uuid",
    "academicSession": { "id": "uuid", "name": "Fall 2026" },
    "allocations": [
      {
        "id": "uuid",
        "course": { "code": "LAW101", "name": "Introduction to Law", "credits": 4 },
        "section": { "name": "Section A", "batch": { "name": "Batch 2026" } },
        "semesterNumber": 1,
        "enrolledStudents": 58
      }
    ],
    "summary": {
      "totalCourses": 3,
      "totalSections": 3,
      "totalCredits": 12,
      "totalStudents": 174
    }
  }
}
```

### Get My Allocation Details
```http
GET /api/faculty/me/allocations/:allocationId
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "course": {
      "code": "LAW101",
      "name": "Introduction to Law",
      "credits": 4,
      "description": "..."
    },
    "section": {
      "name": "Section A",
      "batch": { "name": "Batch 2026" }
    },
    "semesterNumber": 1,
    "enrolledCount": 58,
    "assessments": [
      {
        "id": "uuid",
        "name": "Mid-term Exam",
        "category": { "name": "Mid-term", "weightage": 30 },
        "maxMarks": 100,
        "submittedAt": "2026-11-15T10:00:00Z"
      }
    ]
  }
}
```

### Get Students in My Allocation
```http
GET /api/faculty/me/allocations/:allocationId/students
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "rollNumber": "2026001",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@student.edu",
      "enrollment": {
        "id": "uuid",
        "status": "ENROLLED",
        "enrolledAt": "2026-10-15T10:00:00Z"
      }
    }
  ]
}
```

### Create Faculty (Admin)
```http
POST /api/faculty
Authorization: Bearer <token>
Content-Type: application/json

{
  "employeeId": "FAC001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@college.edu",
  "phone": "+1234567890",
  "department": "Law",
  "designation": "Assistant Professor",
  "qualification": "PhD in Law",
  "userId": "uuid"  // Link to user account
}
```

### List Faculty
```http
GET /api/faculty?status=ACTIVE&department=Law&search=john&page=1&limit=10
```

### Get Faculty Details
```http
GET /api/faculty/:id
```

### Update Faculty
```http
PATCH /api/faculty/:id
Content-Type: application/json

{
  "phone": "+9876543210",
  "designation": "Associate Professor"
}
```

### Update Faculty Status
```http
PATCH /api/faculty/:id/status
Content-Type: application/json

{
  "status": "ON_LEAVE" | "ACTIVE" | "INACTIVE"
}
```

### Delete Faculty
```http
DELETE /api/faculty/:id
```

---

## Student APIs

### Create Student
```http
POST /api/students
Content-Type: application/json

{
  "rollNumber": "2026001",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@student.edu",
  "phone": "+1234567890",
  "dateOfBirth": "2005-05-15",
  "gender": "FEMALE",
  "batchId": "uuid",
  "sectionId": "uuid",
  "userId": "uuid"  // Optional: link to user account
}
```

### List Students
```http
GET /api/students?batchId=uuid&sectionId=uuid&status=ACTIVE&search=jane&page=1&limit=10
```

**Query Parameters**:
- `batchId`: Filter by batch
- `sectionId`: Filter by section
- `status`: ACTIVE | GRADUATED | DROPPED | SUSPENDED
- `search`: Search in name, roll number, email
- `page`, `limit`: Pagination

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "rollNumber": "2026001",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@student.edu",
      "batch": {
        "id": "uuid",
        "name": "Batch 2026",
        "program": { "name": "5-Year Integrated Law" }
      },
      "section": {
        "id": "uuid",
        "name": "Section A"
      },
      "status": "ACTIVE",
      "currentSemester": 1
    }
  ],
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 10,
    "totalPages": 12
  }
}
```

### Get Student Details
```http
GET /api/students/:id
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "rollNumber": "2026001",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@student.edu",
    "phone": "+1234567890",
    "dateOfBirth": "2005-05-15",
    "gender": "FEMALE",
    "status": "ACTIVE",
    "batch": {
      "id": "uuid",
      "name": "Batch 2026",
      "program": { "name": "5-Year Integrated Law" }
    },
    "section": {
      "id": "uuid",
      "name": "Section A"
    },
    "academicRecords": [
      {
        "id": "uuid",
        "semesterNumber": 1,
        "academicSession": { "name": "Fall 2026" },
        "enrollmentCount": 8,
        "totalCredits": 32
      }
    ],
    "currentAcademicRecord": {
      "id": "uuid",
      "semesterNumber": 1,
      "status": "ACTIVE"
    }
  }
}
```

### Update Student
```http
PATCH /api/students/:id
Content-Type: application/json

{
  "phone": "+9876543210",
  "email": "newemail@student.edu"
}
```

### Update Student Status
```http
PATCH /api/students/:id/status
Content-Type: application/json

{
  "status": "SUSPENDED" | "DROPPED" | "GRADUATED"
}
```

### Bulk Student Enrollment
```http
POST /api/students/bulk
Content-Type: multipart/form-data

file: <excel_file>
dryRun: true  // Optional: preview without saving
```

**Excel Format** (columns):
- rollNumber
- firstName
- lastName
- email
- phone
- dateOfBirth (YYYY-MM-DD)
- gender (MALE/FEMALE/OTHER)
- batchId
- sectionId

**Response**:
```json
{
  "success": true,
  "message": "Bulk enrollment completed",
  "data": {
    "processed": 60,
    "created": 58,
    "failed": 2,
    "errors": [
      { "row": 15, "error": "Duplicate roll number" },
      { "row": 32, "error": "Invalid email format" }
    ]
  }
}
```

### Download Bulk Template
```http
GET /api/students/bulk/template
```

Returns an Excel template file.

---

## Assessment APIs

### Get Assessment Categories
```http
GET /api/faculty/assessments/categories
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Assignment",
      "description": "Regular assignments",
      "weightage": 10,
      "isActive": true
    },
    {
      "id": "uuid",
      "name": "Mid-term",
      "description": "Mid-semester examination",
      "weightage": 30,
      "isActive": true
    },
    {
      "id": "uuid",
      "name": "End-term",
      "description": "End-semester examination",
      "weightage": 60,
      "isActive": true
    }
  ]
}
```

### Get Assessments by Allocation
```http
GET /api/faculty/assessments/allocation/:allocationId
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Mid-term Exam",
      "category": {
        "id": "uuid",
        "name": "Mid-term",
        "weightage": 30
      },
      "maxMarks": 100,
      "scheduledDate": "2026-11-15",
      "isSubmitted": true,
      "submittedAt": "2026-11-20T10:00:00Z",
      "marksEntered": 58,
      "totalStudents": 58
    }
  ]
}
```

### Create Assessment
```http
POST /api/faculty/assessments
Authorization: Bearer <token>
Content-Type: application/json

{
  "allocationId": "uuid",
  "categoryId": "uuid",
  "name": "Mid-term Exam",
  "maxMarks": 100,
  "scheduledDate": "2026-11-15",
  "description": "Mid-semester examination"
}
```

### Update Assessment
```http
PUT /api/faculty/assessments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Assessment Name",
  "scheduledDate": "2026-11-20"
}
```

### Delete Assessment
```http
DELETE /api/faculty/assessments/:id
Authorization: Bearer <token>
```

### Get Assessment Details with Marks
```http
GET /api/faculty/assessments/:id/details
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Mid-term Exam",
    "maxMarks": 100,
    "category": { "name": "Mid-term", "weightage": 30 },
    "allocation": {
      "course": { "code": "LAW101", "name": "Introduction to Law" },
      "section": { "name": "Section A" }
    },
    "isSubmitted": false,
    "studentMarks": [
      {
        "studentId": "uuid",
        "rollNumber": "2026001",
        "firstName": "Jane",
        "lastName": "Smith",
        "marksObtained": 85,
        "isAbsent": false,
        "remarks": null
      }
    ],
    "stats": {
      "totalStudents": 58,
      "marksEntered": 58,
      "average": 78.5,
      "highest": 95,
      "lowest": 45
    }
  }
}
```

### Bulk Mark Entry
```http
POST /api/faculty/assessments/marks/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "assessmentId": "uuid",
  "marks": [
    {
      "studentId": "uuid",
      "marksObtained": 85,
      "isAbsent": false,
      "remarks": null
    },
    {
      "studentId": "uuid2",
      "marksObtained": 0,
      "isAbsent": true,
      "remarks": "Medical leave"
    }
  ]
}
```

### Update Single Student Mark
```http
PUT /api/faculty/assessments/:assessmentId/marks/:studentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "marksObtained": 90,
  "isAbsent": false,
  "remarks": "Improvement noted"
}
```

### Submit Assessment (Lock it)
```http
POST /api/faculty/assessments/:id/submit
Authorization: Bearer <token>
```

Once submitted, marks cannot be edited without admin approval.

---

## Database Schema

### Core Academic Tables

```prisma
// Academic Year → Session → Batch → Section → Student
model AcademicYear {
  id            String    @id @default(uuid())
  name          String    @unique
  startDate     DateTime
  endDate       DateTime
  status        AcademicYearStatus
  sessions      AcademicSession[]
}

model AcademicSession {
  id              String    @id @default(uuid())
  name            String
  type            SessionType  // FALL, SPRING
  academicYearId  String
  startDate       DateTime
  endDate         DateTime
  status          AcademicSessionStatus
  
  academicYear    AcademicYear  @relation(...)
  allocations     Allocation[]
  records         StudentAcademicRecord[]
}

model Batch {
  id              String    @id @default(uuid())
  name            String
  programId       String
  admissionYear   Int
  graduationYear  Int
  status          BatchStatus
  
  program         Program
  sections        Section[]
  batchCourses    BatchCourseAssignment[]
}

model Section {
  id        String    @id @default(uuid())
  name      String
  batchId   String
  capacity  Int
  
  batch       Batch
  allocations Allocation[]
  students    Student[]
  records     StudentAcademicRecord[]
}

model StudentAcademicRecord {
  id                  String    @id @default(uuid())
  studentId           String
  sectionId           String
  academicSessionId   String
  semesterNumber      Int
  status              RecordStatus
  
  student            Student
  section            Section
  academicSession    AcademicSession
  enrollments        Enrollment[]
}
```

### Course Management Tables

```prisma
model Course {
  id          String    @id @default(uuid())
  code        String    @unique
  name        String
  credits     Int
  type        CourseType  // CORE, ELECTIVE, MANDATORY
  description String?
  status      CourseStatus
  
  semesterCourses    SemesterCourse[]
  batchCourses       BatchCourseAssignment[]
  allocations        Allocation[]
}

model SemesterCourse {
  id          String    @id @default(uuid())
  semesterId  String
  courseId    String
  isElective  Boolean   @default(false)
  
  semester    Semester
  course      Course
}

model BatchCourseAssignment {
  id              String    @id @default(uuid())
  batchId         String
  courseId        String
  semesterNumber  Int
  sectionId       String?   // Optional: section-specific
  isElective      Boolean   @default(false)
  
  batch       Batch
  course      Course
  section     Section?
}

model Allocation {
  id                  String    @id @default(uuid())
  facultyId           String
  courseId            String
  sectionId           String
  academicSessionId   String
  semesterNumber      Int
  
  faculty           Faculty
  course            Course
  section           Section
  academicSession   AcademicSession
  enrollments       Enrollment[]
  assessments       Assessment[]
}

model Enrollment {
  id                        String    @id @default(uuid())
  studentAcademicRecordId   String
  allocationId              String
  status                    EnrollmentStatus
  enrolledAt                DateTime  @default(now())
  
  studentAcademicRecord   StudentAcademicRecord
  allocation              Allocation
}
```

### Assessment Tables

```prisma
model AssessmentCategory {
  id          String    @id @default(uuid())
  name        String
  description String?
  weightage   Decimal
  isActive    Boolean   @default(true)
  
  assessments Assessment[]
}

model Assessment {
  id            String    @id @default(uuid())
  allocationId  String
  categoryId    String
  name          String
  maxMarks      Decimal
  scheduledDate DateTime?
  description   String?
  isSubmitted   Boolean   @default(false)
  submittedAt   DateTime?
  
  allocation    Allocation
  category      AssessmentCategory
  studentMarks  StudentMark[]
}

model StudentMark {
  id             String    @id @default(uuid())
  assessmentId   String
  studentId      String
  marksObtained  Decimal?
  isAbsent       Boolean   @default(false)
  remarks        String?
  
  assessment    Assessment
  student       Student
}
```

---

## Workflow & Business Logic

### 1. Academic Setup Workflow

```
1. Create Academic Year (e.g., "2026-2027")
2. Create Academic Session (e.g., "Fall 2026")
3. Create Batches (e.g., "Batch 2026")
4. Create Sections within each Batch (e.g., "Section A")
5. Enroll Students into Sections
6. System auto-creates StudentAcademicRecord for each student
```

### 2. Course Assignment Workflow

```
Option A: Use Template
1. Define SemesterCourses (template for all batches)
2. Copy template to BatchCourseAssignment for specific batch
3. Allocate faculty to each course-section combination
4. Auto-enroll eligible students

Option B: Custom Assignment
1. Directly create BatchCourseAssignment for specific batch
2. Allocate faculty
3. Enroll students
```

### 3. Faculty Teaching Workflow

```
1. Faculty logs in → Views teaching load
2. Selects a course allocation
3. Views enrolled students
4. Creates assessments (assignments, exams, etc.)
5. Enters marks for each assessment
6. Submits assessment (locks marks)
7. System calculates final grades based on category weightages
```

### 4. Student Enrollment Workflow

```
Automatic (Recommended):
1. Student progresses to new semester
2. System runs bulk-re-enroll
3. Finds student's current semester and section
4. Auto-enrolls in all allocated courses for that section

Manual:
1. Admin selects students
2. Admin selects allocation (faculty-course-section)
3. System creates enrollments
```

### 5. Academic Progression

```
1. Session ends → Admin completes session
2. System marks all enrollments as COMPLETED
3. System promotes eligible students to next semester
4. New session starts → System activates it
5. Bulk re-enrollment runs for promoted students
```

### 6. Assessment & Grading Workflow

```
1. Faculty creates assessment with category (weightage defined)
2. Faculty enters marks for all students
3. Faculty submits assessment (locks it)
4. System calculates:
   - Category-wise scores (e.g., Assignment: 10%, Mid-term: 30%)
   - Total marks = Σ(category_marks × weightage)
5. System determines letter grade based on total
6. Results published to students
```

### 7. Data Relationships

```
Student → Section → Batch → Program
Student → StudentAcademicRecord (one per semester)
StudentAcademicRecord → Enrollment (multiple, one per course)
Enrollment → Allocation (faculty-course-section assignment)
Allocation → Assessment (created by faculty)
Assessment → StudentMark (marks for each student)
```

---

## Common Use Cases

### Use Case 1: Setup New Academic Year

```bash
# 1. Create Academic Year
POST /api/academics/years
{ "name": "2026-2027", "startDate": "2026-09-01", "endDate": "2027-06-30" }

# 2. Setup Fall Session with batches
POST /api/academics/setup
{
  "academicYearId": "<year_id>",
  "sessionData": { "name": "Fall 2026", "type": "FALL", ... },
  "batches": [...]
}
```

### Use Case 2: Assign Courses to New Batch

```bash
# 1. Copy from template
POST /api/batch-course-assignments/copy-from-template
{ "batchId": "<batch_id>", "semesterNumber": 1 }

# 2. Allocate faculty
POST /api/allocations/bulk
{
  "academicSessionId": "<session_id>",
  "allocations": [
    { "facultyId": "...", "courseId": "...", "sectionId": "...", "semesterNumber": 1 }
  ]
}

# 3. Auto-enroll students
POST /api/enrollments/bulk-re-enroll
{ "batchId": "<batch_id>", "academicSessionId": "<session_id>" }
```

### Use Case 3: Faculty Enters Marks

```bash
# 1. Create assessment
POST /api/faculty/assessments
{ "allocationId": "...", "categoryId": "...", "name": "Mid-term", "maxMarks": 100 }

# 2. Enter marks
POST /api/faculty/assessments/marks/bulk
{
  "assessmentId": "...",
  "marks": [
    { "studentId": "...", "marksObtained": 85 },
    ...
  ]
}

# 3. Submit
POST /api/faculty/assessments/<id>/submit
```

---

## Error Handling

All APIs return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Course not found",
    "details": {}
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Invalid or missing token
- `FORBIDDEN`: User doesn't have permission
- `RESOURCE_NOT_FOUND`: Entity not found
- `VALIDATION_ERROR`: Invalid input data
- `CONFLICT`: Duplicate entry or business rule violation
- `INTERNAL_SERVER_ERROR`: Server error

---

## Best Practices

1. **Always use batch operations** when dealing with multiple entities (bulk enroll, bulk allocate)
2. **Use templates** (SemesterCourses) for consistent course structures across batches
3. **Auto-enroll students** using bulk-re-enroll instead of manual enrollments
4. **Lock assessments** by submitting them after final marks entry
5. **Filter allocations** by academicSessionId to avoid loading historical data
6. **Paginate large lists** (students, enrollments) to improve performance
7. **Use preview/dry-run** flags for bulk operations to validate before committing

---

## Development Notes

### Recent Changes (After Oct 12, 2026)

1. **Oct 16**: Added course allocation APIs and batch course assignments
2. **Oct 17**: Refactored student listing with improved data structure
3. **Oct 18**: 
   - Fixed enrollment allocation relationship
   - Added faculty portal endpoints
   - Improved student listing for teachers
   - Added assessment APIs for mark entry

### Pending Features

- [ ] Grade calculation and transcript generation
- [ ] Attendance tracking
- [ ] Student portal APIs
- [ ] Permission-based access control (guards in place, but not active)
- [ ] Notification system for assessment deadlines
- [ ] Report generation (PDF transcripts, grade sheets)

---

## Contact & Support

For questions about these APIs, contact the development team.

**Last Updated**: October 18, 2026
