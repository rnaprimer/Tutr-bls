# Tutr — Database Security & Validation Report (Phase 2B)

This document provides the formal security verification, Row Level Security (RLS) validation, integrity checks, and persona-driven test results for the **Tutr** database running on PostgreSQL 17 in the connected Supabase project (`jpjrkkdsaxskcgpqrwka`).

---

## 1. Test Methodology & Safety Guarantees

All security tests were executed against the live remote database using the official Supabase CLI Management API runner.

### Safety Principles Enforced During Testing:
1. **Zero Production Mutation**: The entire test suite operates within an explicit transaction block (`BEGIN ... ROLLBACK;`). No temporary accounts, mock tutor applications, or test junction relationships are permanently stored.
2. **Real Role Switching**: Tests simulate real-world personas by executing `SET LOCAL role = 'anon'` or `SET LOCAL role = 'authenticated'` and setting `request.jwt.claim.sub` to the persona's UUID. This engages PostgreSQL's native RLS evaluation engine identically to API requests received through Supabase client / PostgREST.
3. **Privileged Escalation Separation**: Functions requiring administrative evaluation (`is_current_user_admin()`) verify both database session identity and JWT user claims, ensuring ordinary authenticated users cannot bypass RLS.

---

## 2. Tested Personas

| Persona | Connection Role | User Role in `public.users` | Context / Scope |
| :--- | :--- | :--- | :--- |
| **`ANONYMOUS`** | `anon` | None | Unauthenticated visitor exploring Balasore tutors |
| **`STUDENT`** | `authenticated` | `USER` (has `public.students` record) | Registered student searching for local tuition |
| **`TUTOR`** | `authenticated` | `USER` (has `public.tutor_applications` record) | Applicant / educator offering academic tutoring |
| **`ADMIN`** | `authenticated` | `ADMIN` (has `role = 'ADMIN'`) | Authorized Tutr platform administrator |

---

## 3. Comprehensive Test Results Matrix (14 Categories)

| # | Test Name | Persona | Expected Behavior | Actual Behavior | Status |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **1** | **Auth -> Users Sync** | System / Auth | `auth.users` insert automatically creates `public.users` record with matching UUID, email, name, avatar. | `public.users` record created automatically with matching fields via `on_auth_user_created` trigger. | **PASS** |
| **2** | **Auth Deletion Behavior** | System / Foreign Keys | Deleting `auth.users` cascades to `public.users`, `students`, `tutor_profiles`; retains application with `user_id = NULL`. | User, student, and tutor profile deleted; application preserved with `user_id = NULL` (audit retention). | **PASS** |
| **3** | **User Role Escalation Guard** | `STUDENT` (authenticated) | Permit own name update; deny other user updates (0 rows); deny self-escalation to `ADMIN`. | Name updated; other user update denied (0 rows); role change to `ADMIN` raised exception. | **PASS** |
| **4** | **Student Privacy & Boundaries** | `STUDENT` (authenticated) | Read own student profile; 0 rows returned for other students; 0 rows returned for tutor applications. | Own profile found; Student B hidden; tutor applications completely hidden. | **PASS** |
| **5** | **Tutor Application Self-Guard** | `TUTOR` (authenticated) | Read/update own pending fields; status/reviewed_by updates strictly blocked. | Read own app; updated fee; status and reviewed_by edits rejected with unauthorized error. | **PASS** |
| **6** | **Tutor Self-Verification Guard** | `TUTOR` (authenticated) | Tutor can update bio; setting `is_verified = true` strictly blocked. | Bio updated; `is_verified` update rejected by trigger `prevent_tutor_self_verification`. | **PASS** |
| **7** | **Admin Lifecycle Execution** | `ADMIN` (authenticated) | Admin reads all apps; transitions `PENDING → UNDER_REVIEW → APPROVED`; populates audit fields. | Status transitioned to `APPROVED`; `reviewed_by` set to admin UUID; `reviewed_at` populated. | **PASS** |
| **8** | **Lifecycle Invalid Transitions Guard** | `ADMIN` (authenticated) | Block invalid transition `APPROVED → PENDING`. | Database raised exception: *Approved applications can only be transitioned back to UNDER_REVIEW or REJECTED*. | **PASS** |
| **9** | **Google Response ID Uniqueness** | System / Ingestion | Permit multiple `NULL`s; permit unique response IDs; reject duplicate response ID. | Multiple `NULL`s accepted; `resp_001` & `resp_002` stored; duplicate `resp_001` raised `unique_violation`. | **PASS** |
| **10** | **Public Tutor Visibility & Isolation** | `ANONYMOUS` (anon) | Only verified Tutor D visible in view; Tutors A, B, C hidden; 0 rows on private tables. | Tutor D visible; unverified tutors hidden; direct access to `users`, `students`, `applications` denied. | **PASS** |
| **11** | **Cross-User Data Isolation** | `STUDENT` & `TUTOR` | Tutor A sees 0 rows for Tutor B app; Student B sees 0 rows for Student A profile. | Zero cross-user data exposure confirmed for both tutors and students. | **PASS** |
| **12** | **Normalized Marketplace Filtering** | `ANONYMOUS` (anon) | Filter verified tutors by Mathematics + Class 10 + CBSE using normalized junction tables. | Tutor D successfully discovered with multi-junction join and zero JSON parsing. | **PASS** |
| **13** | **Data Integrity & Foreign Keys** | System / Integrity | Enforce foreign key checks on `user_id`, `subject_id`; reject duplicate junction entry. | Foreign key violations raised on invalid UUIDs; `unique_violation` raised on duplicate junction. | **PASS** |
| **14** | **Reference Data Access & Guard** | `ANONYMOUS` (anon) | Read 10 subjects, 12 classes, 4 boards; block anonymous modifications. | Full reference catalog readable by anon; insert into `subjects` denied by RLS. | **PASS** |

---

## 4. Key Security Findings & Verifications

### 1. Zero Public Data Leakage
The public view `public.public_tutor_profiles` was inspected and verified:
* **Exposed**: `id`, `display_name`, `photo_url`, `bio`, `qualification`, `experience`, `locality`, `teaching_areas`, `fee`, `availability`, `is_verified`, `created_at`.
* **Strictly Omitted**: `phone`, `email`, `documents`, `google_response_id`, `admin notes`, `rejection_reason`, `reviewed_by`, and `user_id`.
* **Underlying Tables Protected**: Anonymous and unauthenticated callers receive 0 rows if attempting to query `tutor_applications`, `users`, or `students` directly.

### 2. Role Escalation Protection
* The trigger `trg_users_prevent_role_escalation` checks `public.is_current_user_admin()`.
* When an ordinary user (e.g. `role = 'authenticated'` with `auth.uid() = student_uuid`) executes:
  ```sql
  UPDATE public.users SET role = 'ADMIN' WHERE id = auth.uid();
  ```
  PostgreSQL raises exception `P0001: Unauthorized: Only administrators can modify user roles.`

### 3. Application Lifecycle Integrity
* Only users with verified `ADMIN` privileges can advance or reject tutor applications.
* The state machine strictly enforces:
  * `PENDING → UNDER_REVIEW → APPROVED | REJECTED`
  * Direct transitions to invalid states (e.g. `APPROVED → PENDING`) are rejected.
* On approval or rejection, audit timestamps (`reviewed_at`) and reviewer references (`reviewed_by`) are populated automatically.

### 4. Audit Trail Retention on Account Deletion
* If an applicant deletes their Supabase Auth user account, `ON DELETE SET NULL` on `public.tutor_applications.user_id` preserves the historical application, qualifications, verification documents, and review records for platform compliance.
