create extension if not exists pgcrypto;

create table if not exists public.tutors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  teaching_style text not null,
  payment_policy text not null,
  parent_tone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  name text not null,
  grade text not null,
  subject text not null,
  parent_name text not null,
  parent_contact text,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_reports (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_memo text not null,
  progress text not null,
  weakness text not null,
  homework_status text not null,
  next_plan text not null,
  parent_report text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  payment_status text not null check (payment_status in ('paid', 'unpaid')),
  payment_due_date date not null,
  amount integer not null check (amount >= 0),
  class_count integer not null check (class_count > 0),
  next_class timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.message_queue (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  message_type text not null check (message_type in ('lesson_report', 'payment_reminder')),
  channel text not null,
  status text not null check (status in ('pending', 'sent', 'skipped')),
  message_body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  available_time timestamptz,
  requested_time timestamptz,
  status text not null check (status in ('available', 'requested', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists students_tutor_id_idx on public.students(tutor_id);
create index if not exists lesson_reports_student_id_created_at_idx on public.lesson_reports(student_id, created_at desc);
create index if not exists payments_student_id_due_date_idx on public.payments(student_id, payment_due_date);
create index if not exists message_queue_student_id_status_idx on public.message_queue(student_id, status);
create index if not exists schedules_student_id_status_idx on public.schedules(student_id, status);
