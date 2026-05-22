# Supabase DB Handoff

## Project

- Project name: `solar-tutorboard`
- Project ref: `hwrgylwqgqjurkrdjtrd`
- Project URL: `https://hwrgylwqgqjurkrdjtrd.supabase.co`

## Frontend Environment

Use the publishable key from Supabase Dashboard > Project Settings > API Keys.

```env
VITE_SUPABASE_URL=https://hwrgylwqgqjurkrdjtrd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<paste_publishable_key_here>
```

Do not put the secret key, service role key, or database password in frontend code.

## Applied SQL

These files were applied in Supabase SQL Editor:

1. `supabase/schema.sql`
2. `supabase/seed.sql`
3. `supabase/demo_access.sql`

Verification query:

```text
supabase/verify.sql
```

Expected demo verification:

- `tutors`: 1 row
- `students`: 1 row
- `lesson_reports`: 1 row
- `payments`: 1 row
- `message_queue`: 2 rows
- `schedules`: 1 row
- Demo student: `김서윤`
- Payment status: `unpaid`
- Message count: `2`

## Tables

- `tutors`: tutor profile and communication style
- `students`: student and parent profile
- `lesson_reports`: AI lesson report result
- `payments`: payment status and next class info
- `message_queue`: final parent-facing messages
- `schedules`: tutor availability and schedule-change requests

## Frontend Read Examples

Fetch students for the teacher dashboard:

```ts
const { data, error } = await supabase
  .from("students")
  .select("*")
  .order("created_at", { ascending: false });
```

Fetch a student detail with latest reports:

```ts
const { data, error } = await supabase
  .from("students")
  .select(`
    *,
    lesson_reports(*),
    payments(*),
    message_queue(*),
    schedules(*)
  `)
  .eq("id", "22222222-2222-2222-2222-222222222222")
  .single();
```

Fetch pending parent messages:

```ts
const { data, error } = await supabase
  .from("message_queue")
  .select("*, students(name, parent_name, parent_contact)")
  .eq("status", "pending")
  .order("created_at", { ascending: false });
```

## Agent Write Targets

Agent teams should save generated outputs into these tables:

- `lesson_reports`: `progress`, `weakness`, `homework_status`, `next_plan`, `parent_report`
- `payments`: `payment_status`, `payment_due_date`, `amount`, `class_count`, `next_class`
- `message_queue`: `message_type`, `channel`, `status`, `message_body`

The current Agent output uses `message_status`; store that value in the DB column `status`.

For MVP demos, use:

- `tutor_id`: `11111111-1111-1111-1111-111111111111`
- `student_id`: `22222222-2222-2222-2222-222222222222`

## Security Note

Row Level Security is not enabled for the current demo tables so the frontend can connect quickly during the MVP build. `anon` and `authenticated` currently have demo read/write access through `supabase/demo_access.sql`. Before handling real student or parent data, enable RLS and replace this broad demo access with tutor/student-specific policies.
