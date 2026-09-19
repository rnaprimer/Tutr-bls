# Tutr Phase 5: Student ↔ Tutor Discovery & Tutor Request System

## 1. Overview
Phase 5 establishes a minimal, secure, and production-ready marketplace connecting **Students** and **Verified Tutors** in Balasore, Odisha.

### Strict Scope Boundaries
- **Two Active Personas Only**: `STUDENT` and `TUTOR`. No Parent UI, Parent dashboard, Parent requests, or Parent features exist in Phase 5. Dormant database structures remain untouched.
- **Zero Payment / Contact Unlocking**: Phase 5 excludes Razorpay, payment gateways, invoices, subscriptions, wallets, commissions, transactions, contact unlocking, chat, messaging, and ratings.
- **Privacy First**: Student phone numbers and email addresses are never revealed to tutors. Tutors only see the student's name, requested subject, class, and optional note.

---

## 2. Core User Journeys

### 2.1 Student Journey
```
1. /tutors
   └── Browse verified tutors from public.public_tutor_profiles
   └── Filter by Subject, Class, Board, Locality, and Fee
   └── Search by name, qualification, or locality

2. /tutors/[id]
   └── View tutor dossier: Name, Verified Badge, Locality, Bio, Subjects, Classes, Boards, Qualification, Experience, Fee, Availability
   └── Click "Request This Tutor"
   └── Configure Subject, Class, and Optional Message
   └── Submit request (atomic create_tutor_request RPC)

3. /student/requests
   └── View submitted requests (Tutor Name, Locality, Subject, Class, Fee, Request Date, Status Badge)
   └── Cancel any PENDING request
```

### 2.2 Tutor Journey
```
1. /tutor
   └── Verified tutor views status and clicks "View Student Requests"

2. /tutor/requests
   └── View metrics: Total Requests & Pending Requests
   └── View incoming requests (Student Name, Subject, Class, Message, Request Date, Status Badge)
   └── Actions: Accept or Decline
   └── Atomic status transitions: PENDING -> ACCEPTED or PENDING -> DECLINED
```

---

## 3. Database Architecture

### 3.1 Data Model
```sql
CREATE TABLE public.tutor_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    tutor_id UUID NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    message TEXT,
    status public.tutor_request_status NOT NULL DEFAULT 'PENDING'::public.tutor_request_status,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    responded_at TIMESTAMPTZ
);
```

### 3.2 Anti-Duplication Constraint
Duplicate active requests are prevented at the database level using a partial unique index:
```sql
CREATE UNIQUE INDEX idx_tutor_requests_active_unique
ON public.tutor_requests(student_id, tutor_id)
WHERE status = 'PENDING';
```

### 3.3 Status Lifecycle & State Machine
```
              ┌───────────┐
              │  PENDING  │
              └─────┬─────┘
       ┌────────────┼────────────┐
       ▼            ▼            ▼
 ┌──────────┐ ┌───────────┐ ┌───────────┐
 │ ACCEPTED │ │  DECLINED │ │ CANCELLED │
 └──────────┘ └───────────┘ └───────────┘
```
- **Terminal States**: Once a request enters `ACCEPTED`, `DECLINED`, or `CANCELLED`, it is immutable.
- **Role Permissions**:
  - Only the assigned tutor (or admin) can transition `PENDING` $\rightarrow$ `ACCEPTED` or `DECLINED`.
  - Only the requesting student (or admin) can transition `PENDING` $\rightarrow$ `CANCELLED`.
  - The client can never create a request directly in `ACCEPTED` or `DECLINED`.

---

## 4. Row Level Security (RLS)

| Table | Operation | Policy Rule |
|---|---|---|
| `tutor_requests` | `SELECT` | Student can view own (`students.user_id = auth.uid()`); Tutor can view requests directed to them (`tutor_profiles.user_id = auth.uid()`); Admin can view all. |
| `tutor_requests` | `INSERT` | Student can insert for own profile; Status must be `PENDING`; Target tutor must be `is_verified = true`. |
| `tutor_requests` | `UPDATE` | Tutor can update to `ACCEPTED`/`DECLINED`; Student can update `PENDING` $\rightarrow$ `CANCELLED`. Terminal states are immutable. |
| `tutor_requests` | `DELETE` | Admin only. |

---

## 5. Future Payment & Contact-Unlocking Architecture

Phase 5 strictly lays the foundational data structure for the future payment unlock workflow:
```
Student requests tutor
        ↓
Tutor receives request
        ↓
Tutor reviews request & accepts
        ↓
[FUTURE] Tutor attempts to access student direct contact details
        ↓
[FUTURE] Razorpay platform fee / contact unlock required
        ↓
[FUTURE] Webhook confirms successful payment
        ↓
[FUTURE] Contact information unlocked (phone, WhatsApp, email)
```
In Phase 5, all contact info remains locked and hidden behind server-side authorization.

---

## 6. Automated Validation

Run the Phase 5 test suite:
```bash
node scripts/validate-phase5-tutor-requests.mjs
```
Runs 26 automated checks covering marketplace visibility, RLS isolation, atomic status transitions, concurrency protection, anonymous boundaries, privacy guarantees, and complete regression tests for Phases 4A, 4B, 4C, 4D, 3B, and 2B.
