# Tutr — Admin Tutor Application Management (Phase 4C)

This document specifies the architecture, security model, lifecycle rules, and operational workflow for administrator review and verification of prospective tutor applications in Tutr Balasore.

---

## 1. Architectural Overview

Tutor applications intake occurs exclusively through the Google Forms $\rightarrow$ Google Apps Script $\rightarrow$ Webhook pipeline into `public.tutor_applications`. Supabase PostgreSQL is the sole source of truth for:
- Application records & status
- Review audit metadata (`reviewed_at`, `reviewed_by`, `rejection_reason`)
- Verified marketplace tutor profiles (`public.tutor_profiles`)

```
Google Form / Sheet
       │
       ▼
POST /api/webhooks/google-forms
       │
       ▼
public.tutor_applications (status: PENDING)
       │
       ▼
Admin Application Queue (/admin/applications)
       │
       ▼
Admin opens Application (/admin/applications/[id])
       │
       ▼
Start Review ─────────────► status: UNDER_REVIEW
       │
       ├─► Reject Application ──► status: REJECTED (audit + rejection_reason)
       │
       └─► Approve Application (Atomic Transaction):
             1. status: APPROVED
             2. Set reviewed_at & reviewed_by
             3. Provision public.tutor_profiles (is_verified: true)
             4. Eligible for public_tutor_profiles marketplace view
```

---

## 2. Server-Side Admin Authorization

All administration routes and operations strictly enforce server-side role validation:

1. Validate active session using `supabase.auth.getUser()`.
2. Query `public.users` under active session to verify `role = 'ADMIN'`.
3. If unauthenticated: Redirect cleanly to `/login?next=/admin/applications`.
4. If authenticated but non-admin (e.g. `STUDENT` or `TUTOR`): Return HTTP 403 Forbidden with Access Denied screen.
5. Client-provided cookies, query parameters, or localStorage claims are never trusted.

---

## 3. Application Lifecycle & State Machine

Status transitions are enforced at both the PostgreSQL database level (via `validate_tutor_application_transition()` and RPC functions) and server action level:

| Current Status | Target Status | Permitted Actors | Prerequisites / Actions |
| :--- | :--- | :--- | :--- |
| **`PENDING`** | `UNDER_REVIEW` | ADMIN only | Moves application into active review. |
| **`UNDER_REVIEW`** | `APPROVED` | ADMIN only | Atomically provisions `public.tutor_profiles` with `is_verified = true`. If provisioning fails, entire transaction rolls back. |
| **`UNDER_REVIEW`** | `REJECTED` | ADMIN only | Requires non-empty rejection reason (3–1000 characters). Unsets `is_verified` if profile existed. |
| **`APPROVED`** | `PENDING` | None | Prohibited by database trigger. |
| **`REJECTED`** | `APPROVED` | None | Prohibited directly; must reopen to `UNDER_REVIEW` first. |

---

## 4. Atomic Profile Provisioning (`approve_tutor_application`)

When an administrator approves an application:

```sql
SELECT public.approve_tutor_application(application_id);
```

The database execution runs as an atomic PostgreSQL transaction:
1. Validates `public.is_current_user_admin()`.
2. Obtains row-level update lock (`FOR UPDATE`) on `tutor_applications`.
3. Checks current status is strictly `UNDER_REVIEW`.
4. Resolves `user_id`:
   - Matches linked `user_id`, or resolves by matching normalized email in `public.users`.
   - If no user account exists, aborts with exception: *"Cannot approve application: Applicant has not registered a Tutr user account yet."*
5. Sets `status = 'APPROVED'`, `reviewed_by = auth.uid()`, `reviewed_at = clock_timestamp()`.
6. Upserts into `public.tutor_profiles`:
   - `user_id`: applicant user UUID
   - `application_id`: application UUID
   - `display_name`: applicant full name
   - `qualification`, `experience`, `locality`, `fee`, `availability`
   - `is_verified`: strictly `true`
7. If any step fails, the entire transaction rolls back: the application does **not** remain approved.

---

## 5. Rejection Workflow (`reject_tutor_application`)

When an administrator rejects an application:

```sql
SELECT public.reject_tutor_application(application_id, rejection_reason);
```

1. Validates `public.is_current_user_admin()`.
2. Validates `rejection_reason`: trimmed length must be between 3 and 1,000 characters (non-empty, non-whitespace).
3. Obtains row-level update lock (`FOR UPDATE`) on `tutor_applications`.
4. Verifies current status is strictly `UNDER_REVIEW`.
5. Sets `status = 'REJECTED'`, `rejection_reason = reason`, `reviewed_by = auth.uid()`, `reviewed_at = clock_timestamp()`.
6. Ensures any associated `tutor_profiles` has `is_verified = false`.

---

## 6. Document Privacy & Storage Security

- **Private Applicant Documents**: Google Drive URLs or uploaded credentials in `documents` JSONB are stored strictly in `public.tutor_applications`.
- **RLS Boundary**: `tutor_applications` RLS policy `tutor_applications_select_own_or_admin` guarantees only the applicant or an authorized admin can query the table.
- **Marketplace Isolation**: The public view `public.public_tutor_profiles` completely omits `documents`, `phone`, `email`, `rejection_reason`, and `reviewed_by`.

---

## 7. Concurrency & Double-Action Protection

To prevent multiple administrators from racing on the same application:
- All RPC procedures (`start_tutor_application_review`, `approve_tutor_application`, `reject_tutor_application`) execute `SELECT ... FOR UPDATE` row locks.
- If Admin A changes an application to `UNDER_REVIEW`, Admin B's attempt to run the same transition will fail cleanly with:
  *"Invalid status transition: Only applications in PENDING can be moved to UNDER_REVIEW. Current status is UNDER_REVIEW."*
- Server actions capture database state errors and return clear, non-technical feedback to the administrator.

---

## 8. Automated Validation Suite

Run the automated test battery:

```bash
# Phase 4C Admin Application Management & Atomic Provisioning (26 checks)
node scripts/validate-phase4c-admin-applications.mjs

# Phase 4A & 4B Ingestion Regressions
node scripts/validate-phase4a-ingestion.mjs
node scripts/validate-phase4b-google-forms.mjs

# Phase 3B Auth & Routing Regression
node scripts/validate-phase3b-e2e.mjs

# Phase 2B Database Security & RLS Regression (14 checks)
npx supabase db query --linked --file supabase/tests/database_security_test.sql
```
