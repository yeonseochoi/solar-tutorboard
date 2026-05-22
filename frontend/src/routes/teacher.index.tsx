import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { LoadingState, ErrorState } from "@/components/Section";
import { Badge, statusTone, statusLabel } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/types";
import type { Student, Payment, LessonReport, MessageQueue, Schedule } from "@/lib/types";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MessageSquare,
  Plus,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/teacher/")({
  component: TeacherDashboard,
});

type DashboardData = {
  students: Student[];
  payments: Payment[];
  reports: LessonReport[];
  msgs: MessageQueue[];
  schedules: Schedule[];
};

function TeacherDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher", "dashboard"],
    queryFn: async () => {
      const [students, payments, reports, msgs, schedules] = await Promise.all([
        supabase.from("students").select("*").eq("tutor_id", DEMO_TUTOR_ID),
        supabase.from("payments").select("*").eq("tutor_id", DEMO_TUTOR_ID),
        supabase
          .from("lesson_reports")
          .select("*")
          .eq("tutor_id", DEMO_TUTOR_ID)
          .order("created_at", { ascending: false }),
        supabase
          .from("message_queue")
          .select("*")
          .eq("tutor_id", DEMO_TUTOR_ID)
          .order("created_at", { ascending: false }),
        supabase
          .from("schedules")
          .select("*")
          .eq("tutor_id", DEMO_TUTOR_ID)
          .order("available_time", { ascending: true }),
      ]);
      const err =
        students.error || payments.error || reports.error || msgs.error || schedules.error;
      if (err) throw err;
      return {
        students: (students.data ?? []) as Student[],
        payments: (payments.data ?? []) as Payment[],
        reports: (reports.data ?? []) as LessonReport[],
        msgs: (msgs.data ?? []) as MessageQueue[],
        schedules: (schedules.data ?? []) as Schedule[],
      };
    },
  });

  return (
    <AppLayout variant="teacher" title="Solar Tutorboard" subtitle="오늘의 과외 운영 대시보드">
      {isLoading && <LoadingState />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && <DashboardBody data={data} />}
    </AppLayout>
  );
}

function DashboardBody({ data }: { data: DashboardData }) {
  const today = new Date();
  const pendingMsgs = data.msgs.filter((m) => m.message_status === "pending");
  const sentMsgs = data.msgs.filter((m) => m.message_status === "sent");
  const unpaid = data.payments.filter((p) => p.payment_status === "unpaid");
  const paid = data.payments.filter((p) => p.payment_status === "paid");
  const requestedSchedules = data.schedules.filter((s) => s.status === "requested");
  const activeSchedules = data.schedules.filter(
    (s) => s.status !== "cancelled" && s.status !== "rejected",
  );
  const nextSchedules = [...activeSchedules].sort(
    (a, b) =>
      new Date(a.available_time || a.requested_time).getTime() -
      new Date(b.available_time || b.requested_time).getTime(),
  );
  const nextSchedule = nextSchedules[0];

  const reportStudentIds = new Set(data.reports.map((r) => r.student_id));
  const reportRate = data.students.length
    ? Math.round((reportStudentIds.size / data.students.length) * 100)
    : 0;
  const paymentRate = data.payments.length
    ? Math.round((paid.length / data.payments.length) * 100)
    : 0;
  const sentRate = data.msgs.length ? Math.round((sentMsgs.length / data.msgs.length) * 100) : 0;

  const studentRows = data.students.map((student) => {
    const payment = data.payments.find((p) => p.student_id === student.id);
    const latestReport = data.reports.find((r) => r.student_id === student.id);
    const schedule = nextSchedules.find((s) => s.student_id === student.id);
    const pendingCount = pendingMsgs.filter((m) => m.student_id === student.id).length;
    const score =
      (latestReport ? 35 : 0) +
      (payment?.payment_status === "paid" ? 35 : 0) +
      (schedule ? 20 : 0) +
      (pendingCount === 0 ? 10 : 0);
    return { student, payment, latestReport, schedule, pendingCount, score };
  });

  const studentName = (id: string) => data.students.find((s) => s.id === id)?.name ?? "학생";
  const todos = [
    ...unpaid.map((p) => ({
      key: `pay-${p.id}`,
      label: `${studentName(p.student_id)} 결제 안내 필요`,
      meta: `${p.amount.toLocaleString()}원 · ${formatDate(p.payment_due_date)}`,
      tone: "danger" as const,
    })),
    ...pendingMsgs.slice(0, 3).map((m) => ({
      key: `msg-${m.id}`,
      label: `${studentName(m.student_id)} 메시지 발송 대기`,
      meta: statusLabel(m.message_type),
      tone: "warning" as const,
    })),
    ...requestedSchedules.map((s) => ({
      key: `sch-${s.id}`,
      label: `${studentName(s.student_id)} 일정 요청 확인`,
      meta: formatDateTime(s.requested_time || s.available_time),
      tone: "info" as const,
    })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border bg-card px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium text-primary">Solar Tutorboard</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">오늘의 과외 운영 대시보드</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(today.toISOString())} · 학생, 결제, 메시지, 일정을 한 화면에서 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/teacher/lesson-report">
              <Sparkles className="h-4 w-4" /> 수업 메모 작성
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/teacher/students">
              <Plus className="h-4 w-4" /> 학생 추가
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/teacher/schedule">
              <CalendarPlus className="h-4 w-4" /> 일정 등록
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/teacher/messages">
              <MessageSquare className="h-4 w-4" /> 메시지 큐
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(360px,0.9fr)]">
        <div className="space-y-5">
          <Panel>
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">운영 현황</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  수업 후속 업무와 학생 관리 상태를 요약합니다.
                </p>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 xl:grid-cols-4">
                <Metric label="전체 학생" value={`${data.students.length}명`} icon={Users} />
                <Metric
                  label="다음 수업"
                  value={nextSchedule ? formatDateTime(nextSchedule.available_time) : "없음"}
                  icon={CalendarDays}
                />
                <Metric label="미결제" value={`${unpaid.length}명`} icon={Wallet} tone="danger" />
                <Metric
                  label="대기 메시지"
                  value={`${pendingMsgs.length}건`}
                  icon={Mail}
                  tone="warning"
                />
              </div>
            </div>

            <div className="mt-7 grid gap-6 lg:grid-cols-[280px_1fr]">
              <div className="flex items-center justify-center rounded-lg bg-[oklch(0.98_0.015_230)] p-6">
                <Donut value={reportRate} label="리포트 생성률" color="oklch(0.56 0.22 282)" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ProgressLine
                  label="학생 관리 커버리지"
                  value={reportRate}
                  meta="최근 리포트 보유"
                />
                <ProgressLine
                  label="결제 완료율"
                  value={paymentRate}
                  meta={`${paid.length}/${data.payments.length}명`}
                />
                <ProgressLine
                  label="메시지 처리율"
                  value={sentRate}
                  meta={`${sentMsgs.length}/${data.msgs.length}건`}
                />
                <ProgressLine
                  label="일정 확정"
                  value={
                    data.schedules.length
                      ? Math.round(
                          (data.schedules.filter((s) => s.status === "approved").length /
                            data.schedules.length) *
                            100,
                        )
                      : 0
                  }
                  meta="approved 기준"
                />
              </div>
            </div>
          </Panel>

          <Panel title="AI 업무 리포트" icon={Sparkles}>
            <div className="grid gap-4 lg:grid-cols-2">
              <ActionSummary
                title="수업 리포트 생성"
                description="수업 메모를 학부모용 리포트로 변환"
                action="AI 리포트 생성"
                to="/teacher/lesson-report"
              />
              <ActionSummary
                title="결제 안내 생성"
                description="미결제 학생에게 보낼 안내 문구 생성"
                action="결제 안내 보기"
                to="/teacher/payments"
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <CompactList
                title="최근 생성된 리포트"
                empty="아직 리포트가 없습니다"
                items={data.reports.slice(0, 2).map((report) => ({
                  id: report.id,
                  title: studentName(report.student_id),
                  meta: formatDate(report.created_at),
                  body: report.progress || report.parent_report,
                }))}
              />
              <CompactList
                title="대기 중 메시지"
                empty="대기 메시지가 없습니다"
                items={pendingMsgs.slice(0, 2).map((msg) => ({
                  id: msg.id,
                  title: studentName(msg.student_id),
                  meta: statusLabel(msg.message_type),
                  body: msg.message_body,
                }))}
              />
            </div>
          </Panel>

          <Panel
            title="학생별 관리 현황"
            icon={Users}
            action={
              <Link
                to="/teacher/students"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary"
              >
                전체 보기 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <div className="divide-y">
              {studentRows.map(
                ({ student, payment, latestReport, schedule, pendingCount, score }) => (
                  <Link
                    key={student.id}
                    to="/teacher/students/$studentId"
                    params={{ studentId: student.id }}
                    className="grid gap-3 py-3 transition-colors hover:bg-muted/35 md:grid-cols-[1.2fr_0.8fr_1fr_0.8fr_110px]"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {student.grade} · {student.subject}
                      </div>
                    </div>
                    <div className="flex items-center">
                      {payment ? (
                        <Badge tone={statusTone(payment.payment_status)}>
                          {statusLabel(payment.payment_status)}
                        </Badge>
                      ) : (
                        <Badge tone="muted">결제 없음</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="block font-medium text-foreground">
                        {latestReport ? formatDate(latestReport.created_at) : "리포트 없음"}
                      </span>
                      {latestReport?.progress ?? "수업 후 리포트를 생성해 주세요"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="block font-medium text-foreground">
                        {schedule
                          ? formatDateTime(schedule.available_time || schedule.requested_time)
                          : "일정 없음"}
                      </span>
                      대기 메시지 {pendingCount}건
                    </div>
                    <ProgressPill value={score} />
                  </Link>
                ),
              )}
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="운영 분석" icon={CheckCircle2}>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <DonutWithLegend
                title="결제 상태"
                value={paymentRate}
                primaryLabel={`결제 완료 ${paid.length}명`}
                secondaryLabel={`미결제 ${unpaid.length}명`}
                color="oklch(0.6 0.18 255)"
              />
              <DonutWithLegend
                title="메시지 상태"
                value={sentRate}
                primaryLabel={`발송 완료 ${sentMsgs.length}건`}
                secondaryLabel={`대기 ${pendingMsgs.length}건`}
                color="oklch(0.56 0.22 282)"
              />
            </div>
          </Panel>

          <Panel title="이번 주 일정" icon={CalendarDays}>
            <MiniWeekCalendar schedules={data.schedules} students={data.students} />
          </Panel>

          <Panel title="오늘 확인할 일" icon={AlertTriangle}>
            {todos.length === 0 ? (
              <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
                확인할 일이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {todos.slice(0, 6).map((todo) => (
                  <div key={todo.key} className="rounded-md border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 text-sm font-medium">{todo.label}</div>
                      <Badge tone={todo.tone}>{todo.tone === "danger" ? "중요" : "확인"}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{todo.meta}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title?: string;
  icon?: typeof Users;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-primary" />}
            {title && <h3 className="truncate text-lg font-semibold">{title}</h3>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: typeof Users;
  tone?: "default" | "danger" | "warning";
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-[oklch(0.55_0.16_65)]"
        : "text-primary";
  return (
    <div className="min-w-0 rounded-md border bg-background p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`mt-2 break-words text-base font-semibold leading-tight ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function Donut({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div
      className="grid h-36 w-36 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${Math.max(0, Math.min(value, 100))}%, oklch(0.93 0.01 245) 0)`,
      }}
    >
      <div className="grid h-24 w-24 place-items-center rounded-full bg-card text-center">
        <div>
          <div className="text-2xl font-bold">{value}%</div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}

function DonutWithLegend({
  title,
  value,
  primaryLabel,
  secondaryLabel,
  color,
}: {
  title: string;
  value: number;
  primaryLabel: string;
  secondaryLabel: string;
  color: string;
}) {
  return (
    <div>
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div className="flex items-center gap-4">
        <Donut value={value} label="완료율" color={color} />
        <div className="min-w-0 space-y-2 text-xs">
          <LegendDot color={color} label={primaryLabel} />
          <LegendDot color="oklch(0.88 0.01 245)" label={secondaryLabel} />
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function ProgressLine({ label, value, meta }: { label: string; value: number; meta: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-semibold text-primary">{value}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{meta}</div>
    </div>
  );
}

function ActionSummary({
  title,
  description,
  action,
  to,
}: {
  title: string;
  description: string;
  action: string;
  to: "/teacher/lesson-report" | "/teacher/payments";
}) {
  return (
    <div className="rounded-md border bg-[oklch(0.98_0.015_275)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-primary">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{description}</div>
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link to={to}>
            {action} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CompactList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; meta: string; body: string }>;
}) {
  return (
    <div className="rounded-md border bg-background p-4">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">{empty}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{item.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>
              </div>
              <div className="mt-1 truncate text-xs text-muted-foreground">{item.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressPill({ value }: { value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>관리율</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function MiniWeekCalendar({ schedules, students }: { schedules: Schedule[]; students: Student[] }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? "학생";

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const key = formatDate(day.toISOString());
        const daySchedules = schedules.filter(
          (schedule) => formatDate(schedule.available_time || schedule.requested_time) === key,
        );
        return (
          <div key={key} className="min-h-28 rounded-md border bg-background p-2">
            <div className="text-xs font-semibold">{day.getDate()}</div>
            <div className="mt-2 space-y-1">
              {daySchedules.slice(0, 2).map((schedule) => (
                <div
                  key={schedule.id}
                  className={`truncate rounded px-1.5 py-1 text-[10px] font-medium ${scheduleColor(
                    schedule.status,
                  )}`}
                  title={studentName(schedule.student_id)}
                >
                  {studentName(schedule.student_id)}
                </div>
              ))}
              {daySchedules.length > 2 && (
                <div className="text-[10px] text-muted-foreground">+{daySchedules.length - 2}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function scheduleColor(status: string) {
  switch (status) {
    case "available":
      return "bg-[oklch(0.94_0.04_255)] text-[oklch(0.42_0.15_255)]";
    case "requested":
      return "bg-[oklch(0.96_0.05_75)] text-[oklch(0.45_0.14_60)]";
    case "approved":
      return "bg-[oklch(0.94_0.05_155)] text-[oklch(0.36_0.12_155)]";
    case "rejected":
      return "bg-[oklch(0.96_0.04_25)] text-[oklch(0.42_0.18_25)]";
    default:
      return "bg-muted text-muted-foreground";
  }
}
