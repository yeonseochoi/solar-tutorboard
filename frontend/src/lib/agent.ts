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

export type ScheduleCoordinationInput = {
  student_id?: string;
  student_name: string;
  grade?: string;
  subject?: string;
  parent_name: string;
  schedule_id: string;
  available_times: string[];
  requested_time: string;
  current_status: "available" | "requested" | "approved" | "rejected" | "cancelled";
};

export type ScheduleCoordinationResult = {
  success: boolean;
  agent_type: "schedule_coordination";
  result: {
    should_update: boolean;
    recommended_status: "available" | "requested" | "approved" | "rejected" | "cancelled";
    matched_time: string;
    reason: string;
    message_body: string;
  };
};

export type MessageType = "lesson_report" | "payment_reminder" | "schedule_coordination";

export type BuildMessageQueueInput = {
  tutor_id: string;
  student_id: string;
  message_type: MessageType;
  message_body: string;
};

export type BuildMessageQueueResult = {
  success: boolean;
  agent_type: "message_queue";
  result: {
    messages: Array<{
      tutor_id: string;
      student_id: string;
      message_type: MessageType;
      channel: "email_mock" | string;
      message_status: "pending";
      message_body: string;
    }>;
  };
};

const agent_api_base_url =
  import.meta.env.VITE_AGENT_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

const use_mock_agent = import.meta.env.VITE_AGENT_USE_MOCK === "true";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      next_plan: "로그 기본 개념 복습 후 지수와 로그 연결 문제 풀이",
      parent_report: `안녕하세요. 오늘 ${input.student_name} 학생은 ${input.subject || "수학"} 수업에서 지수함수 그래프 이동을 중심으로 학습했습니다. 수업 메모: "${memo}". 로그 개념과 계산 과정은 다음 시간에 다시 점검하겠습니다.`,
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
      should_send: input.payment_status !== "paid",
      urgency: "normal",
      message_body:
        input.payment_status === "paid"
          ? ""
          : `안녕하세요, ${input.parent_name}. 다음 수업 준비 차 결제 안내드립니다. 이번 ${input.class_count}회차 수업료는 ${input.amount.toLocaleString()}원이며, 결제 예정일은 ${input.payment_due_date}입니다.`,
    },
  };
}

export async function coordinate_schedule_mock(
  input: ScheduleCoordinationInput,
): Promise<ScheduleCoordinationResult> {
  await delay(400);
  const requested = normalize_time(input.requested_time);
  const available = input.available_times.map(normalize_time);
  const matched_time = available.includes(requested) ? requested : "";
  const approved = Boolean(matched_time);
  return {
    success: true,
    agent_type: "schedule_coordination",
    result: {
      should_update: true,
      recommended_status: approved ? "approved" : "rejected",
      matched_time,
      reason: approved
        ? "요청 시간이 선생님의 가능 시간과 일치합니다."
        : "요청 시간이 현재 등록된 가능 시간과 일치하지 않습니다.",
      message_body: approved
        ? `안녕하세요, ${input.parent_name}. 요청해주신 ${matched_time} 일정으로 수업 변경이 가능합니다. 해당 시간으로 반영해두겠습니다.`
        : `안녕하세요, ${input.parent_name}. 요청해주신 ${requested} 일정은 현재 조율이 어렵습니다. 다른 가능한 시간을 선택해주시면 확인하겠습니다.`,
    },
  };
}

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

export async function generate_lesson_report(input: LessonReportInput) {
  return call_agent_api("/lesson_report", input, () => generate_lesson_report_mock(input));
}

export async function generate_payment_reminder(input: PaymentReminderInput) {
  return call_agent_api("/payment_reminder", input, () => generate_payment_reminder_mock(input));
}

export async function coordinate_schedule(input: ScheduleCoordinationInput) {
  return call_agent_api("/schedule_coordination", input, () => coordinate_schedule_mock(input));
}

export async function build_message_queue(input: BuildMessageQueueInput) {
  return call_agent_api<BuildMessageQueueInput, BuildMessageQueueResult>(
    "/message_queue",
    input,
    () => build_message_queue_mock_local(input),
  );
}

export const build_message_queue_mock = build_message_queue;

function normalize_time(value: string) {
  if (!value) return "";
  if (value.includes("T")) {
    const [date, time] = value.split("T");
    return `${date} ${time.slice(0, 5)}`;
  }
  return value.slice(0, 16);
}
