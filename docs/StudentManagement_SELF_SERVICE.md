# Student Self-Service API

## Overview

These endpoints provide the authenticated student with access to their own
profile, dashboard, courses, and marks. All routes are protected by the JWT
authentication guard.

## Base URL

```text
/students
```

## Authentication

Send a valid student JWT with every request:

```http
Authorization: Bearer <access-token>
```

The authenticated user's ID is taken from the token. Student IDs are not
accepted in self-service paths, so a student can only access their own data.

## API Summary

| Method | Endpoint                 | Purpose                                      | Status |
| ------ | ------------------------ | -------------------------------------------- | ------ |
| GET    | `/students/me`           | Get basic student information                | Ready  |
| GET    | `/students/me/dashboard` | Get dashboard summary and current courses     | Ready  |
| GET    | `/students/me/course-options` | List currently available courses         | Ready  |
| GET    | `/students/me/marks`     | Get marks, optionally filtered                | Ready  |
| GET    | `/students/me/results`   | Get results / transcript                      | Placeholder |
| GET    | `/students/me/fees`      | Get fee information                           | Placeholder |
| GET    | `/students/me/profile`   | Get the complete student profile              | Ready  |

All successful responses use the following envelope:

```json
{
  "success": true,
  "data": {}
}
```

---

## 1. Get Basic Student Information

### `GET /students/me`

Returns the authenticated student's registration number, display name, image,
and current academic placement.

### Success Response

**HTTP 200 OK**

```json
{
  "success": true,
  "data": {
    "id": "c5b8c6a1-2c41-4f3a-8d7b-123456789abc",
    "stdRegNumber": "SP26-CS-001",
    "fullName": "Ali Ahmed Khan",
    "profileImageUrl": "https://example.com/profile.jpg",
    "currentSemester": 3,
    "currentSection": "A"
  }
}
```

---

## 2. Get Student Dashboard

### `GET /students/me/dashboard`

Returns the student's current semester, enrolled courses, recent assessments,
and announcements.

`recentAssessments` and `announcements` currently return empty arrays until
their underlying features are implemented. Fee information is not currently
included in this response.

### Success Response

**HTTP 200 OK**

```json
{
  "success": true,
  "data": {
    "studentId": "c5b8c6a1-2c41-4f3a-8d7b-123456789abc",
    "currentSemester": 3,
    "courses": [],
    "recentAssessments": [],
    "announcements": []
  }
}
```

---

## 3. Get Course Options

### `GET /students/me/course-options`

Returns the courses associated with the authenticated student's active academic
record. Each course option contains:

| Field | Type   | Description                |
| ----- | ------ | -------------------------- |
| `id`  | UUID   | Course identifier          |
| `code` | string | Course code               |
| `name` | string | Course name               |

### Success Response

**HTTP 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": "5b2f3d9b-1e4c-4c8f-9ab1-123456789abc",
      "code": "CS-301",
      "name": "Database Systems"
    }
  ]
}
```

---

## 4. Get Student Marks

### `GET /students/me/marks`

Returns marks belonging to the authenticated student.

### Query Parameters

| Parameter  | Required | Description |
| ---------- | -------- | ----------- |
| `courseId` | No       | Filter marks by course UUID |
| `category` | No       | Filter by assessment category name, for example `Quiz` or `Midterm Exam` |

### Examples

```http
GET /api/students/me/marks
GET /api/students/me/marks?courseId=5b2f3d9b-1e4c-4c8f-9ab1-123456789abc
GET /api/students/me/marks?category=Quiz
GET /api/students/me/marks?courseId=5b2f3d9b-1e4c-4c8f-9ab1-123456789abc&category=Quiz
```

### Success Response

**HTTP 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": "7a2d4c8e-6f1b-4d93-8a2c-123456789abc",
      "assessment": "Midterm Exam",
      "marks": {
        "total": 50,
        "obtained": 42
      },
      "course": {
        "code": "CS-301",
        "name": "Database Systems"
      }
    }
  ]
}
```

---

## 5. Get Results / Transcript

### `GET /students/me/results`

This route is reserved for results and transcript data. The controller method
is currently a placeholder and does not return a results payload yet.

---

## 6. Get Fees

### `GET /students/me/fees`

This route is reserved for student fee information. The controller method is
currently a placeholder and does not return a fees payload yet.

---

## 7. Get Detailed Profile

### `GET /students/me/profile`

Returns the complete profile for the authenticated student, including:

- Personal information
- Contact information
- Guardian information
- Account status and last login time
- Batch and current academic placement
- Admission and audit timestamps

The response follows the same student detail shape used by
`GET /students/:id`. Passwords and password hashes are never returned.

### Success Response

**HTTP 200 OK**

```json
{
  "success": true,
  "data": {
    "id": "c5b8c6a1-2c41-4f3a-8d7b-123456789abc",
    "stdRegNumber": "SP26-CS-001",
    "fullName": "Ali Ahmed Khan",
    "email": "ali.khan@example.com",
    "phone": "03001234567",
    "batchName": "SP26",
    "currentSemester": 3,
    "currentSection": "A",
    "status": "active",
    "admissionDate": "2026-09-12",
    "gender": "male",
    "dateOfBirth": "2007-04-15",
    "cnic": "35202-1234567-1",
    "profileImageUrl": "https://example.com/profile.jpg",
    "address": "House 12, Street 5",
    "city": "Lahore",
    "guardianName": "Muhammad Khan",
    "guardianRelation": "Father",
    "guardianPhone": "03009876543",
    "guardianCnic": "35202-7654321-9",
    "username": "SP26-CS-001",
    "accountStatus": "active",
    "lastLoginAt": "2026-09-12T06:30:00.000Z",
    "currentAcademicSession": "Fall 2026",
    "createdAt": "2026-09-12T06:30:00.000Z",
    "updatedAt": "2026-09-12T06:30:00.000Z"
  }
}
```

---

## Common Errors

| HTTP Status | Condition |
| ----------- | --------- |
| `401 Unauthorized` | JWT is missing, invalid, or expired |
| `404 Not Found` | Student profile or active academic record was not found |
| `400 Bad Request` | A query parameter, such as `courseId`, is invalid |
