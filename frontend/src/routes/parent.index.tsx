import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getParentStudentId } from "@/lib/parent-session";
import { AppLayout } from "@/components/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "@/components/Section";
import { Badge, statusLabel } from "@/components/Badge";
import { formatDate, formatDateTime } from "@/lib/types";
import type { Student, Payment, LessonReport, MessageQueue, Schedule } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  CreditCard,
  GraduationCap,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/parent/")({
  component: ParentDashboard,
});

function ParentDashboard() {
  const studentId = getParentStudentId();
  const { data, isLoading, error } = useQuery({
    queryKey: ["parent", "dashboard", studentId],
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
          .order("created_at", { ascending: false })
          .limit(3),
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

  return (
    <AppLayout
      variant="parent"
      title={data?.student ? `${data.student.name} 학생` : "학부모 대시보드"}
      subtitle={data?.student ? `${data.student.grade} · ${data.student.subject}` : ""}
    >
      {isLoading && <LoadingState />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && !data.student && <EmptyState title="학생 정보가 없습니다" />}
      {data && data.student && <ParentBody data={{ ...data, student: data.student }} />}
    </AppLayout>
  );
}

function ParentBody({
  data,
}: {
  data: {
    student: Student;
    payments: Payment[];
    reports: LessonReport[];
    msgs: MessageQueue[];
    schedules: Schedule[];
  };
}) {
  const latestReport = data.reports[0];
  const nextSchedule = data.schedules.find(
    (s) => s.status === "approved" || s.status === "available",
  );
  const unpaid = data.payments.find((p) => p.payment_status === "unpaid");
  const paymentToShow = unpaid ?? data.payments[0];
  const visibleMessages = data.msgs.slice(0, 4);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-bold tracking-tight">
                {data.student.name} 학생
              </h2>
              <div className="mt-1 text-sm text-muted-foreground">
                {data.student.grade} · {data.student.subject} · {data.student.parent_name}
              </div>
            </div>
          </div>

          <div className="rounded-md border bg-background px-4 py-2 text-sm shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              다음 수업
            </div>
            <div className="mt-1 font-semibold text-primary">
              {nextSchedule
                ? formatDateTime(nextSchedule.available_time || nextSchedule.requested_time)
                : "예정 없음"}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 [@media(min-width:1200px)]:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <div className="space-y-5">
          <Panel
            icon={<ClipboardList className="h-5 w-5" />}
            title="최근 수업 리포트"
            description={latestReport ? formatDate(latestReport.created_at) : "아직 없습니다"}
            action={
              <Button asChild size="sm" variant="outline">
                <Link to="/parent/reports">
                  전체 보기 <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          >
            {!latestReport ? (
              <EmptyState title="리포트가 없습니다" />
            ) : (
              <div className="space-y-5">
                <div className="rounded-md border bg-muted/20 p-4 text-sm leading-relaxed">
                  {latestReport.parent_report}
                </div>
                <HomeworkCompletionBar percent={parseHomeworkCompletion(latestReport)} />
                <div className="divide-y rounded-md border">
                  <ReportRow label="오늘 배운 내용" value={latestReport.progress} />
                  <ReportRow label="보강할 부분" value={latestReport.weakness} />
                  <ReportRow label="숙제 상태" value={latestReport.homework_status} />
                  <ReportRow label="다음 수업 계획" value={latestReport.next_plan} />
                </div>
              </div>
            )}
          </Panel>

          <Panel
            icon={<TrendingUp className="h-5 w-5" />}
            title="최근 수업 흐름"
            description="숙제 완료율 기준"
          >
            <HomeworkTrendChart reports={data.reports} />
          </Panel>

          <Panel icon={<BookOpen className="h-5 w-5" />} title="리포트 히스토리">
            {data.reports.length === 0 ? (
              <EmptyState title="리포트가 없습니다" />
            ) : (
              <div className="divide-y rounded-md border">
                {data.reports.map((report) => (
                  <Link
                    key={report.id}
                    to="/parent/reports"
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{report.progress}</div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {report.next_plan}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(report.created_at)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel icon={<CreditCard className="h-5 w-5" />} title="결제 안내">
            {!paymentToShow ? (
              <EmptyState title="결제 내역이 없습니다" />
            ) : (
              <div className="rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-bold text-primary">
                      {paymentToShow.amount.toLocaleString()}원
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {paymentToShow.class_count}회 · 예정일{" "}
                      {formatDate(paymentToShow.payment_due_date)}
                    </div>
                  </div>
                  <Badge tone={paymentToShow.payment_status === "unpaid" ? "warning" : "muted"}>
                    {statusLabel(paymentToShow.payment_status)}
                  </Badge>
                </div>
              </div>
            )}
          </Panel>

          <Panel icon={<CalendarDays className="h-5 w-5" />} title="다음 수업">
            {!nextSchedule ? (
              <EmptyState title="예정된 수업이 없습니다" />
            ) : (
              <div className="rounded-md border p-4">
                <div className="font-semibold text-primary">
                  {formatDateTime(nextSchedule.available_time || nextSchedule.requested_time)}
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  <InfoLine label="수업 과목" value={data.student.subject} />
                  <InfoLine label="준비물" value="오답노트, 지난 숙제" />
                  <InfoLine label="상태" value={statusLabel(nextSchedule.status)} />
                </div>
              </div>
            )}
          </Panel>

          <Panel icon={<MessageSquare className="h-5 w-5" />} title="안내 메시지">
            {visibleMessages.length === 0 ? (
              <EmptyState title="메시지가 없습니다" />
            ) : (
              <div className="divide-y rounded-md border">
                {visibleMessages.map((message) => {
                  const linkedReport = findLinkedReport(message, data.reports);
                  const content = (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="muted">{statusLabel(message.message_type)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <div className="line-clamp-2 min-w-0 flex-1 text-sm text-muted-foreground">
                          {message.message_body}
                        </div>
                        {linkedReport && (
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        )}
                      </div>
                    </>
                  );

                  return linkedReport ? (
                    <Link
                      key={message.id}
                      to="/parent/reports"
                      hash={reportAnchorId(linkedReport.id)}
                      className="block px-4 py-3 transition-colors hover:bg-muted/30"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={message.id} className="px-4 py-3">
                      {content}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Button asChild className="h-14 w-full justify-between text-base">
            <Link to="/parent/schedule">
              <span className="flex items-center gap-2">
                <CalendarPlus className="h-5 w-5" /> 일정 변경 요청
              </span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}

function Panel({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="text-primary">{icon}</div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function HomeworkCompletionBar({ percent }: { percent: number | null }) {
  if (percent === null) return null;
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">숙제 완료율</div>
          <div className="mt-1 text-xs text-muted-foreground">
            최근 수업 리포트의 숙제 상태를 기준으로 계산
          </div>
        </div>
        <div className="text-xl font-bold text-primary">{percent}%</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function HomeworkTrendChart({ reports }: { reports: LessonReport[] }) {
  const values = reports
    .slice()
    .reverse()
    .map((report) => ({
      label: formatDate(report.created_at).slice(5),
      value: parseHomeworkCompletion(report),
    }))
    .filter((item): item is { label: string; value: number } => item.value !== null);

  if (values.length === 0) {
    return <EmptyState title="표시할 숙제 완료율이 없습니다" />;
  }

  const width = 360;
  const height = 144;
  const paddingX = 28;
  const paddingTop = 18;
  const paddingBottom = 30;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxIndex = Math.max(values.length - 1, 1);
  const points = values.map((item, index) => {
    const x = paddingX + ((width - paddingX * 2) * index) / maxIndex;
    const y = paddingTop + chartHeight - (chartHeight * item.value) / 100;
    return { ...item, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">숙제 완료율 추이</span>
        <span className="text-xs text-muted-foreground">최근 {values.length}회</span>
      </div>
      <svg className="h-40 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        {[0, 50, 100].map((tick) => {
          const y = paddingTop + chartHeight - (chartHeight * tick) / 100;
          return (
            <g key={tick}>
              <line
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeDasharray={tick === 0 ? "0" : "4 5"}
              />
              <text x={0} y={y + 4} className="fill-muted-foreground text-[10px]">
                {tick}%
              </text>
            </g>
          );
        })}
        {points.length > 1 && (
          <polyline
            points={line}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            className="text-primary"
          />
        )}
        {points.map((point) => (
          <g key={`${point.label}-${point.value}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4.5"
              className="fill-card stroke-primary"
              strokeWidth="3"
            />
            <text
              x={point.x}
              y={point.y - 10}
              textAnchor="middle"
              className="fill-primary text-[10px] font-semibold"
            >
              {point.value}%
            </text>
            <text
              x={point.x}
              y={height - 7}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[120px_1fr]">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="leading-relaxed">{value}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[76px_1fr] gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function findLinkedReport(message: MessageQueue, reports: LessonReport[]) {
  if (message.message_type !== "lesson_report") return null;
  const body = normalizeMessageText(message.message_body);
  return (
    reports.find((report) => body.includes(normalizeMessageText(report.parent_report))) ??
    reports.find((report) => formatDate(report.created_at) === formatDate(message.created_at)) ??
    reports[0] ??
    null
  );
}

function normalizeMessageText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function reportAnchorId(reportId: string) {
  return `report-${reportId}`;
}

function parseHomeworkCompletion(report: LessonReport) {
  const text = report.homework_status.trim();
  if (!text) return null;
  if (text.includes("모두 완료")) return 100;
  if (text.includes("미완료")) return 0;
  const match = text.match(/(\d+)\s*문제\s*중\s*(\d+)\s*문제/);
  if (!match) return null;
  const total = Number(match[1]);
  const done = Number(match[2]);
  if (!Number.isFinite(total) || !Number.isFinite(done) || total <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}
