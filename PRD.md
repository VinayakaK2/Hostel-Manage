
# Hostel Management System - Production Grade PRD

## 1. Project Overview

### Project Name
Hostel Management System

### System Type
Role-Based Hostel Operations ERP

### Primary Goal
Build a production-grade hostel management web application for:
- Hostel administration
- Warden operations
- Attendance management
- Room/blueprint management
- Automated parent notifications

---

# 2. User Roles

## 2.1 Admin

### Responsibilities
- Manage hostels
- Create wardens
- Assign wardens
- Manage students
- View reports
- Monitor occupancy
- Monitor attendance analytics

### Restrictions
Admin does NOT manage:
- Daily attendance marking
- Room operational management
- Student observation workflows

Those belong to wardens.

---

## 2.2 Warden

### Responsibilities
- Manage assigned hostel only
- Manage students
- Mark attendance
- Handle leave
- Maintain observations
- Manage room blueprint
- Monitor room occupancy

### Restrictions
Warden cannot:
- Access other hostels
- Access admin modules
- Access unassigned students

---

# 3. Recommended Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT + Refresh Tokens |
| State Management | Zustand |
| Styling | Tailwind CSS |
| Queue System | BullMQ |
| Redis | Redis |
| Email | Resend |
| SMS | Twilio / Fast2SMS |
| Deployment | VPS/vercel/render |

---

# 4. System Architecture

## Frontend
- React SPA
- Protected Routes
- Role-based routing
- API abstraction layer
- Reusable components

## Backend
- Modular architecture
- Service layer pattern
- Repository pattern
- Middleware-based security
- Queue-driven notifications

## Database
- PostgreSQL relational DB
- ACID transactions
- Constraints + indexes

---

# 5. Folder Structure

## Backend Structure

```txt
backend/
│
├── src/
│   ├── config/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── routes/
│   ├── middlewares/
│   ├── validations/
│   ├── utils/
│   ├── jobs/
│   ├── queues/
│   ├── prisma/
│   ├── constants/
│   ├── sockets/
│   ├── logs/
│   └── app.js
│
├── tests/
├── package.json
└── README.md
```

---

## Frontend Structure

```txt
frontend/
│
├── src/
│   ├── api/
│   ├── pages/
│   ├── layouts/
│   ├── components/
│   ├── hooks/
│   ├── store/
│   ├── routes/
│   ├── utils/
│   ├── constants/
│   ├── services/
│   ├── contexts/
│   └── main.jsx
│
├── public/
└── package.json
```

---

# 6. Authentication Design

## Login Flow

1. User submits credentials
2. Backend validates
3. JWT access token generated
4. Refresh token generated
5. Tokens stored securely
6. Role attached to session

---

## Security Rules

- Password hashing using bcrypt
- HTTP-only cookies
- CSRF protection
- Rate limiting
- Session invalidation
- Token expiration
- Role middleware

---

# 7. Role-Based Access Control

## Middleware Logic

### Admin Access
```js
if (user.role !== "ADMIN") denyAccess()
```

### Warden Access
```js
if (student.hostelId !== user.assignedHostelId) denyAccess()
```

---

# 8. Core Modules

## 8.1 Hostel Management

### Features
- Create hostel
- Update hostel
- Disable hostel
- Configure rooms
- Set capacity
- Assign wardens

### Business Rules
- Boys hostel accepts only male students
- Girls hostel accepts only female students
- Capacity cannot exceed limit

---

## 8.2 Warden Management

### Features
- Create warden
- Assign hostel
- Reassign hostel
- Disable warden

### Important Logic
Only one active warden per hostel unless multi-warden mode enabled.

---

## 8.3 Student Management

### Features
- Add student
- Update student
- Transfer room
- Deactivate student
- Search/filter student

### Validation Rules
- Unique student ID
- Unique phone number
- Hostel type validation
- Room occupancy validation

---

# 9. Attendance System

## Attendance Status

| Status | Meaning |
|---|---|
| PRESENT | Student present |
| ABSENT | Student absent |
| LEAVE | Approved leave |

---

## Attendance Workflow

1. Warden opens attendance page
2. Student list fetched
3. Warden marks status
4. Leave requires reason
5. Attendance submitted
6. Notifications queued

---

## Validation Rules

### Leave Validation
- Leave reason mandatory

### Duplicate Protection
```sql
UNIQUE(student_id, attendance_date)
```

### Transaction Safety
Attendance submission wrapped inside DB transaction.

---

# 10. Notification System

## Leave Notification

Trigger:
- Student marked LEAVE

Actions:
- Send SMS
- Send email

---

## Absent Notification

Trigger:
- Student marked ABSENT

Logic:
1. Delay 30 minutes
2. Recheck attendance
3. Send notification if still absent

---

## Failure Handling

### SMS Failure
- Retry 3 times

### Email Failure
- Retry queue

### Queue Failure
- Dead-letter queue logging

---

# 11. Hostel Blueprint Module

## UI Requirements

- Grid layout
- Interactive room cards
- Hover effects
- Occupancy indicators

---

## Room States

| State | Color |
|---|---|
| Empty | Gray |
| Partial | Yellow |
| Full | Green |
| Maintenance | Red |

---

## Room Click Modal

Shows:
- Room details
- Student list
- Attendance snapshot
- Bed occupancy

---

# 12. Database Schema Design

## Tables

### admins
```sql
id
name
email
password
created_at
updated_at
```

---

### hostels
```sql
id
name
type
capacity
status
created_at
updated_at
```

---

### wardens
```sql
id
name
email
phone
password
assigned_hostel_id
status
created_at
updated_at
```

---

### rooms
```sql
id
hostel_id
room_number
capacity
current_occupancy
status
floor
created_at
updated_at
```

---

### students
```sql
id
student_id
name
gender
course
phone
parent_phone
parent_email
hostel_id
room_id
status
created_at
updated_at
```

---

### attendance
```sql
id
student_id
attendance_date
status
leave_reason
remark
marked_by
created_at
```

---

### study_observations
```sql
id
student_id
warden_id
note
severity
created_at
```

---

### notifications
```sql
id
student_id
type
status
recipient
message
sent_at
created_at
```

---

# 13. API Design

## Authentication APIs

| Method | Endpoint |
|---|---|
| POST | /api/auth/login |
| POST | /api/auth/logout |
| POST | /api/auth/refresh |

---

## Student APIs

| Method | Endpoint |
|---|---|
| GET | /api/students |
| POST | /api/students |
| PUT | /api/students/:id |
| DELETE | /api/students/:id |

---

## Attendance APIs

| Method | Endpoint |
|---|---|
| POST | /api/attendance |
| GET | /api/attendance/date |
| GET | /api/attendance/student/:id |

---

## Blueprint APIs

| Method | Endpoint |
|---|---|
| GET | /api/rooms |
| GET | /api/rooms/:id |
| PUT | /api/rooms/:id |

---

# 14. Error Handling Strategy

## API Errors

Standard response format:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

---

## Validation Errors
- Missing leave reason
- Invalid hostel assignment
- Duplicate attendance
- Invalid room allocation

---

## System Errors
- Database unavailable
- Queue failure
- SMS provider failure
- Email timeout

---

# 15. Edge Cases

## Student Transfer
- Old room occupancy decremented
- New room occupancy incremented

---

## Hostel Full
- Prevent allocation

---

## Warden Reassignment
- Old access revoked instantly

---

## Duplicate Attendance
- Prevent second entry

---

## Concurrent Attendance Update
- Use DB locking

---

## Notification Spam
- Debounce duplicate notifications

---

# 16. Performance Requirements

## Backend
- API response < 500ms
- Queue-based notifications
- Indexed queries

## Frontend
- Lazy loading
- Route splitting
- Optimized rendering

---

# 17. Security Requirements

## Mandatory Security
- Helmet
- CORS protection
- Rate limiting
- JWT expiry
- Input sanitization
- SQL injection prevention
- XSS protection

---

# 18. Logging Strategy

## Log Types
- API logs
- Error logs
- Attendance activity logs
- Notification logs
- Security logs

---

# 19. Deployment Architecture

## Infrastructure

```txt
Nginx
   ↓
Frontend (React)
   ↓
Backend API (Express)
   ↓
PostgreSQL
   ↓
Redis Queue
```

---

# 20. Production Standards

## Code Standards
- No hardcoded values
- Centralized constants
- Proper error boundaries
- Reusable components
- Service layer abstraction

---

## Backend Standards
- No business logic in controllers
- Transaction-safe operations
- Validation before DB calls
- Proper async handling

---

## Frontend Standards
- Responsive design
- Reusable components
- Skeleton loaders
- Error states
- Empty states

---

# 21. Future Scalability

System architecture should support:
- Multi-hostel campuses
- Multiple wardens per hostel
- Biometric integration
- QR attendance
- Mobile app
- Real-time notifications
- Analytics dashboard

---

# 22. Development Phases

## Phase 1
Authentication & RBAC

## Phase 2
Hostel Management

## Phase 3
Warden Management

## Phase 4
Student Management

## Phase 5
Attendance System

## Phase 6
Blueprint Module

## Phase 7
Notification System

## Phase 8
Analytics & Reports

---

# 23. AI Development Rules

The AI assistant generating code for this project MUST:

- Generate production-ready code only
- Include validation
- Handle edge cases
- Include proper error handling
- Use modular architecture
- Avoid hardcoded logic
- Implement defensive programming
- Include loading/error states
- Follow clean architecture principles
- Never generate happy-path-only code

---

# 24. Final Notes

This project is NOT a simple CRUD system.

It is:
- Hostel ERP
- Attendance automation platform
- Operational management system
- Role-based enterprise application

Architecture quality is critical.
