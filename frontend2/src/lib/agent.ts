// Agent 호출 레이어. 기본값은 로컬 Python Agent API다.
// 개발 중 mock이 필요하면 VITE_AGENT_USE_MOCK=true 로 전환할 수 있다.

export type LessonReportInput = {
  student_id?: string;
  student_name: string;
  grade: string;
  subject: string;
  parent_name?: string;
  lesson_date?: string;
  lesson_memo: string;
};

export type LessonReportResult = {
  success: boolean;
  agent_type: "lesson_report";
  result: {
    progress: string;
    weakness: string;
    homework_status: string;
    next_plan: string;
    parent_report: string;
  };
};

export type PaymentReminderInput = {
  student_id?: string;
  student_name: string;
  grade?: string;
  subject?: string;
  parent_name: string;
  payment_status?: "paid" | "unpaid";
  amount: number;
  payment_due_date: string;
  class_count: number;
  next_class?: string;
};

export type PaymentReminderResult = {
  success: boolean;
  agent_type: "payment_reminder";
  result: {
    should_send: boolean;
    urgency: "low" | "normal" | "high";
    message_body: string;
  };
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generate_lesson_report_mock(
  input: LessonReportInput,
): Promise<LessonReportResult> {
  await delay(700);
  const memo = input.lesson_memo || "수업 진행";
  return {
    success: true,
    agent_type: "lesson_report",
    result: {
      progress: "지수함수 그래프 이동",
      weakness: "로그 개념, 계산 실수",
      homework_status: "15문제 중 9문제 완료",
      next_plan: "로그 기본 개념 복습 후 지수·로그 연결 문제 풀이",
      parent_report: `안녕하세요, ${input.student_name} 학부모님. 오늘 ${input.student_name} 학생은 ${input.subject || "수학"} 수업에서 지수함수 그래프 이동을 중심으로 학습했습니다. 수업 메모: "${memo}". 전반적으로 개념 이해는 안정적이나 로그 단원에서 계산 실수가 잦아 다음 시간에 보강 예정입니다. 숙제는 15문제 중 9문제를 완료했으며, 나머지는 다음 수업 전 마무리하도록 안내했습니다. 감사합니다.`,
    },
  };
}

export async function generate_payment_reminder_mock(
  input: PaymentReminderInput,
): Promise<PaymentReminderResult> {
  await delay(500);
  return {
    success: true,
    agent_type: "payment_reminder",
    result: {
      should_send: true,
      urgency: "normal",
      message_body: `안녕하세요, ${input.parent_name}. 다음 수업 준비 차 결제 안내드립니다. 이번 회차 수업료는 ${input.amount.toLocaleString()}원이며, 결제 예정일은 ${input.payment_due_date}입니다. 총 ${input.class_count}회 수업 기준입니다. 확인 부탁드리며, 문의사항 있으시면 편하게 말씀해 주세요. 감사합니다.`,
    },
  };
}

export type BuildMessageQueueInput = {
  tutor_id: string;
  student_id: string;
  message_type: "lesson_report" | "payment_reminder";
  message_body: string;
};

export type BuildMessageQueueResult = {
  success: boolean;
  agent_type: "message_queue";
  result: {
    messages: Array<{
      tutor_id: string;
      student_id: string;
      message_type: "lesson_report" | "payment_reminder";
      channel: "email_mock" | string;
      message_status: "pending";
      message_body: string;
    }>;
  };
};

const agent_api_base_url =
  import.meta.env.VITE_AGENT_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

const use_mock_agent = import.meta.env.VITE_AGENT_USE_MOCK === "true";

export async function build_message_queue_mock_local(input: BuildMessageQueueInput) {
  await delay(100);
  return {
    success: true,
    agent_type: "message_queue" as const,
    result: {
      messages: [
        {
          tutor_id: input.tutor_id,
          student_id: input.student_id,
          message_type: input.message_type,
          channel: "email_mock",
          message_status: "pending" as const,
          message_body: input.message_body,
        },
      ],
    },
  };
}

export async function call_agent_api<TPayload, TResult>(
  endpoint: string,
  payload: TPayload,
  fallback: () => Promise<TResult>,
) {
  if (use_mock_agent) return fallback();

  const response = await fetch(`${agent_api_base_url}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : {};
  if (!response.ok) {
    throw new Error(data.error || `Agent API request failed (${response.status})`);
  }
  return data as TResult;
}

export async function generate_lesson_report(input: LessonReportInput) {
  return call_agent_api("/lesson_report", input, () => generate_lesson_report_mock(input));
}

export async function generate_payment_reminder(input: PaymentReminderInput) {
  return call_agent_api("/payment_reminder", input, () => generate_payment_reminder_mock(input));
}

export async function build_message_queue(input: BuildMessageQueueInput) {
  return call_agent_api<BuildMessageQueueInput, BuildMessageQueueResult>(
    "/message_queue",
    input,
    () => build_message_queue_mock_local(input),
  );
}

export const build_message_queue_mock = build_message_queue;
