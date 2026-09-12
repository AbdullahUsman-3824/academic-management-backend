# Student Enrollment and Management API

## Overview

This document defines the complete set of APIs for student enrollment and management.

### Endpoints

| Method | Endpoint                      | Purpose                               |
| ------ | ----------------------------- | ------------------------------------- |
| POST   | `/api/students`               | Enroll a single student + create User |
| GET    | `/api/students`               | List / search / filter students       |
| GET    | `/api/students/:id`           | Get complete student profile          |
| PATCH  | `/api/students/:id`           | Update student profile (partial)      |
| PATCH  | `/api/students/:id/status`    | Change student status only            |
| POST   | `/api/students/bulk`          | Bulk enroll students from Excel       |
| GET    | `/api/students/bulk/template` | Download sample Excel template        |

---

## Core Rules

- **Username** is always equal to `stdRegNumber`. Students log in with registration number + password.
- **Password** is never sent by the client. The system uses a single default student password configured once by the admin in system settings.
- Password is **never** returned in any response.
- `User` + `Student` creation must always happen in a **single database transaction**.
- Role `student` is resolved by the backend. Client never sends `roleId`.

---

## 1. Enroll Student

### `POST /api/students`

Creates a new student and its associated user account in a single database transaction.

### What this API does

1. Validates the provided student information.
2. Validates that the selected batch exists.
3. Validates uniqueness of:
   - `stdRegNumber` (also used as username)
   - `cnic` (if provided)
4. Creates a `User` record with:
   - `username` = `stdRegNumber`
   - password = system-configured default student password
   - role = `student`
5. Creates the `Student` record linked to that user.
6. Assigns the selected batch.
7. Returns the created student information.

### What this API does NOT do

```text
StudentAcademicRecord ❌
CourseEnrollment ❌
Academic Session ❌
Semester Assignment ❌
Section Assignment ❌
```

These will be handled later after Course Management is implemented.

### Request

```http
POST /api/students
Content-Type: application/json
```

```json
{
  "batchId": "8b4f2c31-7c51-4a0d-9e21-123456789abc",
  "stdRegNumber": "SP26-CS-001",

  "firstName": "Ali",
  "middleName": "Ahmed",
  "lastName": "Khan",

  "email": "ali.khan@example.com",
  "dateOfBirth": "2007-04-15",
  "gender": "male",
  "cnic": "35202-1234567-1",

  "profileImageUrl": "https://example.com/profile.jpg",

  "phone": "03001234567",
  "address": "House 12, Street 5",
  "city": "Lahore",

  "guardianName": "Muhammad Khan",
  "guardianRelation": "Father",
  "guardianPhone": "03009876543",
  "guardianCnic": "35202-7654321-9",

  "admissionDate": "2026-09-12"
}
```

### Required Fields

```text
batchId
stdRegNumber
firstName
```

### Optional Fields

```text
middleName
lastName
email
dateOfBirth
gender
cnic
profileImageUrl
phone
address
city
guardianName
guardianRelation
guardianPhone
guardianCnic
admissionDate          // defaults to current date if omitted
```

### Gender Allowed Values

```text
male
female
other
```

### Success Response

**HTTP 201 Created**

```json
{
  "success": true,
  "message": "Student enrolled successfully",
  "data": {
    "id": "c5b8c6a1-2c41-4f3a-8d7b-123456789abc",
    "userId": "a91e4e3f-6b2d-4c19-8f12-987654321abc",
    "username": "SP26-CS-001",

    "batch": {
      "id": "8b4f2c31-7c51-4a0d-9e21-123456789abc",
      "name": "SP26"
    },

    "stdRegNumber": "SP26-CS-001",

    "firstName": "Ali",
    "middleName": "Ahmed",
    "lastName": "Khan",

    "email": "ali.khan@example.com",
    "dateOfBirth": "2007-04-15",
    "gender": "male",
    "cnic": "35202-1234567-1",

    "profileImageUrl": "https://example.com/profile.jpg",

    "phone": "03001234567",
    "address": "House 12, Street 5",
    "city": "Lahore",

    "guardianName": "Muhammad Khan",
    "guardianRelation": "Father",
    "guardianPhone": "03009876543",
    "guardianCnic": "35202-7654321-9",

    "admissionDate": "2026-09-12",
    "status": "active",

    "createdAt": "2026-09-12T06:30:00.000Z",
    "updatedAt": "2026-09-12T06:30:00.000Z"
  }
}
```

> **Important:** Never return `password` or `passwordHash`.

---

## 2. Get Students

### `GET /api/students`

Returns a paginated list of students optimized for admin tables.

### Query Parameters

| Parameter | Required | Default | Description                                                 |
| --------- | -------- | ------- | ----------------------------------------------------------- |
| `page`    | No       | `1`     | Page number                                                 |
| `limit`   | No       | `20`    | Records per page                                            |
| `search`  | No       | –       | Search by name, registration number, username, phone, email |
| `status`  | No       | –       | `active` \| `inactive` \| `graduated`                       |
| `batchId` | No       | –       | Filter by batch                                             |

### Example

```http
GET /api/students?page=1&limit=20&search=ali&status=active&batchId=8b4f2c31-7c51-4a0d-9e21-123456789abc
```

### Success Response

**HTTP 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": "c5b8c6a1-2c41-4f3a-8d7b-123456789abc",
      "userId": "a91e4e3f-6b2d-4c19-8f12-987654321abc",
      "username": "SP26-CS-001",

      "stdRegNumber": "SP26-CS-001",

      "firstName": "Ali",
      "middleName": "Ahmed",
      "lastName": "Khan",

      "email": "ali.khan@example.com",
      "phone": "03001234567",
      "gender": "male",

      "batch": {
        "id": "8b4f2c31-7c51-4a0d-9e21-123456789abc",
        "name": "SP26"
      },

      "status": "active",
      "admissionDate": "2026-09-12"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

> Listing deliberately omits heavy fields (full address, guardian CNIC, profile image, etc.). Those belong in the detail endpoint.

---

## 3. Get Student by ID

### `GET /api/students/:id`

Returns the complete profile of one student.

### Path Parameter

```text
id → Student UUID
```

### Example

```http
GET /api/students/c5b8c6a1-2c41-4f3a-8d7b-123456789abc
```

### Success Response

**HTTP 200 OK**

```json
{
  "success": true,
  "data": {
    "id": "c5b8c6a1-2c41-4f3a-8d7b-123456789abc",
    "userId": "a91e4e3f-6b2d-4c19-8f12-987654321abc",
    "username": "SP26-CS-001",

    "batch": {
      "id": "8b4f2c31-7c51-4a0d-9e21-123456789abc",
      "name": "SP26"
    },

    "stdRegNumber": "SP26-CS-001",

    "firstName": "Ali",
    "middleName": "Ahmed",
    "lastName": "Khan",

    "email": "ali.khan@example.com",
    "dateOfBirth": "2007-04-15",
    "gender": "male",
    "cnic": "35202-1234567-1",

    "profileImageUrl": "https://example.com/profile.jpg",

    "phone": "03001234567",
    "address": "House 12, Street 5",
    "city": "Lahore",

    "guardianName": "Muhammad Khan",
    "guardianRelation": "Father",
    "guardianPhone": "03009876543",
    "guardianCnic": "35202-7654321-9",

    "admissionDate": "2026-09-12",
    "status": "active",

    "createdAt": "2026-09-12T06:30:00.000Z",
    "updatedAt": "2026-09-12T06:30:00.000Z"
  }
}
```

---

## 4. Update Student

### `PATCH /api/students/:id`

Partial update of student profile information.

### Example

```http
PATCH /api/students/c5b8c6a1-2c41-4f3a-8d7b-123456789abc
Content-Type: application/json
```

```json
{
  "firstName": "Ali",
  "lastName": "Khan",
  "phone": "03111234567",
  "address": "House 25, Street 8",
  "city": "Lahore",
  "guardianPhone": "03119876543"
}
```

### Fields that can be updated

```text
firstName
middleName
lastName
email
dateOfBirth
gender
cnic
profileImageUrl
phone
address
city
guardianName
guardianRelation
guardianPhone
guardianCnic
admissionDate
batchId                  // allowed only for enrollment correction
```

### Fields that must NOT be updated here

```text
id
userId
stdRegNumber             // immutable after enrollment
status                   // use dedicated status endpoint
username
password
```

> Changing `batchId` is only for correcting a wrong batch assignment at enrollment time. It is **not** academic progression.

### Success Response

**HTTP 200 OK**

```json
{
  "success": true,
  "message": "Student updated successfully",
  "data": {
    "id": "c5b8c6a1-2c41-4f3a-8d7b-123456789abc",
    "userId": "a91e4e3f-6b2d-4c19-8f12-987654321abc",
    "username": "SP26-CS-001",

    "batch": {
      "id": "8b4f2c31-7c51-4a0d-9e21-123456789abc",
      "name": "SP26"
    },

    "stdRegNumber": "SP26-CS-001",

    "firstName": "Ali",
    "middleName": "Ahmed",
    "lastName": "Khan",

    "email": "ali.khan@example.com",
    "phone": "03111234567",
    "address": "House 25, Street 8",
    "city": "Lahore",

    "status": "active",

    "updatedAt": "2026-09-12T07:00:00.000Z"
  }
}
```

---

## 5. Update Student Status

### `PATCH /api/students/:id/status`

Changes only the student’s status. Kept separate from the general update endpoint.

### Allowed Statuses

```text
active
inactive
graduated
```

### Request

```http
PATCH /api/students/c5b8c6a1-2c41-4f3a-8d7b-123456789abc/status
Content-Type: application/json
```

```json
{
  "status": "inactive"
}
```

### Success Response

**HTTP 200 OK**

```json
{
  "success": true,
  "message": "Student status updated successfully",
  "data": {
    "id": "c5b8c6a1-2c41-4f3a-8d7b-123456789abc",
    "status": "inactive",
    "updatedAt": "2026-09-12T07:10:00.000Z"
  }
}
```

### Status Meanings

| Status      | Meaning                                                                       |
| ----------- | ----------------------------------------------------------------------------- |
| `active`    | Currently enrolled and active in the system                                   |
| `inactive`  | No longer studying (withdrawn, suspended, left, etc.)                         |
| `graduated` | Program completed. (Later this should be driven by academic results workflow) |

---

## 6. Bulk Enrollment from Excel

### `POST /api/students/bulk`

Uploads an Excel file (`.xlsx`) and enrolls multiple students.

### Request

```http
POST /api/students/bulk
Content-Type: multipart/form-data
```

Form field:

```text
file → students.xlsx
```

### Optional Query Parameter

| Parameter | Description                                        |
| --------- | -------------------------------------------------- |
| `dryRun`  | `true` → only validate, do not create any students |

### Excel Column Format

| Column Name        | Required | Notes / Example                 |
| ------------------ | -------- | ------------------------------- |
| `stdRegNumber`     | Yes      | SP26-CS-001                     |
| `firstName`        | Yes      | Ali                             |
| `batchName`        | Yes*     | SP26 (preferred over batchId)   |
| `batchId`          | Yes*     | UUID (alternative to batchName) |
| `middleName`       | No       | Ahmed                           |
| `lastName`         | No       | Khan                            |
| `email`            | No       | ali.khan@example.com            |
| `dateOfBirth`      | No       | 2007-04-15 (YYYY-MM-DD)         |
| `gender`           | No       | male / female / other           |
| `cnic`             | No       | 35202-1234567-1                 |
| `phone`            | No       | 03001234567                     |
| `address`          | No       | House 12, Street 5              |
| `city`             | No       | Lahore                          |
| `guardianName`     | No       | Muhammad Khan                   |
| `guardianRelation` | No       | Father                          |
| `guardianPhone`    | No       | 03009876543                     |
| `guardianCnic`     | No       | 35202-7654321-9                 |
| `admissionDate`    | No       | 2026-09-12 (defaults to today)  |

> *Either `batchName` or `batchId` must be provided. `batchName` is recommended for better usability.

### Processing Rules

- Only `.xlsx` files are accepted.
- Maximum recommended rows: 300–500.
- Maximum file size: 5 MB.
- Empty rows are ignored.
- Each valid student is created in its own transaction (partial success is allowed).
- Duplicate `stdRegNumber` or `cnic` → row is skipped and reported as error.
- Same default password is used for all students.
- Username is always set to `stdRegNumber`.

### Success Response

**HTTP 200 OK** (or 207 Multi-Status)

```json
{
  "success": true,
  "message": "Bulk enrollment completed",
  "data": {
    "totalRows": 50,
    "successCount": 47,
    "failedCount": 3,
    "errors": [
      {
        "row": 4,
        "stdRegNumber": "SP26-CS-004",
        "errors": ["Student registration number already exists"]
      },
      {
        "row": 12,
        "stdRegNumber": "SP26-CS-012",
        "errors": ["Batch not found", "Invalid gender value"]
      },
      {
        "row": 28,
        "stdRegNumber": null,
        "errors": ["stdRegNumber is required"]
      }
    ]
  }
}
```

---

## 7. Download Bulk Template

### `GET /api/students/bulk/template`

Returns a ready-to-use Excel template with correct headers and a few example rows.

### Request

```http
GET /api/students/bulk/template
```

### Response

- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- File download: `student_bulk_enrollment_template.xlsx`

---

## Common Error Responses

### Student not found

**HTTP 404**

```json
{
  "success": false,
  "message": "Student not found",
  "error": "NOT_FOUND"
}
```

### Batch not found

**HTTP 404**

```json
{
  "success": false,
  "message": "Batch not found",
  "error": "BATCH_NOT_FOUND"
}
```

### Duplicate registration number

**HTTP 409**

```json
{
  "success": false,
  "message": "Student registration number already exists",
  "error": "STUDENT_REGISTRATION_NUMBER_EXISTS"
}
```

### Duplicate CNIC

**HTTP 409**

```json
{
  "success": false,
  "message": "CNIC already exists",
  "error": "CNIC_ALREADY_EXISTS"
}
```

### Duplicate username

**HTTP 409**

```json
{
  "success": false,
  "message": "Username already exists",
  "error": "USERNAME_ALREADY_EXISTS"
}
```

### Validation / Invalid data

**HTTP 400**

```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR"
}
```

### Invalid or unsupported file (bulk)

**HTTP 400**

```json
{
  "success": false,
  "message": "Only .xlsx files are supported",
  "error": "INVALID_FILE"
}
```

---

## Lifecycle Flow

```text
POST /api/students  (or bulk)
│
├── stdRegNumber → User.username
├── Use system default student password
├── Resolve "student" role
├── Create User
└── Create Student
     (single DB transaction per student)

  ↓
Student exists
  ↓
[Course Management]
  ↓
[Student Academic Record]
  ↓
[Course Enrollment]
```

---

## Schema Notes

Current Prisma `Student` model is compatible. Recommended practices:

- `firstName` → required
- `lastName` → optional
- `admissionDate` → default to current date if not provided
- `gender` → optional (`male` | `female` | `other`)
- `cnic` → unique + optional
- `status` → default `"active"`

The default student password lives in system settings / configuration, not in the Student model.
