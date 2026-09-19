# Tutr — Google Authentication & Secure Role-Based Entry (Phase 3B)

## 1. Architecture Overview

Tutr uses Google OAuth managed via Supabase Auth with server-side rendering (`@supabase/ssr`) in Next.js App Router. This ensures:
- Secure HTTP-only cookie-based session management across SSR and Client Components.
- Zero sensitive Supabase service-role keys or raw access/refresh tokens in client-side storage (`localStorage`).
- Strict server-side validation of authenticated personas and roles.
- Defense against open redirect vulnerabilities with strict allowlist destination validation.
- Complete horizontal data isolation via PostgreSQL Row Level Security (RLS).

---

## 2. Verified Google Cloud & Supabase Configuration

### 2.1 Google Cloud Console Configuration
1. Navigate to **Google Cloud Console** -> **APIs & Services** -> **Credentials**.
2. Select or create your **OAuth 2.0 Client ID** (Application type: *Web application*).
3. **Authorized JavaScript Origins**:
   - For local development:
     ```text
     http://localhost:3005
     ```
   - For production / preview:
     ```text
     https://tutrbls.vercel.app
     ```
   > [!WARNING]
   > **Never use wildcard paths in Google Cloud Origins!**
   > Google Cloud JavaScript Origins must be strictly `scheme + host + port` (e.g., `http://localhost:3005`). Do **not** append paths or wildcards like `/**` or `/auth/callback` in the Origins section.

4. **Authorized Redirect URIs**:
   - Set to the exact callback URI of your connected Supabase project:
     ```text
     https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
     ```
     *(For Tutr's connected project: `https://jpjrkkdsaxskcgpqrwka.supabase.co/auth/v1/callback`)*

---

### 2.2 Supabase Dashboard Configuration
1. In your Supabase project dashboard, navigate to **Authentication** -> **Providers** -> **Google**.
2. Set Google to **Enabled**.
3. Paste the **Client ID** and **Client Secret** generated in Google Cloud Console.
4. Under **Authentication** -> **URL Configuration**:
   - **Site URL**:
     ```text
     http://localhost:3005
     ```
     *(In production, update this to your primary custom production domain).*
   - **Redirect URLs** (Whitelisted in Supabase):
     ```text
     http://localhost:3005/**
     https://tutrbls.vercel.app/**
     ```

---

## 3. Environment Variables

### 3.1 Local Environment (`.env.local`)
Create `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_SUPABASE_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

> [!CAUTION]
> - Never commit `.env.local` or environment files to Git. Verified that `.gitignore` contains `.env*`.
> - Never expose the Supabase `service_role` key, database password, or Google Client Secret to frontend or public repositories.

### 3.2 Vercel Deployment Environments
When deploying to Vercel, configure these variables under **Project Settings** -> **Environment Variables**:

| Variable | Development | Preview | Production | Purpose |
| :--- | :---: | :---: | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | ✓ | Supabase API Gateway URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ | ✓ | Supabase Public Anon Key |

---

## 4. Canonical Entry & Redirection Flow

### 4.1 Canonical Entry Points
- **Student Portal Entry:** `/login?next=/student`
- **Tutor Portal Entry:** `/login?next=/tutor`
- **Admin Portal Entry:** `/login?next=/admin`

Direct landing-page action buttons (Hero, Navbar, Audience Cards) navigate directly to these canonical URLs to avoid intermediary redirects.

### 4.2 Destination Whitelist & Open Redirect Defense
The helper `sanitizeNextUrl(next)` in `lib/supabase/middleware.ts` enforces that redirects are strictly constrained to:
```typescript
const allowedRoutes = ["/student", "/tutor", "/admin"];
```
- Missing or null `next` defaults safely to `/`.
- External URLs (e.g. `https://example.com`), protocol-relative URLs (`//example.com`), backslash escapes (`\\evil.com`), or unknown paths are rejected and default to `/`.

Both Next.js middleware and the OAuth callback route (`app/auth/callback/route.ts`) execute this validation.

---

## 5. Server-Side Role Authorization & Admin Setup

### 5.1 Zero Frontend Role Escalation
In accordance with Phase 2A database architecture:
- Selecting *"I am a Student"* or *"I am a Tutor"* establishes only the entry context destination (`?next=...`). It does **not** alter or escalate their database role.
- There is **NO** frontend button, API route, or client-side flag to assign `ADMIN`.

### 5.2 Server-Side Authorization at `/admin`
When a user visits `/admin`:
1. Server verifies session with `await supabase.auth.getUser()`.
2. Server queries `public.users` table for `role`.
3. If `role !== 'ADMIN'`:
   - Returns a styled `403 Forbidden` / **Access Denied** screen.
   - Admin management components and data queries are never rendered.
4. If `role === 'ADMIN'`:
   - Renders the **Admin Portal Shell** (`Welcome, Admin`, `Admin Authorization Verified`).

### 5.3 Safe Admin Role Designation
To designate an administrator account, execute this command directly in the Supabase SQL Editor:
```sql
-- Secure Administrator Assignment (Run in Supabase Dashboard SQL Editor)
UPDATE public.users
SET role = 'ADMIN'
WHERE email = 'YOUR_ADMIN_EMAIL@gmail.com';
```

To revoke administrator privileges:
```sql
UPDATE public.users
SET role = 'USER'
WHERE email = 'YOUR_ADMIN_EMAIL@gmail.com';
```

---

## 6. Database Idempotency & Lifecycle

- `public.users` binds 1:1 with `auth.users(id)` via `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`.
- The database trigger `handle_new_auth_user()` uses `ON CONFLICT (id) DO UPDATE` to ensure repeated Google logins update profile information without creating duplicate rows.
- Deleting an identity in `auth.users` cascades to delete `public.users`, `public.students`, and `public.tutor_profiles`, while preserving `public.tutor_applications` with `user_id = NULL` for audit retention.

---

## 7. Troubleshooting & Common Errors

1. **`redirect_uri_mismatch` in Google OAuth**:
   - Cause: The redirect URI in Google Cloud Console does not match `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
   - Fix: Copy the exact callback URL from Supabase Dashboard -> Auth -> Providers -> Google into Google Cloud Console Authorized Redirect URIs.

2. **Invalid Origin / Cross-Origin error**:
   - Cause: Authorized JavaScript Origin in Google Cloud Console has trailing slashes or path wildcards (e.g. `http://localhost:3005/`).
   - Fix: Use strictly origin format without path: `http://localhost:3005`.

3. **User cancelled login / OAuth Access Denied**:
   - Cause: User closed the Google account selector or clicked Cancel.
   - Fix: The callback route intercepts `?error=access_denied`, sanitizes the `next` destination, and redirects to `/login` displaying a non-sensitive notification.
