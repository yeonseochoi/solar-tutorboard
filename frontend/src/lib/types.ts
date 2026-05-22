export type Student = {
  id: string;
  tutor_id: string;
  name: string;
  grade: string;
  subject: string;
  parent_name: string;
  parent_contact: string;
  created_at: string;
};

export type LessonReport = {
  id: string;
  tutor_id: string;
  student_id: string;
  lesson_memo: string;
  progress: string;
  weakness: string;
  homework_status: string;
  next_plan: string;
  parent_report: string;
  created_at: string;
};

export type PaymentStatus = "paid" | "unpaid";

export type Payment = {
  id: string;
  tutor_id: string;
  student_id: string;
  payment_status: PaymentStatus;
  payment_due_date: string;
  amount: number;
  class_count: number;
  next_class: string;
  created_at: string;
};

export type MessageStatus = "pending" | "sent" | "skipped";
export type MessageType = "lesson_report" | "payment_reminder";

export type MessageQueue = {
  id: string;
  tutor_id: string;
  student_id: string;
  message_type: MessageType;
  channel: string;
  status: MessageStatus;
  message_body: string;
  created_at: string;
};

export type ScheduleStatus = "available" | "requested" | "approved" | "rejected" | "cancelled";

export type Schedule = {
  id: string;
  tutor_id: string;
  student_id: string;
  available_time: string;
  requested_time: string;
  status: ScheduleStatus;
  created_at: string;
};

export function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
