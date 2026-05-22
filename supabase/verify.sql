select 'tutors' as table_name, count(*) as row_count from public.tutors
union all select 'students', count(*) from public.students
union all select 'parent_invites', count(*) from public.parent_invites
union all select 'lesson_reports', count(*) from public.lesson_reports
union all select 'payments', count(*) from public.payments
union all select 'message_queue', count(*) from public.message_queue
union all select 'schedules', count(*) from public.schedules;

select
  s.name as student_name,
  lr.progress,
  p.payment_status,
  p.amount,
  count(mq.id) as message_count
from public.students s
join public.lesson_reports lr on lr.student_id = s.id
join public.payments p on p.student_id = s.id
left join public.message_queue mq on mq.student_id = s.id
group by s.name, lr.progress, p.payment_status, p.amount;
