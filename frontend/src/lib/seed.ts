import { supabase, DEMO_TUTOR_ID, DEMO_STUDENT_ID, DEMO_TUTOR } from "./supabase";

const ARCHIVE_TUTOR_ID = "99999999-9999-9999-9999-999999999999";
const ARCHIVE_STUDENT_ID = "99999999-9999-9999-9999-999999999998";

const DEMO_STUDENT_IDS = [
  DEMO_STUDENT_ID,
  "22222222-2222-2222-2222-222222222223",
  "22222222-2222-2222-2222-222222222224",
];

const DEMO_REPORT_IDS = [
  "33333333-3333-3333-3333-333333333333",
  "33333333-3333-3333-3333-333333333334",
  "33333333-3333-3333-3333-333333333335",
  "33333333-3333-3333-3333-333333333336",
  "33333333-3333-3333-3333-333333333337",
];

const DEMO_PAYMENT_IDS = [
  "44444444-4444-4444-4444-444444444444",
  "44444444-4444-4444-4444-444444444445",
  "44444444-4444-4444-4444-444444444446",
];

const DEMO_MESSAGE_IDS = [
  "55555555-5555-5555-5555-555555555551",
  "55555555-5555-5555-5555-555555555552",
  "55555555-5555-5555-5555-555555555553",
  "55555555-5555-5555-5555-555555555554",
  "55555555-5555-5555-5555-555555555555",
];

const DEMO_SCHEDULE_IDS = [
  "66666666-6666-6666-6666-666666666666",
  "66666666-6666-6666-6666-666666666667",
  "66666666-6666-6666-6666-666666666668",
];

export async function ensureDemoData() {
  await ensureArchiveTarget();
  await archiveGeneratedDemoRows();

  await run(
    "데모 선생님 초기화",
    supabase.from("tutors").upsert(
      {
        id: DEMO_TUTOR_ID,
        name: DEMO_TUTOR.name,
        subject: DEMO_TUTOR.subject,
        teaching_style: DEMO_TUTOR.teaching_style,
        payment_policy: DEMO_TUTOR.payment_policy,
        parent_tone: DEMO_TUTOR.parent_tone,
        created_at: "2026-05-23T01:00:00+09:00",
      },
      { onConflict: "id" },
    ),
  );

  await run(
    "데모 학생 초기화",
    supabase.from("students").upsert(
      [
        {
          id: DEMO_STUDENT_ID,
          tutor_id: DEMO_TUTOR_ID,
          name: "김서윤",
          grade: "고1",
          subject: "수학",
          parent_name: "김서윤 학부모님",
          parent_contact: "parent@example.com",
          created_at: "2026-05-23T01:00:00+09:00",
        },
        {
          id: "22222222-2222-2222-2222-222222222223",
          tutor_id: DEMO_TUTOR_ID,
          name: "박민준",
          grade: "중2",
          subject: "영어",
          parent_name: "박민준 학부모님",
          parent_contact: "minjun.parent@example.com",
          created_at: "2026-05-23T01:00:00+09:00",
        },
        {
          id: "22222222-2222-2222-2222-222222222224",
          tutor_id: DEMO_TUTOR_ID,
          name: "이하린",
          grade: "고2",
          subject: "수학",
          parent_name: "이하린 학부모님",
          parent_contact: "harin.parent@example.com",
          created_at: "2026-05-23T01:00:00+09:00",
        },
      ],
      { onConflict: "id" },
    ),
  );

  await run(
    "데모 수업 리포트 초기화",
    supabase.from("lesson_reports").upsert(
      [
        {
          id: "33333333-3333-3333-3333-333333333333",
          tutor_id: DEMO_TUTOR_ID,
          student_id: DEMO_STUDENT_ID,
          lesson_memo:
            "오늘 지수함수 그래프 이동 수업. 로그 개념 헷갈려함. 숙제 15문제 중 9문제 완료. 계산 실수 많음.",
          progress: "지수함수 그래프 이동",
          weakness: "로그 개념, 계산 실수",
          homework_status: "15문제 중 9문제 완료",
          next_plan: "로그 기본 개념 복습 후 지수·로그 연결 문제 풀이",
          parent_report:
            "안녕하세요. 오늘 김서윤 학생은 지수함수 그래프 이동 내용을 중심으로 수업했습니다. 수업 중에는 로그 개념, 계산 실수 부분을 조금 더 점검할 필요가 있었습니다. 숙제는 15문제 중 9문제 완료 상태로 확인했습니다. 다음 수업에서는 로그 기본 개념 복습 후 지수·로그 연결 문제 풀이 방향으로 이어가겠습니다.",
          created_at: "2026-05-23T01:05:00+09:00",
        },
        {
          id: "33333333-3333-3333-3333-333333333334",
          tutor_id: DEMO_TUTOR_ID,
          student_id: DEMO_STUDENT_ID,
          lesson_memo:
            "오늘 로그 기본 개념 복습 수업. 로그의 정의와 지수와의 관계를 헷갈려함. 숙제 15문제 중 11문제 완료.",
          progress: "로그 기본 개념 복습",
          weakness: "로그 정의, 지수와 로그 관계",
          homework_status: "15문제 중 11문제 완료",
          next_plan: "지수함수 그래프 이동과 로그 계산 연습",
          parent_report:
            "안녕하세요. 오늘 김서윤 학생은 로그의 기본 개념과 지수와의 관계를 중심으로 복습했습니다. 계산 과정은 전보다 안정적이었지만 로그의 정의를 적용하는 문제에서 아직 헷갈리는 부분이 있었습니다. 숙제는 15문제 중 11문제를 완료했습니다. 다음 수업에서는 지수함수 그래프 이동과 로그 계산을 함께 연결해 연습하겠습니다.",
          created_at: "2026-05-16T19:50:00+09:00",
        },
        {
          id: "33333333-3333-3333-3333-333333333335",
          tutor_id: DEMO_TUTOR_ID,
          student_id: DEMO_STUDENT_ID,
          lesson_memo:
            "오늘 지수함수 기본 개념 수업. 그래프 이동과 부호 처리에서 실수가 있었음. 숙제 12문제 중 8문제 완료.",
          progress: "지수함수 기본 개념 이해",
          weakness: "그래프 이동, 부호 처리",
          homework_status: "12문제 중 8문제 완료",
          next_plan: "로그 기본 개념 도입과 지수·로그 연결",
          parent_report:
            "안녕하세요. 오늘 김서윤 학생은 지수함수의 기본 개념과 그래프 형태를 중심으로 학습했습니다. 전반적인 개념 이해는 가능했지만 그래프를 이동할 때 부호를 처리하는 과정에서 실수가 있었습니다. 숙제는 12문제 중 8문제를 완료했습니다. 다음 수업에서는 로그 기본 개념을 도입하고 지수와 로그의 연결 관계를 정리하겠습니다.",
          created_at: "2026-05-09T19:50:00+09:00",
        },
        {
          id: "33333333-3333-3333-3333-333333333336",
          tutor_id: DEMO_TUTOR_ID,
          student_id: "22222222-2222-2222-2222-222222222223",
          lesson_memo:
            "오늘 관계대명사 독해 수업. 문장 구조는 안정적이나 단어 암기가 부족함. 숙제는 모두 완료.",
          progress: "관계대명사 독해",
          weakness: "어휘 암기, 긴 문장 해석 속도",
          homework_status: "숙제 모두 완료",
          next_plan: "관계대명사 복합 문장 독해와 필수 단어 복습",
          parent_report:
            "안녕하세요. 오늘 박민준 학생은 관계대명사가 포함된 긴 문장을 중심으로 독해 수업을 진행했습니다. 문장 구조 파악은 안정적이었고 숙제도 잘 완료했습니다. 다만 어휘 암기가 조금 더 보강되면 해석 속도가 좋아질 것으로 보입니다. 다음 수업에서는 관계대명사 복합 문장 독해와 필수 단어 복습을 함께 진행하겠습니다.",
          created_at: "2026-05-23T01:07:00+09:00",
        },
        {
          id: "33333333-3333-3333-3333-333333333337",
          tutor_id: DEMO_TUTOR_ID,
          student_id: "22222222-2222-2222-2222-222222222224",
          lesson_memo:
            "오늘 수열 점화식 수업. 점화식 변형을 어려워함. 숙제 12문제 중 7문제 완료. 계산 실수 있음.",
          progress: "수열 점화식",
          weakness: "점화식 변형, 계산 실수",
          homework_status: "12문제 중 7문제 완료",
          next_plan: "기본 점화식 유형 복습 후 응용 문제 풀이",
          parent_report:
            "안녕하세요. 오늘 이하린 학생은 수열의 점화식 유형을 중심으로 수업했습니다. 기본 개념은 따라오고 있으나 점화식을 변형하는 과정에서 어려움이 있어 추가 연습이 필요합니다. 숙제는 12문제 중 7문제를 완료했고 계산 실수도 일부 확인되었습니다. 다음 수업에서는 기본 점화식 유형을 다시 정리한 뒤 응용 문제로 이어가겠습니다.",
          created_at: "2026-05-23T01:09:00+09:00",
        },
      ],
      { onConflict: "id" },
    ),
  );

  await run(
    "데모 결제 초기화",
    supabase.from("payments").upsert(
      [
        {
          id: "44444444-4444-4444-4444-444444444444",
          tutor_id: DEMO_TUTOR_ID,
          student_id: DEMO_STUDENT_ID,
          payment_status: "unpaid",
          payment_due_date: "2026-05-24",
          amount: 320000,
          class_count: 4,
          next_class: "2026-05-24T19:00:00+09:00",
          created_at: "2026-05-23T01:00:00+09:00",
        },
        {
          id: "44444444-4444-4444-4444-444444444445",
          tutor_id: DEMO_TUTOR_ID,
          student_id: "22222222-2222-2222-2222-222222222223",
          payment_status: "paid",
          payment_due_date: "2026-05-25",
          amount: 280000,
          class_count: 4,
          next_class: "2026-05-25T18:00:00+09:00",
          created_at: "2026-05-23T01:00:00+09:00",
        },
        {
          id: "44444444-4444-4444-4444-444444444446",
          tutor_id: DEMO_TUTOR_ID,
          student_id: "22222222-2222-2222-2222-222222222224",
          payment_status: "unpaid",
          payment_due_date: "2026-05-26",
          amount: 360000,
          class_count: 4,
          next_class: "2026-05-26T20:00:00+09:00",
          created_at: "2026-05-23T01:00:00+09:00",
        },
      ],
      { onConflict: "id" },
    ),
  );

  await run(
    "데모 메시지 초기화",
    supabase.from("message_queue").upsert(
      [
        {
          id: "55555555-5555-5555-5555-555555555551",
          tutor_id: DEMO_TUTOR_ID,
          student_id: DEMO_STUDENT_ID,
          message_type: "lesson_report",
          channel: "email_mock",
          message_status: "pending",
          message_body:
            "안녕하세요. 오늘 김서윤 학생은 지수함수 그래프 이동 내용을 중심으로 수업했습니다. 수업 중에는 로그 개념, 계산 실수 부분을 조금 더 점검할 필요가 있었습니다. 숙제는 15문제 중 9문제 완료 상태로 확인했습니다. 다음 수업에서는 로그 기본 개념 복습 후 지수·로그 연결 문제 풀이 방향으로 이어가겠습니다.",
          created_at: "2026-05-23T01:06:00+09:00",
        },
        {
          id: "55555555-5555-5555-5555-555555555552",
          tutor_id: DEMO_TUTOR_ID,
          student_id: DEMO_STUDENT_ID,
          message_type: "payment_reminder",
          channel: "email_mock",
          message_status: "pending",
          message_body:
            "안녕하세요, 김서윤 학부모님. 김서윤 학생의 다음 수업이 2026-05-24 19:00에 예정되어 있어 수업 준비 차 안내드립니다. 이번 4회차 수업료는 320,000원이며, 결제 예정일은 2026-05-24입니다. 확인 가능하실 때 편하게 처리 부탁드립니다.",
          created_at: "2026-05-23T01:06:00+09:00",
        },
        {
          id: "55555555-5555-5555-5555-555555555553",
          tutor_id: DEMO_TUTOR_ID,
          student_id: "22222222-2222-2222-2222-222222222223",
          message_type: "lesson_report",
          channel: "email_mock",
          message_status: "pending",
          message_body:
            "안녕하세요. 오늘 박민준 학생은 관계대명사가 포함된 긴 문장을 중심으로 독해 수업을 진행했습니다. 문장 구조 파악은 안정적이었고 숙제도 잘 완료했습니다. 다만 어휘 암기가 조금 더 보강되면 해석 속도가 좋아질 것으로 보입니다. 다음 수업에서는 관계대명사 복합 문장 독해와 필수 단어 복습을 함께 진행하겠습니다.",
          created_at: "2026-05-23T01:08:00+09:00",
        },
        {
          id: "55555555-5555-5555-5555-555555555554",
          tutor_id: DEMO_TUTOR_ID,
          student_id: "22222222-2222-2222-2222-222222222224",
          message_type: "lesson_report",
          channel: "email_mock",
          message_status: "pending",
          message_body:
            "안녕하세요. 오늘 이하린 학생은 수열의 점화식 유형을 중심으로 수업했습니다. 기본 개념은 따라오고 있으나 점화식을 변형하는 과정에서 어려움이 있어 추가 연습이 필요합니다. 숙제는 12문제 중 7문제를 완료했고 계산 실수도 일부 확인되었습니다. 다음 수업에서는 기본 점화식 유형을 다시 정리한 뒤 응용 문제로 이어가겠습니다.",
          created_at: "2026-05-23T01:10:00+09:00",
        },
        {
          id: "55555555-5555-5555-5555-555555555555",
          tutor_id: DEMO_TUTOR_ID,
          student_id: "22222222-2222-2222-2222-222222222224",
          message_type: "payment_reminder",
          channel: "email_mock",
          message_status: "pending",
          message_body:
            "안녕하세요, 이하린 학부모님. 이하린 학생의 다음 수업이 2026-05-26 20:00에 예정되어 있어 수업 준비 차 안내드립니다. 이번 4회차 수업료는 360,000원이며, 결제 예정일은 2026-05-26입니다. 확인 가능하실 때 편하게 처리 부탁드립니다.",
          created_at: "2026-05-23T01:10:00+09:00",
        },
      ],
      { onConflict: "id" },
    ),
  );

  await run(
    "데모 일정 초기화",
    supabase.from("schedules").upsert(
      [
        {
          id: "66666666-6666-6666-6666-666666666666",
          tutor_id: DEMO_TUTOR_ID,
          student_id: DEMO_STUDENT_ID,
          available_time: "2026-05-24T19:00:00+09:00",
          requested_time: null,
          status: "available",
          created_at: "2026-05-23T01:00:00+09:00",
        },
        {
          id: "66666666-6666-6666-6666-666666666667",
          tutor_id: DEMO_TUTOR_ID,
          student_id: "22222222-2222-2222-2222-222222222223",
          available_time: "2026-05-25T18:00:00+09:00",
          requested_time: null,
          status: "available",
          created_at: "2026-05-23T01:00:00+09:00",
        },
        {
          id: "66666666-6666-6666-6666-666666666668",
          tutor_id: DEMO_TUTOR_ID,
          student_id: "22222222-2222-2222-2222-222222222224",
          available_time: "2026-05-26T20:00:00+09:00",
          requested_time: "2026-05-27T20:00:00+09:00",
          status: "requested",
          created_at: "2026-05-23T01:00:00+09:00",
        },
      ],
      { onConflict: "id" },
    ),
  );
}

async function ensureArchiveTarget() {
  await run(
    "숨김 선생님 준비",
    supabase.from("tutors").upsert(
      {
        id: ARCHIVE_TUTOR_ID,
        name: "데모 초기화 보관함",
        subject: "archive",
        teaching_style: "archive",
        payment_policy: "archive",
        parent_tone: "archive",
      },
      { onConflict: "id" },
    ),
  );

  await run(
    "숨김 학생 준비",
    supabase.from("students").upsert(
      {
        id: ARCHIVE_STUDENT_ID,
        tutor_id: ARCHIVE_TUTOR_ID,
        name: "초기화된 데모 데이터",
        grade: "archive",
        subject: "archive",
        parent_name: "archive",
        parent_contact: "",
      },
      { onConflict: "id" },
    ),
  );
}

async function archiveGeneratedDemoRows() {
  await archiveChildRows("lesson_reports", DEMO_REPORT_IDS);
  await archiveChildRows("payments", DEMO_PAYMENT_IDS);
  await archiveChildRows("message_queue", DEMO_MESSAGE_IDS);
  await archiveChildRows("schedules", DEMO_SCHEDULE_IDS);

  await run(
    "추가 학생 숨김 처리",
    supabase
      .from("students")
      .update({ tutor_id: ARCHIVE_TUTOR_ID })
      .eq("tutor_id", DEMO_TUTOR_ID)
      .not("id", "in", inFilter(DEMO_STUDENT_IDS)),
  );
}

async function archiveChildRows(table: string, seedIds: string[]) {
  await run(
    `${table} 추가 데이터 숨김 처리`,
    supabase
      .from(table)
      .update({
        tutor_id: ARCHIVE_TUTOR_ID,
        student_id: ARCHIVE_STUDENT_ID,
      })
      .eq("tutor_id", DEMO_TUTOR_ID)
      .not("id", "in", inFilter(seedIds)),
  );
}

function inFilter(ids: string[]) {
  return `(${ids.join(",")})`;
}

async function run(label: string, query: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
}
