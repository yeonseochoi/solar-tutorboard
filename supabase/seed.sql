insert into public.tutors (
  id,
  name,
  subject,
  teaching_style,
  payment_policy,
  parent_tone,
  created_at
) values (
  '11111111-1111-1111-1111-111111111111',
  '데모 선생님',
  '고등 수학',
  '꼼꼼하게 개념을 잡아주는 스타일',
  '월 4회 선결제',
  '정중하지만 부담스럽지 않게',
  '2026-05-23T01:00:00+09:00'
) on conflict (id) do update set
  name = excluded.name,
  subject = excluded.subject,
  teaching_style = excluded.teaching_style,
  payment_policy = excluded.payment_policy,
  parent_tone = excluded.parent_tone,
  created_at = excluded.created_at;

insert into public.students (
  id,
  tutor_id,
  name,
  grade,
  subject,
  parent_name,
  parent_contact,
  created_at
) values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  '김서윤',
  '고1',
  '수학',
  '김서윤 학부모님',
  'parent@example.com',
  '2026-05-23T01:00:00+09:00'
) on conflict (id) do update set
  tutor_id = excluded.tutor_id,
  name = excluded.name,
  grade = excluded.grade,
  subject = excluded.subject,
  parent_name = excluded.parent_name,
  parent_contact = excluded.parent_contact,
  created_at = excluded.created_at;

insert into public.lesson_reports (
  id,
  tutor_id,
  student_id,
  lesson_memo,
  progress,
  weakness,
  homework_status,
  next_plan,
  parent_report,
  created_at
) values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '오늘 지수함수 그래프 이동 수업. 로그 개념 헷갈려함. 숙제 15문제 중 9문제 완료. 계산 실수 많음.',
  '지수함수 그래프 이동',
  '로그 개념, 계산 실수',
  '15문제 중 9문제 완료',
  '로그 기본 개념 복습 후 지수·로그 연결 문제 풀이',
  '안녕하세요. 오늘 김서윤 학생은 지수함수 그래프 이동 내용을 중심으로 수업했습니다. 수업 중에는 로그 개념, 계산 실수 부분을 조금 더 점검할 필요가 있었습니다. 숙제는 15문제 중 9문제 완료 상태로 확인했습니다. 다음 수업에서는 로그 기본 개념 복습 후 지수·로그 연결 문제 풀이 방향으로 이어가겠습니다.',
  '2026-05-23T01:05:00+09:00'
) on conflict (id) do update set
  tutor_id = excluded.tutor_id,
  student_id = excluded.student_id,
  lesson_memo = excluded.lesson_memo,
  progress = excluded.progress,
  weakness = excluded.weakness,
  homework_status = excluded.homework_status,
  next_plan = excluded.next_plan,
  parent_report = excluded.parent_report,
  created_at = excluded.created_at;

insert into public.payments (
  id,
  tutor_id,
  student_id,
  payment_status,
  payment_due_date,
  amount,
  class_count,
  next_class,
  created_at
) values (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'unpaid',
  '2026-05-24',
  320000,
  4,
  '2026-05-24T19:00:00+09:00',
  '2026-05-23T01:00:00+09:00'
) on conflict (id) do update set
  tutor_id = excluded.tutor_id,
  student_id = excluded.student_id,
  payment_status = excluded.payment_status,
  payment_due_date = excluded.payment_due_date,
  amount = excluded.amount,
  class_count = excluded.class_count,
  next_class = excluded.next_class,
  created_at = excluded.created_at;

insert into public.message_queue (
  id,
  tutor_id,
  student_id,
  message_type,
  channel,
  status,
  message_body,
  created_at
) values
(
  '55555555-5555-5555-5555-555555555551',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'lesson_report',
  'email_mock',
  'pending',
  '안녕하세요. 오늘 김서윤 학생은 지수함수 그래프 이동 내용을 중심으로 수업했습니다. 수업 중에는 로그 개념, 계산 실수 부분을 조금 더 점검할 필요가 있었습니다. 숙제는 15문제 중 9문제 완료 상태로 확인했습니다. 다음 수업에서는 로그 기본 개념 복습 후 지수·로그 연결 문제 풀이 방향으로 이어가겠습니다.',
  '2026-05-23T01:06:00+09:00'
),
(
  '55555555-5555-5555-5555-555555555552',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'payment_reminder',
  'email_mock',
  'pending',
  '안녕하세요, 김서윤 학부모님. 김서윤 학생의 다음 수업이 2026-05-24 19:00에 예정되어 있어 수업 준비 차 안내드립니다. 이번 4회차 수업료는 320,000원이며, 결제 예정일은 2026-05-24입니다. 확인 가능하실 때 편하게 처리 부탁드립니다.',
  '2026-05-23T01:06:00+09:00'
) on conflict (id) do update set
  tutor_id = excluded.tutor_id,
  student_id = excluded.student_id,
  message_type = excluded.message_type,
  channel = excluded.channel,
  status = excluded.status,
  message_body = excluded.message_body,
  created_at = excluded.created_at;

insert into public.schedules (
  id,
  tutor_id,
  student_id,
  available_time,
  requested_time,
  status,
  created_at
) values (
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '2026-05-24T19:00:00+09:00',
  null,
  'available',
  '2026-05-23T01:00:00+09:00'
) on conflict (id) do update set
  tutor_id = excluded.tutor_id,
  student_id = excluded.student_id,
  available_time = excluded.available_time,
  requested_time = excluded.requested_time,
  status = excluded.status,
  created_at = excluded.created_at;
