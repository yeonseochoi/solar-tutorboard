do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'message_queue'
      and column_name = 'status'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'message_queue'
      and column_name = 'message_status'
  ) then
    alter table public.message_queue rename column status to message_status;
  end if;
end $$;

alter table public.message_queue
  drop constraint if exists message_queue_status_check;

alter table public.message_queue
  drop constraint if exists message_queue_message_status_check;

alter table public.message_queue
  add constraint message_queue_message_status_check
  check (message_status in ('pending', 'sent'));

drop index if exists public.message_queue_student_id_status_idx;

create index if not exists message_queue_student_id_status_idx
  on public.message_queue(student_id, message_status);

