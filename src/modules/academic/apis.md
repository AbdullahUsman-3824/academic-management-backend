# Academics Module API

## Overview

The Academics module manages the academic structure and its lifecycle.

The module is workflow-oriented rather than exposing a separate CRUD API for every database table.

The primary setup workflow creates, in a single transaction:

- Academic Year
- Two Academic Sessions
- Student Intake Batch

An Academic Session belongs to an Academic Year at the database level.

A Batch is created as part of the same setup workflow, but it has no database relationship with Academic Year or Academic Session in the current schema. Students reference the Batch directly.

---

# Base URL

```text
/api/academics
```

---

# API Summary

| Method | Endpoint                           | Purpose                                                        |
| ------ | ---------------------------------- | -------------------------------------------------------------- |
| POST   | `/academics/setup`                 | Set up a new academic year, its two sessions, and intake batch |
| GET    | `/academics/overview`              | Get the current academic management overview                   |
| GET    | `/academics/years`                 | List academic years                                            |
| GET    | `/academics/years/:id`             | Get an academic year with its sessions                         |
| PATCH  | `/academics/years/:id`             | Update academic year details                                   |
| PATCH  | `/academics/sessions/:id`          | Update academic session details                                |
| POST   | `/academics/sessions/:id/activate` | Activate an academic session                                   |
| POST   | `/academics/sessions/:id/complete` | Complete an academic session                                   |
| GET    | `/academics/batches`               | List batches                                                   |
| GET    | `/academics/batches/:id`           | Get batch details                                              |
| PATCH  | `/academics/batches/:id`           | Update batch details                                           |

Lifecycle endpoints for academic years and batches can be added later if the business workflow requires them.

---

# 1. Setup Academic Year

## `POST /academics/setup`

Creates a complete academic-year setup.

This is the main API used when a new academic year starts.

The request contains three logical sections:

1. Academic Year
2. Two Academic Sessions
3. Student Intake / Batch

The backend creates all records inside a single database transaction.

If any part fails, the complete operation is rolled back.

### Request

```json
{
  "year": {
    "name": "2026-27",
    "startDate": "2026-08-01",
    "endDate": "2027-07-31"
  },
  "sessions": [
    {
      "name": "Fall 2026",
      "startDate": "2026-08-01",
      "endDate": "2026-12-31"
    },
    {
      "name": "Spring 2027",
      "startDate": "2027-01-01",
      "endDate": "2027-07-31"
    }
  ],
  "batch": {
    "name": "SP26",
    "startDate": "2026-08-01",
    "endDate": "2030-07-31"
  }
}
```

### Response

**201 Created**

```json
{
  "id": 3,
  "name": "2026-27",
  "startDate": "2026-08-01",
  "endDate": "2027-07-31",
  "status": "active",
  "sessions": [
    {
      "id": 5,
      "name": "Fall 2026",
      "startDate": "2026-08-01",
      "endDate": "2026-12-31",
      "status": "upcoming"
    },
    {
      "id": 6,
      "name": "Spring 2027",
      "startDate": "2027-01-01",
      "endDate": "2027-07-31",
      "status": "upcoming"
    }
  ],
  "batch": {
    "id": 1,
    "name": "SP26",
    "startDate": "2026-08-01",
    "endDate": "2030-07-31",
    "status": "active"
  }
}
```

### Business Rules

- An academic year must contain exactly two academic sessions.
- The academic year name must be unique.
- Session dates must fall within the academic year's date range.
- The two sessions must not overlap.
- Creating a new academic year makes it the active academic year.
- The previously active academic year becomes inactive.
- The setup must execute inside one database transaction.
- Batch creation is part of the setup workflow but does not create an FK relationship between Batch and Academic Year.

---

# 2. Academic Overview

## `GET /academics/overview`

Returns the current academic state needed by the Academic Management dashboard.

This endpoint should provide a summarized view instead of forcing the frontend to call multiple endpoints.

### Request

No request body.

### Response

**200 OK**

```json
{
  "currentYear": {
    "id": 3,
    "name": "2026-27",
    "startDate": "2026-08-01",
    "endDate": "2027-07-31",
    "status": "active"
  },
  "currentSession": {
    "id": 6,
    "name": "Spring 2027",
    "startDate": "2027-01-01",
    "endDate": "2027-07-31",
    "status": "active"
  },
  "statistics": {
    "academicYears": 3,
    "activeBatches": 4
  }
}
```

`currentSession` may be `null` when there is no active session.

---

# 3. List Academic Years

## `GET /academics/years`

Returns all academic years.

This endpoint is used for the Academic Years listing/history view.

### Query Parameters

```text
status
```

Optional.

Example:

```text
GET /academics/years?status=active
```

### Request

No request body.

### Response

**200 OK**

```json
{
  "data": [
    {
      "id": 3,
      "name": "2026-27",
      "startDate": "2026-08-01",
      "endDate": "2027-07-31",
      "status": "active"
    },
    {
      "id": 2,
      "name": "2025-26",
      "startDate": "2025-08-01",
      "endDate": "2026-07-31",
      "status": "inactive"
    }
  ]
}
```

---

# 4. Get Academic Year

## `GET /academics/years/:id`

Returns details of one academic year and its associated academic sessions.

### Request

```text
GET /academics/years/3
```

### Response

**200 OK**

```json
{
  "id": 3,
  "name": "2026-27",
  "startDate": "2026-08-01",
  "endDate": "2027-07-31",
  "status": "active",
  "sessions": [
    {
      "id": 5,
      "name": "Fall 2026",
      "startDate": "2026-08-01",
      "endDate": "2026-12-31",
      "status": "completed"
    },
    {
      "id": 6,
      "name": "Spring 2027",
      "startDate": "2027-01-01",
      "endDate": "2027-07-31",
      "status": "active"
    }
  ]
}
```

Batch is not returned as an Academic Year relation because the current database schema does not relate `batches` to `academic_years`.

---

# 5. Update Academic Year

## `PATCH /academics/years/:id`

Updates the basic information of an academic year.

This endpoint is intended for correcting or changing year details after setup.

### Request

```text
PATCH /academics/years/3
```

```json
{
  "name": "2026-27",
  "startDate": "2026-08-01",
  "endDate": "2027-07-31"
}
```

All fields are optional.

### Response

**200 OK**

```json
{
  "id": 3,
  "name": "2026-27",
  "startDate": "2026-08-01",
  "endDate": "2027-07-31",
  "status": "active"
}
```

### Notes

The `status` should not be changed through this generic update endpoint.

Lifecycle changes should use dedicated operations.

---

# 6. Update Academic Session

## `PATCH /academics/sessions/:id`

Updates the details of an existing academic session.

Sessions are normally created during academic-year setup.

This endpoint is primarily for correcting or changing session information.

### Request

```text
PATCH /academics/sessions/6
```

```json
{
  "name": "Spring 2027",
  "startDate": "2027-01-01",
  "endDate": "2027-07-31"
}
```

All fields are optional.

### Response

**200 OK**

```json
{
  "id": 6,
  "academicYearId": 3,
  "name": "Spring 2027",
  "startDate": "2027-01-01",
  "endDate": "2027-07-31",
  "status": "upcoming"
}
```

### Business Rules

- Session must belong to an existing academic year.
- Session dates must remain valid relative to its academic year.
- Session dates must not overlap with the other session of the same academic year.

---

# 7. Activate Academic Session

## `POST /academics/sessions/:id/activate`

Changes an academic session from `upcoming` to `active`.

### Request

```text
POST /academics/sessions/6/activate
```

No request body.

### Response

**200 OK**

```json
{
  "id": 6,
  "academicYearId": 3,
  "name": "Spring 2027",
  "startDate": "2027-01-01",
  "endDate": "2027-07-31",
  "status": "active"
}
```

### Business Rules

- The session must be eligible for activation.
- Only the appropriate session for the current academic period should be activated.
- The session must belong to the currently active academic year.

---

# 8. Complete Academic Session

## `POST /academics/sessions/:id/complete`

Marks an academic session as completed.

### Request

```text
POST /academics/sessions/5/complete
```

No request body.

### Response

**200 OK**

```json
{
  "id": 5,
  "academicYearId": 3,
  "name": "Fall 2026",
  "startDate": "2026-08-01",
  "endDate": "2026-12-31",
  "status": "completed"
}
```

### Business Rules

- Only an active session should normally be completed.
- Once completed, the session should not return to `upcoming`.
- Course/result workflows can later use this lifecycle state.

---

# 9. List Batches

## `GET /academics/batches`

Returns all batches.

Batches are independent entities in the database and are directly referenced by students.

### Query Parameters

Optional:

```text
status
```

Example:

```text
GET /academics/batches?status=active
```

### Response

**200 OK**

```json
{
  "data": [
    {
      "id": 1,
      "name": "SP26",
      "startDate": "2026-08-01",
      "endDate": "2030-07-31",
      "status": "active",
      "studentCount": 120
    },
    {
      "id": 2,
      "name": "SP25",
      "startDate": "2025-08-01",
      "endDate": "2029-07-31",
      "status": "active",
      "studentCount": 132
    }
  ]
}
```

`studentCount` is an aggregate from the Student module and is not stored directly in the Batch table.

---

# 10. Get Batch

## `GET /academics/batches/:id`

Returns details of a specific batch.

### Request

```text
GET /academics/batches/1
```

### Response

**200 OK**

```json
{
  "id": 1,
  "name": "SP26",
  "startDate": "2026-08-01",
  "endDate": "2030-07-31",
  "status": "active",
  "studentCount": 120
}
```

---

# 11. Update Batch

## `PATCH /academics/batches/:id`

Updates basic batch information.

### Request

```text
PATCH /academics/batches/1
```

```json
{
  "name": "SP26",
  "startDate": "2026-08-01",
  "endDate": "2030-07-31"
}
```

All fields are optional.

### Response

**200 OK**

```json
{
  "id": 1,
  "name": "SP26",
  "startDate": "2026-08-01",
  "endDate": "2030-07-31",
  "status": "active"
}
```

The `status` should not be changed through this generic update endpoint.

---

# Error Responses

All APIs should use standard NestJS HTTP exceptions.

## Validation Error

**400 Bad Request**

```json
{
  "statusCode": 400,
  "message": ["name should not be empty", "startDate must be a valid date"],
  "error": "Bad Request"
}
```

## Resource Not Found

**404 Not Found**

```json
{
  "statusCode": 404,
  "message": "Academic year with ID 3 not found",
  "error": "Not Found"
}
```

## Conflict

**409 Conflict**

Example: attempting to create an academic year with an existing name.

```json
{
  "statusCode": 409,
  "message": "Academic year 2026-27 already exists",
  "error": "Conflict"
}
```

---

# Academic Lifecycle

## Academic Year

```text
ACTIVE
  │
  └── new academic year created
          ↓
       previous year → INACTIVE
```

The current schema also supports `completed` as a status if the application later chooses to use an explicit completion state.

## Academic Session

```text
UPCOMING
    ↓
 ACTIVE
    ↓
COMPLETED
```

Alternative cancellation:

```text
UPCOMING / ACTIVE
        ↓
    CANCELLED
```

## Batch

```text
ACTIVE
  ↓
COMPLETED
```

or:

```text
ACTIVE
  ↓
CANCELLED
```

Batch lifecycle endpoints are intentionally not included in the initial API set until the exact business workflow is defined.

---

# Scope Boundary

The following entities exist in the Academic Structure schema but are intentionally outside the initial Academic Management API workflow:

- Sections
- Student Academic Records

Sections and student academic records should be handled when student academic enrollment/progression workflows are implemented.

Similarly, courses and course allocations should be handled by the Course Management module. Academic Sessions provide the academic context for those operations.

---

# Recommended NestJS Service Responsibilities

The controller should remain thin.

```text
AcademicController
        ↓
AcademicService
        ↓
┌──────────────────────────┐
│ AcademicYearService      │
│ AcademicSessionService   │
│ BatchService             │
└──────────────────────────┘
        ↓
     Prisma
```

`AcademicService.setup()` orchestrates the complete setup workflow.

The specialized services own entity-specific operations.

The setup operation should use a Prisma transaction so the Academic Year, both Sessions, and Batch are either all created or none are created.
