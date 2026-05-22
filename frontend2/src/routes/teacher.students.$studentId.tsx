import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Section, LoadingState, EmptyState, ErrorState } from "@/components/Section";
import { Badge, statusTone, statusLabel } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/types";
import type { Student, Payment, LessonReport, MessageQueue, Schedule } from "@/lib/types";
import { build_message_queue_mock, generate_payment_reminder } from "@/lib/agent";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  Clock3,
  Eye,
  FileText,
  Mail,
  MessageSquare,
  Plus,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/teacher/students/$studentId")({
  component: StudentDetail,
});

function StudentDetail() {
  const { studentId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher", "student", studentId],
    queryFn: async () => {
      const [student, payments, reports, msgs, schedules] = await Promise.all([
        supabase.from("students").select("*").eq("id", studentId).maybeSingle(),
        supabase
          .from("payments")
          .select("*")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
        supabase
          .from("lesson_reports")
          .select("*")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
        supabase
          .from("message_queue")
          .select("*")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
        supabase
          .from("schedules")
          .select("*")
          .eq("student_id", studentId)
          .order("available_time", { ascending: true }),
      ]);
      const err = student.error || payments.error || reports.error || msgs.error || schedules.error;
      if (err) throw err;
      return {
        student: student.data as Student | null,
        payments: (payments.data ?? []) as Payment[],
        reports: (reports.data ?? []) as LessonReport[],
        msgs: (msgs.data ?? []) as MessageQueue[],
        schedules: (schedules.data ?? []) as Schedule[],
      };
    },
  });

  const student = data?.student;
  const latestPayment = data?.payments[0];
  const latestReport = data?.reports[0];
  const nextSchedule = data?.schedules.find(
    (s) => s.status !== "cancelled" && s.status !== "rejected",
  );
  const pendingMessages = data?.msgs.filter((m) => m.message_status === "pending") ?? [];

  const markSent = async (id: string) => {
    try {
      const { error: uerr } = await supabase
        .from("message_queue")
        .update({ message_status: "sent" })
        .eq("id", id);
      if (uerr) throw uerr;
      toast.success("발송 완료 처리");
      qc.invalidateQueries({ queryKey: ["teacher"] });
    } catch (e) {
      toast.error("상태 변경 실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const createPaymentMessage = async () => {
    if (!student || !latestPayment) return;
    if (latestPayment.payment_status === "paid") {
      toast.info("이미 결제 완료 상태입니다.");
      return;
    }
    try {
      const reminder = await generate_payment_reminder({
        student_id: student.id,
        student_name: student.name,
        grade: student.grade,
        subject: student.subject,
        parent_name: student.parent_name,
        payment_status: latestPayment.payment_status,
        amount: latestPayment.amount,
        payment_due_date: latestPayment.payment_due_date,
        class_count: latestPayment.class_count,
        next_class: latestPayment.next_class,
      });
      if (!reminder.result.should_send) return;
      const msg = await build_message_queue_mock({
        tutor_id: DEMO_TUTOR_ID,
        student_id: student.id,
        message_type: "payment_reminder",
        message_body: reminder.result.message_body,
      });
      const message = msg.result.messages[0];
      if (!message) throw new Error("message_queue Agent가 메시지를 반환하지 않았습니다.");
      const { error: merr } = await supabase.from("message_queue").insert(message);
      if (merr) throw merr;
      toast.success("결제 안내 메시지를 생성했습니다.");
      qc.invalidateQueries({ queryKey: ["teacher"] });
    } catch (e) {
      toast.error("결제 안내 생성 실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <AppLayout
      variant="teacher"
      title={student ? `${student.name} 학생 관리` : "학생 상세"}
      subtitle={student ? `${student.grade} · ${student.subject}` : ""}
    >
      {isLoading && <LoadingState />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && !student && (
        <EmptyState
          title="학생을 찾을 수 없습니다"
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/teacher/students">학생 목록으로</Link>
            </Button>
          }
        />
      )}
      {data && student && (
        <div className="space-y-5">
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight">{student.name}</h2>
                  <Badge tone="info">
                    {student.grade} · {student.subject}
                  </Badge>
                  {latestPayment && (
                    <Badge tone={statusTone(latestPayment.payment_status)}>
                      {statusLabel(latestPayment.payment_status)}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {student.parent_name} · {student.parent_contact}
                </p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <SummaryBox
                  label="다음 수업"
                  value={nextSchedule ? formatDateTime(nextSchedule.available_time) : "등록 필요"}
                  icon={CalendarDays}
                />
                <SummaryBox label="대기 메시지" value={`${pendingMessages.length}건`} icon={Mail} />
                <SummaryBox
                  label="최근 리포트"
                  value={latestReport ? formatDate(latestReport.created_at) : "없음"}
                  icon={FileText}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  navigate({
                    to: "/teacher/lesson-report",
                    search: { studentId },
                  })
                }
              >
                <FileText className="h-4 w-4" /> AI 리포트 생성
              </Button>
              <Button size="sm" variant="outline" onClick={createPaymentMessage}>
                <Wallet className="h-4 w-4" /> 결제 안내 생성
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/teacher/schedule">
                  <Plus className="h-4 w-4" /> 일정 등록
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/parent">
                  <Eye className="h-4 w-4" /> 학부모 화면 보기
                </Link>
              </Button>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
            <div className="space-y-5">
              <Section title="최근 수업 리포트">
                {!latestReport ? (
                  <EmptyState title="리포트가 없습니다" />
                ) : (
                  <div className="space-y-4 text-sm">
                    <InfoGrid
                      items={[
                        ["현재 진도", latestReport.progress],
                        ["취약 개념", latestReport.weakness],
                        ["숙제 상태", latestReport.homework_status],
                        ["다음 계획", latestReport.next_plan],
                      ]}
                    />
                    <div className="rounded-md border bg-muted/30 p-4 leading-relaxed">
                      {latestReport.parent_report}
                    </div>
                  </div>
                )}
              </Section>

              <Section title="학생 타임라인">
                <div className="space-y-3">
                  {buildTimeline(data).map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-md border bg-background p-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-medium">{item.title}</div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {item.date}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {item.body}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <aside className="space-y-5">
              <Section title="결제 상태">
                {data.payments.length === 0 ? (
                  <EmptyState title="결제 내역이 없습니다" />
                ) : (
                  <div className="space-y-3">
                    {data.payments.slice(0, 3).map((p) => (
                      <div key={p.id} className="rounded-md border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold">{p.amount.toLocaleString()}원</div>
                          <Badge tone={statusTone(p.payment_status)}>
                            {statusLabel(p.payment_status)}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          결제 예정일 {formatDate(p.payment_due_date)} · {p.class_count}회 · 다음
                          수업 {formatDateTime(p.next_class)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="일정">
                {data.schedules.length === 0 ? (
                  <EmptyState title="등록된 일정이 없습니다" />
                ) : (
                  <div className="space-y-2">
                    {data.schedules.slice(0, 5).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 rounded-md border bg-background p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {formatDateTime(s.available_time || s.requested_time)}
                          </div>
                          {s.requested_time && (
                            <div className="truncate text-xs text-muted-foreground">
                              요청 {formatDateTime(s.requested_time)}
                            </div>
                          )}
                        </div>
                        <Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="메시지 큐">
                {data.msgs.length === 0 ? (
                  <EmptyState title="메시지가 없습니다" />
                ) : (
                  <div className="space-y-3">
                    {data.msgs.slice(0, 5).map((m) => (
                      <div key={m.id} className="rounded-md border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge tone={statusTone(m.message_type)}>
                              {statusLabel(m.message_type)}
                            </Badge>
                            <Badge tone={statusTone(m.message_status)}>
                              {statusLabel(m.message_status)}
                            </Badge>
                          </div>
                          {m.message_status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => markSent(m.id)}>
                              <Check className="h-3.5 w-3.5" /> 발송 완료 처리
                            </Button>
                          )}
                        </div>
                        <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {m.message_body}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </aside>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function SummaryBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof CalendarDays;
}) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md border bg-background p-3">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-sm font-medium">{value}</div>
        </div>
      ))}
    </div>
  );
}

function buildTimeline(data: {
  reports: LessonReport[];
  msgs: MessageQueue[];
  payments: Payment[];
  schedules: Schedule[];
}) {
  return [
    ...data.reports.map((item) => ({
      id: `report-${item.id}`,
      date: formatDate(item.created_at),
      title: "수업 리포트 생성",
      body: item.progress || item.parent_report,
      icon: FileText,
    })),
    ...data.msgs.map((item) => ({
      id: `msg-${item.id}`,
      date: formatDate(item.created_at),
      title: statusLabel(item.message_type),
      body: item.message_body,
      icon: MessageSquare,
    })),
    ...data.payments.map((item) => ({
      id: `pay-${item.id}`,
      date: formatDate(item.created_at),
      title: statusLabel(item.payment_status),
      body: `${item.amount.toLocaleString()}원 · ${formatDate(item.payment_due_date)}`,
      icon: Wallet,
    })),
    ...data.schedules.map((item) => ({
      id: `sch-${item.id}`,
      date: formatDate(item.created_at),
      title: `일정 ${statusLabel(item.status)}`,
      body: formatDateTime(item.available_time || item.requested_time),
      icon: Clock3,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);
}
