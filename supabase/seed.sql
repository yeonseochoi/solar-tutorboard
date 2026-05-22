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
  message_status,
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
  message_status = excluded.message_status,
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

insert into public.students (
  id,
  tutor_id,
  name,
  grade,
  subject,
  parent_name,
  parent_contact,
  created_at
) values
(
  '22222222-2222-2222-2222-222222222223',
  '11111111-1111-1111-1111-111111111111',
  '박민준',
  '중2',
  '영어',
  '박민준 학부모님',
  'minjun.parent@example.com',
  '2026-05-23T01:00:00+09:00'
),
(
  '22222222-2222-2222-2222-222222222224',
  '11111111-1111-1111-1111-111111111111',
  '이하린',
  '고2',
  '수학',
  '이하린 학부모님',
  'harin.parent@example.com',
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
) values
(
  '33333333-3333-3333-3333-333333333334',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222223',
  '오늘 관계대명사 독해 수업. 문장 구조는 안정적이나 단어 암기가 부족함. 숙제는 모두 완료.',
  '관계대명사 독해',
  '어휘 암기, 긴 문장 해석 속도',
  '숙제 모두 완료',
  '관계대명사 복합 문장 독해와 필수 단어 복습',
  '안녕하세요. 오늘 박민준 학생은 관계대명사가 포함된 긴 문장을 중심으로 독해 수업을 진행했습니다. 문장 구조 파악은 안정적이었고 숙제도 잘 완료했습니다. 다만 어휘 암기가 조금 더 보강되면 해석 속도가 좋아질 것으로 보입니다. 다음 수업에서는 관계대명사 복합 문장 독해와 필수 단어 복습을 함께 진행하겠습니다.',
  '2026-05-23T01:07:00+09:00'
),
(
  '33333333-3333-3333-3333-333333333335',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222224',
  '오늘 수열 점화식 수업. 점화식 변형을 어려워함. 숙제 12문제 중 7문제 완료. 계산 실수 있음.',
  '수열 점화식',
  '점화식 변형, 계산 실수',
  '12문제 중 7문제 완료',
  '기본 점화식 유형 복습 후 응용 문제 풀이',
  '안녕하세요. 오늘 이하린 학생은 수열의 점화식 유형을 중심으로 수업했습니다. 기본 개념은 따라오고 있으나 점화식을 변형하는 과정에서 어려움이 있어 추가 연습이 필요합니다. 숙제는 12문제 중 7문제를 완료했고 계산 실수도 일부 확인되었습니다. 다음 수업에서는 기본 점화식 유형을 다시 정리한 뒤 응용 문제로 이어가겠습니다.',
  '2026-05-23T01:09:00+09:00'
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
) values
(
  '44444444-4444-4444-4444-444444444445',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222223',
  'paid',
  '2026-05-25',
  280000,
  4,
  '2026-05-25T18:00:00+09:00',
  '2026-05-23T01:00:00+09:00'
),
(
  '44444444-4444-4444-4444-444444444446',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222224',
  'unpaid',
  '2026-05-26',
  360000,
  4,
  '2026-05-26T20:00:00+09:00',
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
  message_status,
  message_body,
  created_at
) values
(
  '55555555-5555-5555-5555-555555555553',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222223',
  'lesson_report',
  'email_mock',
  'pending',
  '안녕하세요. 오늘 박민준 학생은 관계대명사가 포함된 긴 문장을 중심으로 독해 수업을 진행했습니다. 문장 구조 파악은 안정적이었고 숙제도 잘 완료했습니다. 다만 어휘 암기가 조금 더 보강되면 해석 속도가 좋아질 것으로 보입니다. 다음 수업에서는 관계대명사 복합 문장 독해와 필수 단어 복습을 함께 진행하겠습니다.',
  '2026-05-23T01:08:00+09:00'
),
(
  '55555555-5555-5555-5555-555555555554',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222224',
  'lesson_report',
  'email_mock',
  'pending',
  '안녕하세요. 오늘 이하린 학생은 수열의 점화식 유형을 중심으로 수업했습니다. 기본 개념은 따라오고 있으나 점화식을 변형하는 과정에서 어려움이 있어 추가 연습이 필요합니다. 숙제는 12문제 중 7문제를 완료했고 계산 실수도 일부 확인되었습니다. 다음 수업에서는 기본 점화식 유형을 다시 정리한 뒤 응용 문제로 이어가겠습니다.',
  '2026-05-23T01:10:00+09:00'
),
(
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222224',
  'payment_reminder',
  'email_mock',
  'pending',
  '안녕하세요, 이하린 학부모님. 이하린 학생의 다음 수업이 2026-05-26 20:00에 예정되어 있어 수업 준비 차 안내드립니다. 이번 4회차 수업료는 360,000원이며, 결제 예정일은 2026-05-26입니다. 확인 가능하실 때 편하게 처리 부탁드립니다.',
  '2026-05-23T01:10:00+09:00'
) on conflict (id) do update set
  tutor_id = excluded.tutor_id,
  student_id = excluded.student_id,
  message_type = excluded.message_type,
  channel = excluded.channel,
  message_status = excluded.message_status,
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
) values
(
  '66666666-6666-6666-6666-666666666667',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222223',
  '2026-05-25T18:00:00+09:00',
  null,
  'available',
  '2026-05-23T01:00:00+09:00'
),
(
  '66666666-6666-6666-6666-666666666668',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222224',
  '2026-05-26T20:00:00+09:00',
  '2026-05-27T20:00:00+09:00',
  'requested',
  '2026-05-23T01:00:00+09:00'
) on conflict (id) do update set
  tutor_id = excluded.tutor_id,
  student_id = excluded.student_id,
  available_time = excluded.available_time,
  requested_time = excluded.requested_time,
  status = excluded.status,
  created_at = excluded.created_at;
