# Tutr — Tutor Application Frontend UX (Phase 4D)

This document specifies the user experience, architecture, state machine, and security model for the tutor-facing application portal at `/tutor`.

---

## 1. Architectural Overview

The `/tutor` route transforms from a simple static placeholder into an application-aware tutor portal connected to the `public.tutor_applications` lifecycle.

```
Tutor signs in via Google OAuth (/tutor)
                   │
                   ▼
       Server Component in app/tutor/page.tsx
                   │
                   ├─► Authenticate session via Supabase SSR
                   ├─► Query public.tutor_applications (user_id = user.id) via RLS
                   └─► Select sanitized fields: id, full_name, status, submitted_at, rejection_reason
                   │
                   ▼
       Evaluate Application State:
       ┌──────────────────┬────────────────────────────────────────────────────────┐
       │ NO APPLICATION   │ Onboarding card + "Apply to Become a Tutor" Google Form │
       │ PENDING          │ "Application Submitted" + submitted date + queue notice │
       │ UNDER_REVIEW     │ "Application Under Review" + in-progress verification   │
       │ APPROVED         │ "You're a Verified Tutr Tutor" + "Dashboard Coming Soon"│
       │ REJECTED         │ "Application Not Approved" + sanitized rejection feedback│
       │ UNKNOWN/FALLBACK │ "Application Processing" safe status display           │
       └──────────────────┴────────────────────────────────────────────────────────┘
```

---

## 2. Application States & Visual Experience

### 2.1 State A: NO APPLICATION
- Rendered when no record exists in `public.tutor_applications` for the authenticated `user_id`.
- Features an inviting Balasore onboarding hero: *"Become a Tutor on Tutr"*.
- Displays key value propositions: Hyperlocal matching across Balasore neighborhoods, flexible schedules, and verified tutor credentials.
- **Primary CTA**: *"Apply to Become a Tutor"*, linking to `NEXT_PUBLIC_TUTOR_APPLICATION_FORM_URL` (`target="_blank" rel="noopener noreferrer"`).
- **Graceful Fallback**: If `NEXT_PUBLIC_TUTOR_APPLICATION_FORM_URL` is unconfigured or invalid, renders an informative configuration alert instead of a broken link.

### 2.2 State B: PENDING
- Status Badge: Amber `PENDING`.
- Title: *"Application Submitted"*.
- Message: *"Your tutor application has been received and is waiting for review."*
- Displays formatted submission date and informs the tutor that submissions are reviewed in order of receipt by Balasore administrators.
- Omits redundant "Apply Again" buttons.

### 2.3 State C: UNDER_REVIEW
- Status Badge: Sky Blue `UNDER REVIEW`.
- Title: *"Application Under Review"*.
- Message: *"Our team is currently reviewing your tutor application."*
- Explains that academic credentials and teaching preferences are actively being checked.
- Strictly conceals reviewer identities and administrative audit data.

### 2.4 State D: APPROVED
- Status Badge: Emerald `APPROVED`.
- Title: *"You're a Verified Tutr Tutor"*.
- Message: Confirms tutor verification and explains that their verified profile is active on the public Balasore tutor view.
- **Phase 4D CTA**: Clearly designated *"Tutor Dashboard — Coming Soon"* badge informing the tutor that student matching and class requests launch in Phase 5.

### 2.5 State E: REJECTED
- Status Badge: Rose `REJECTED`.
- Title: *"Application Not Approved"*.
- Message: Respectful notice thanking the applicant.
- **Review Feedback**: Displays the clean, sanitized `rejection_reason` provided by the reviewing administrator.
- Guidance: Provides navigation back to Home without permitting uncontrolled re-applications.

---

## 3. Data Privacy & Sanitization

The `/tutor` page implements strict least-privilege data access:

| Field | Exposed to Tutor? | Rationale |
| :--- | :---: | :--- |
| `id` | Yes (internal) | Key tracking for UI state. |
| `full_name` | Yes | Personal greeting. |
| `status` | Yes | Core lifecycle state. |
| `submitted_at` | Yes | Applicant audit reference. |
| `updated_at` | Yes | Audit reference. |
| `rejection_reason`| Yes (when REJECTED) | Constructive feedback for denied applicants. |
| `phone` | **NO** | Never leaked in page HTML. |
| `documents` | **NO** | Private document URLs remain administrator-only. |
| `google_response_id` | **NO** | Internal intake tracker concealed. |
| `reviewed_by` | **NO** | Administrator anonymity protected. |
| `reviewed_at` | **NO** | Concealed from public/tutor views. |

---

## 4. Multi-Application Selection Logic

If multiple tutor applications exist for a single user (e.g. an earlier rejected submission and a newer submission), `/tutor` sorts applications deterministically:
1. Priority order: `APPROVED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `PENDING` $\rightarrow$ `REJECTED`.
2. Ties broken by newest `submitted_at` timestamp.
This guarantees the tutor always views their active or most relevant submission, never an arbitrary row.

---

## 5. Configuration & Environment Variables

| Variable | Scope | Description | Example |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_TUTOR_APPLICATION_FORM_URL` | Client & Server | Public URL to the official Google Form intake. | `https://docs.google.com/forms/d/e/.../viewform` |

> [!CAUTION]
> Never place `GOOGLE_FORMS_WEBHOOK_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` into `NEXT_PUBLIC_` variables. Only public URLs may use this prefix.
