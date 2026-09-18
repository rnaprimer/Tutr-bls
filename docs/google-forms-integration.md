# Tutr — Google Forms & Google Apps Script Integration (Phase 4B)

## 1. Architecture Overview

Google Forms and its linked Google Sheet serve exclusively as the external application-intake interface for prospective tutors.
**Supabase PostgreSQL remains the single source of truth** for all application state, status transitions, review audit metadata, tutor verification, and marketplace visibility.

```text
Tutor (Applicant)
       │
       ▼ (Submits Google Form)
Google Sheet (Linked Responses)
       │
       ▼ (Installable onFormSubmit Trigger)
Google Apps Script (onFormSubmit)
       │
       ├── Reads Script Properties (TUTR_WEBHOOK_URL, TUTR_WEBHOOK_SECRET)
       ├── Resolves Deterministic google_response_id
       ├── Normalizes Arrays (subjects, classes, boards, documents)
       ├── Executes Retry Engine (3 attempts, backoff on 429/5xx, abort on 4xx)
       │
       ▼ POST /api/webhooks/google-forms (Header: x-tutr-webhook-secret)
Next.js Server-Side Webhook Handler
       │
       ├── Timing-Safe Secret Validation (crypto.timingSafeEqual)
       ├── Payload Validation & PII Protection
       ├── Idempotency Check (idx_tutor_applications_google_response_id)
       ├── Identity Linking (user_id if user exists; NULL if delayed)
       │
       ▼ (Stored Procedure: ingest_google_form_application)
Supabase PostgreSQL (public.tutor_applications)
```

---

## 2. Google Form Field Architecture & Mapping

### 2.1 Recommended Form Structure

| # | Question Title | Question Type | Options / Guidance |
| :-: | :--- | :--- | :--- |
| 1 | **Full Name** | Short answer | Full legal name |
| 2 | **Email Address** | Short answer | Google account email |
| 3 | **Phone Number** | Short answer | 10-digit mobile or WhatsApp number |
| 4 | **Preferred Locality** | Dropdown / Short answer | Balasore localities (e.g. Station Square, Sahadevkhunta, FM College Rd, Kuruda) |
| 5 | **Educational Qualification** | Short answer | Highest degree & institution (e.g. M.Sc Mathematics, FM University) |
| 6 | **Teaching Experience** | Paragraph | Summary of years and curricula taught |
| 7 | **Expected Fee** | Short answer | E.g. `₹500/hr` or `₹3,000/month` |
| 8 | **Weekly Availability** | Paragraph | E.g. `Mon-Fri 4 PM - 7 PM, Sat mornings` |
| 9 | **Subjects Taught** | Checkboxes (Multi-select) | Mathematics, Physics, Chemistry, Biology, English, Odia, Computer Science, Social Science, Science, Hindi |
| 10 | **Target Classes** | Checkboxes (Multi-select) | Class 1 through Class 12 |
| 11 | **Target Boards** | Checkboxes (Multi-select) | BSE Odisha, CHSE Odisha, CBSE, ICSE |
| 12 | **Certificates & Resume** | File Upload / Short answer | Google Drive upload of degrees / CV |

### 2.2 Header → Payload → Database Column Mapping

| Google Sheet Header (or Question Title) | Apps Script Payload Key | Supabase Column (`tutor_applications`) | Type | Ingestion Rule |
| :--- | :--- | :--- | :--- | :--- |
| *Form Response ID / Sheet Row Hash* | `google_response_id` | `google_response_id` | `TEXT` | **Required**. Unique index. |
| *Full Name* | `full_name` | `full_name` | `TEXT` | **Required**. 1-255 chars. |
| *Email Address* / *Email* | `email` | `email` | `TEXT` | **Required**. Lowercased & validated. |
| *Phone Number* / *Phone* | `phone` | `phone` | `TEXT` | Optional (max 50 chars). |
| *Preferred Locality* / *Location* | `location` | `location` | `TEXT` | Optional (max 500 chars). |
| *Educational Qualification* | `qualification` | `qualification` | `TEXT` | Optional (max 500 chars). |
| *Teaching Experience* | `experience` | `experience` | `TEXT` | Optional (max 1000 chars). |
| *Expected Fee* / *Fee* | `fee` | `fee` | `TEXT` | Optional (max 200 chars). |
| *Weekly Availability* | `availability` | `availability` | `TEXT` | Optional (max 500 chars). |
| *Subjects Taught* / *Subjects* | `subjects` | `subjects` | `JSONB` | Array of strings. |
| *Target Classes* / *Classes* | `classes` | `classes` | `JSONB` | Array of strings. |
| *Target Boards* / *Boards* | `boards` | `boards` | `JSONB` | Array of strings. |
| *Certificates & Resume* / *Documents*| `documents` | `documents` | `JSONB` | Array of Google Drive URLs. |

---

## 3. Production Google Apps Script

Install this script in the Google Sheet linked to the Google Form:

```javascript
/**
 * Tutr Tutor Application Webhook Ingestion Engine (Phase 4B)
 * Supported Trigger: Installable "On form submit" (Spreadsheet or Form)
 */

/**
 * Deterministically resolves or generates a stable google_response_id.
 * Guaranteed to produce the exact same ID across retries for the same submission.
 */
function resolveResponseId(e) {
  // Case A: Form Event Context (e.response available)
  if (e && e.response && typeof e.response.getId === "function") {
    return String(e.response.getId()).trim();
  }

  // Case B: Spreadsheet Event Context (e.namedValues + e.range)
  if (e && e.namedValues) {
    var ts = (e.namedValues["Timestamp"] && e.namedValues["Timestamp"][0]) || "";
    var email = (e.namedValues["Email Address"] && e.namedValues["Email Address"][0]) ||
                (e.namedValues["Email"] && e.namedValues["Email"][0]) || "";
    var row = (e.range && typeof e.range.getRow === "function") ? e.range.getRow() : "0";

    // Stable deterministic hash based on submission row, timestamp, and email
    var rawSeed = "sheet_row_" + row + "_" + ts.trim() + "_" + email.toLowerCase().trim();
    var hashBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, rawSeed);
    return "resp_sheet_" + row + "_" + Utilities.base64EncodeWebSafe(hashBytes).replace(/=+$/, "");
  }

  // Fallback if event is missing
  return "manual_" + new Date().getTime();
}

/**
 * Normalizes multi-select checkboxes or comma-separated values into clean string arrays.
 */
function extractArrayValues(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    var combined = [];
    for (var i = 0; i < raw.length; i++) {
      if (typeof raw[i] === "string") {
        var parts = raw[i].split(",");
        for (var j = 0; j < parts.length; j++) {
          var trimmed = parts[j].trim();
          if (trimmed.length > 0) combined.push(trimmed);
        }
      }
    }
    return combined;
  }
  if (typeof raw === "string") {
    var tokens = raw.split(",");
    var result = [];
    for (var k = 0; k < tokens.length; k++) {
      var item = tokens[k].trim();
      if (item.length > 0) result.push(item);
    }
    return result;
  }
  return [];
}

/**
 * Main Installable onFormSubmit Trigger Handler
 */
function onFormSubmit(e) {
  var props = PropertiesService.getScriptProperties();
  var webhookUrl = props.getProperty("TUTR_WEBHOOK_URL");
  var webhookSecret = props.getProperty("TUTR_WEBHOOK_SECRET");

  if (!webhookUrl || !webhookSecret) {
    console.error("[Tutr Ingestion Error] Missing TUTR_WEBHOOK_URL or TUTR_WEBHOOK_SECRET in Script Properties.");
    return;
  }

  var responseId = resolveResponseId(e);

  // Initialize standardized Phase 4A/4B payload
  var payload = {
    google_response_id: responseId,
    full_name: "",
    email: "",
    phone: "",
    location: "",
    qualification: "",
    experience: "",
    fee: "",
    availability: "",
    subjects: [],
    classes: [],
    boards: [],
    documents: []
  };

  // Extract from Google Form event (if present)
  if (e.response && typeof e.response.getItemResponses === "function") {
    payload.email = e.response.getRespondentEmail ? e.response.getRespondentEmail() : "";
    var items = e.response.getItemResponses();
    for (var i = 0; i < items.length; i++) {
      var title = items[i].getItem().getTitle().toLowerCase().trim();
      var val = items[i].getResponse();

      if (title.indexOf("name") !== -1) payload.full_name = String(val).trim();
      else if (title.indexOf("email") !== -1 && !payload.email) payload.email = String(val).trim();
      else if (title.indexOf("phone") !== -1 || title.indexOf("whatsapp") !== -1) payload.phone = String(val).trim();
      else if (title.indexOf("locality") !== -1 || title.indexOf("location") !== -1 || title.indexOf("address") !== -1) payload.location = String(val).trim();
      else if (title.indexOf("qualification") !== -1 || title.indexOf("degree") !== -1) payload.qualification = String(val).trim();
      else if (title.indexOf("experience") !== -1) payload.experience = String(val).trim();
      else if (title.indexOf("fee") !== -1 || title.indexOf("rate") !== -1) payload.fee = String(val).trim();
      else if (title.indexOf("availability") !== -1 || title.indexOf("time") !== -1) payload.availability = String(val).trim();
      else if (title.indexOf("subject") !== -1) payload.subjects = extractArrayValues(val);
      else if (title.indexOf("class") !== -1) payload.classes = extractArrayValues(val);
      else if (title.indexOf("board") !== -1) payload.boards = extractArrayValues(val);
      else if (title.indexOf("certificate") !== -1 || title.indexOf("cv") !== -1 || title.indexOf("document") !== -1 || title.indexOf("resume") !== -1) {
        payload.documents = extractArrayValues(val);
      }
    }
  }
  // Extract from Google Sheet event (e.namedValues)
  else if (e.namedValues) {
    for (var header in e.namedValues) {
      if (!e.namedValues.hasOwnProperty(header)) continue;
      var hLower = header.toLowerCase().trim();
      var valArr = e.namedValues[header];
      var valStr = (valArr && valArr.length > 0) ? String(valArr[0]).trim() : "";

      if (hLower.indexOf("name") !== -1) payload.full_name = valStr;
      else if (hLower.indexOf("email") !== -1 && !payload.email) payload.email = valStr;
      else if (hLower.indexOf("phone") !== -1 || hLower.indexOf("whatsapp") !== -1) payload.phone = valStr;
      else if (hLower.indexOf("locality") !== -1 || hLower.indexOf("location") !== -1 || hLower.indexOf("address") !== -1) payload.location = valStr;
      else if (hLower.indexOf("qualification") !== -1 || hLower.indexOf("degree") !== -1) payload.qualification = valStr;
      else if (hLower.indexOf("experience") !== -1) payload.experience = valStr;
      else if (hLower.indexOf("fee") !== -1 || hLower.indexOf("rate") !== -1) payload.fee = valStr;
      else if (hLower.indexOf("availability") !== -1 || hLower.indexOf("time") !== -1) payload.availability = valStr;
      else if (hLower.indexOf("subject") !== -1) payload.subjects = extractArrayValues(valArr);
      else if (hLower.indexOf("class") !== -1) payload.classes = extractArrayValues(valArr);
      else if (hLower.indexOf("board") !== -1) payload.boards = extractArrayValues(valArr);
      else if (hLower.indexOf("certificate") !== -1 || hLower.indexOf("cv") !== -1 || hLower.indexOf("document") !== -1 || hLower.indexOf("resume") !== -1) {
        payload.documents = extractArrayValues(valArr);
      }
    }
  }

  // Pre-transmission sanity check
  if (!payload.full_name || !payload.email) {
    console.error("[Tutr Ingestion Error] Missing mandatory fields (full_name or email) for response: " + responseId);
    return;
  }

  // Webhook Request Configuration
  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-tutr-webhook-secret": webhookSecret
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  // Retry Engine: Exactly 3 attempts with exponential backoff for transient failures
  var maxAttempts = 3;
  var backoffDelayMs = 1000; // 1s, then 2s

  for (var attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      var response = UrlFetchApp.fetch(webhookUrl, options);
      var statusCode = response.getResponseCode();

      // 1. Success (2xx)
      if (statusCode >= 200 && statusCode < 300) {
        console.log("[Tutr Ingestion] Success. Response ID: " + responseId + " on attempt " + attempt + " (Status: " + statusCode + ")");
        return;
      }

      // 2. Permanent client error (400 Bad Request, 401 Unauthorized, 413, 415) -> Abort immediately
      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        console.error("[Tutr Ingestion] Permanent rejection (Status: " + statusCode + "). Response ID: " + responseId + ". Aborting retries.");
        return;
      }

      // 3. Transient failure (429, 500, 502, 503, 504) -> Backoff and retry
      if (attempt < maxAttempts) {
        console.warn("[Tutr Ingestion] Transient error (Status: " + statusCode + ") on attempt " + attempt + ". Retrying in " + backoffDelayMs + "ms...");
        Utilities.sleep(backoffDelayMs);
        backoffDelayMs *= 2; // Exponential backoff: 1000ms -> 2000ms
      } else {
        console.error("[Tutr Ingestion] Exceeded max attempts (" + maxAttempts + "). Final Status: " + statusCode + " for response: " + responseId);
      }
    } catch (fetchErr) {
      if (attempt < maxAttempts) {
        console.warn("[Tutr Ingestion] Network exception on attempt " + attempt + ": " + fetchErr.toString() + ". Retrying...");
        Utilities.sleep(backoffDelayMs);
        backoffDelayMs *= 2;
      } else {
        console.error("[Tutr Ingestion] Network failure after " + maxAttempts + " attempts: " + fetchErr.toString());
      }
    }
  }
}
```

---

## 4. Script Properties Configuration

Configure in **Project Settings (⚙️)** -> **Script Properties**:

| Property | Value Description | Example |
| :--- | :--- | :--- |
| `TUTR_WEBHOOK_URL` | Publicly reachable HTTPS webhook endpoint | `https://tutr.in/api/webhooks/google-forms` |
| `TUTR_WEBHOOK_SECRET` | Secret matching `GOOGLE_FORMS_WEBHOOK_SECRET` | *32-byte hex secret from server .env.local* |

> [!CAUTION]
> - Never hardcode the webhook secret in Apps Script code.
> - Never store Supabase `service_role` or Google OAuth client secrets in Apps Script.
> - Never commit secrets to GitHub.

---

## 5. Installable Trigger Setup Checklist

1. Open linked Google Sheet -> **Extensions** -> **Apps Script**.
2. Paste the script from Section 3.
3. Save the project (`File` -> `Save`).
4. Click **Triggers (⏰)** in the left sidebar.
5. Click **+ Add Trigger** (bottom right):
   - **Choose which function to run**: `onFormSubmit`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `From spreadsheet`
   - **Select event type**: `On form submit`
   - **Failure notification settings**: `Notify me immediately`
6. Click **Save** and accept Google OAuth permissions.

---

## 6. Local Development Warning

> [!WARNING]
> Google Apps Script runs in Google's cloud infrastructure. It **cannot** connect directly to `http://localhost:3005` or `http://localhost:3000`.
> - For **local development testing**, use a publicly reachable tunnel (e.g. ngrok: `https://xyz.ngrok-free.app/api/webhooks/google-forms`) or run the automated Node.js simulation suite.
> - For **production/preview testing**, point `TUTR_WEBHOOK_URL` to your live Vercel deployment URL (`https://your-project.vercel.app/api/webhooks/google-forms`).

---

## 7. Security Controls Summary

1. **Intake-Only Interface**: Google Forms has zero authority over review state.
2. **Review Fields Shielded**: Callers cannot set `status`, `reviewed_at`, `reviewed_by`, `rejection_reason`, or `is_verified`.
3. **Idempotency**: Repeated delivery updates `PENDING` records without creating duplicate rows; `APPROVED` records are locked.
4. **Identity Linking**: Applications link automatically if user exists; unlinked applications link upon later Google signup.
5. **Anti-Hijacking**: Already-linked applications can never be reassigned.
