import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase, DEMO_STUDENT_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "@/components/Section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/Badge";
import { formatDate, formatDateTime } from "@/lib/types";
import type { LessonReport, Schedule, Student } from "@/lib/types";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
} from "lucide-react";

export const Route = createFileRoute("/parent/reports")({
  component: ReportView,
});

function ReportView() {
  const [selectedReportId, setSelectedReportId] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["parent", "reports"],
    queryFn: async () => {
      const [student, reports, schedules] = await Promise.all([
        supabase.from("students").select("*").eq("id", DEMO_STUDENT_ID).maybeSingle(),
        supabase
          .from("lesson_reports")
          .select("*")
          .eq("student_id", DEMO_STUDENT_ID)
          .order("created_at", { ascending: false }),
        supabase
          .from("schedules")
          .select("*")
          .eq("student_id", DEMO_STUDENT_ID)
          .order("available_time", { ascending: true }),
      ]);
      const err = student.error || reports.error || schedules.error;
      if (err) throw err;
      return {
        student: student.data as Student | null,
        reports: (reports.data ?? []) as LessonReport[],
        schedules: (schedules.data ?? []) as Schedule[],
      };
    },
  });

  useEffect(() => {
    if (!data?.reports.length) return;
    const fromHash = getReportIdFromHash();
    const hashReport = data.reports.find((report) => report.id === fromHash);
    setSelectedReportId((current) => {
      if (current && data.reports.some((report) => report.id === current)) return current;
      return hashReport?.id ?? data.reports[0].id;
    });
  }, [data?.reports]);

  useEffect(() => {
    const syncHash = () => {
      const fromHash = getReportIdFromHash();
      if (fromHash) setSelectedReportId(fromHash);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const selectedReport =
    data?.reports.find((report) => report.id === selectedReportId) ?? data?.reports[0] ?? null;
  const nextSchedule = data?.schedules.find(
    (schedule) => schedule.status === "approved" || schedule.status === "available",
  );

  const selectReport = (reportId: string) => {
    setSelectedReportId(reportId);
    window.history.replaceState(null, "", `#${reportAnchorId(reportId)}`);
  };

  return (
    <AppLayout variant="parent" title="수업 리포트" subtitle="날짜별 학습 기록">
      {isLoading && <LoadingState />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && data.reports.length === 0 && (
        <EmptyState
          title="아직 리포트가 없습니다"
          description="선생님이 수업 후 리포트를 등록하면 여기에 표시됩니다."
        />
      )}
      {data && data.student && selectedReport && (
        <div className="grid gap-4 min-[980px]:grid-cols-[220px_minmax(0,1fr)] min-[1320px]:grid-cols-[220px_minmax(0,1fr)_260px] 2xl:grid-cols-[250px_minmax(0,1fr)_300px]">
          <aside className="space-y-4">
            <ReportCalendar
              reports={data.reports}
              selectedReport={selectedReport}
              onSelect={selectReport}
            />
            <RecentReports
              reports={data.reports}
              selectedReport={selectedReport}
              onSelect={selectReport}
            />
          </aside>

          <ReportDetail
            report={selectedReport}
            student={data.student}
            nextSchedule={nextSchedule}
          />

          <ReportAside report={selectedReport} nextSchedule={nextSchedule} />
        </div>
      )}
    </AppLayout>
  );
}

function ReportCalendar({
  reports,
  selectedReport,
  onSelect,
}: {
  reports: LessonReport[];
  selectedReport: LessonReport;
  onSelect: (reportId: string) => void;
}) {
  const [cursor, setCursor] = useState(() => monthStart(new Date(selectedReport.created_at)));
  const days = useMemo(() => buildMonthDays(cursor), [cursor]);
  const reportByDate = useMemo(() => {
    const map = new Map<string, LessonReport>();
    for (const report of reports) map.set(formatDate(report.created_at), report);
    return map;
  }, [reports]);
  const selectedDate = formatDate(selectedReport.created_at);

  useEffect(() => {
    setCursor(monthStart(new Date(selectedReport.created_at)));
  }, [selectedReport.created_at]);

  return (
    <section className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          onClick={() => setCursor(addMonths(cursor, -1))}
          aria-label="이전 달"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <h2 className="text-base font-bold">
          {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
        </h2>
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          onClick={() => setCursor(addMonths(cursor, 1))}
          aria-label="다음 달"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <div key={day} className="py-1.5">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs">
        {days.map((day) => {
          const key = formatDate(day.toISOString());
          const report = reportByDate.get(key);
          const inMonth = day.getMonth() === cursor.getMonth();
          const selected = key === selectedDate;
          return (
            <button
              key={key}
              type="button"
              disabled={!report}
              onClick={() => report && onSelect(report.id)}
              className={`relative mx-auto grid h-7 w-7 place-items-center rounded-md font-medium transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : report
                    ? "hover:bg-muted"
                    : "cursor-default"
              } ${inMonth ? "" : "text-muted-foreground/55"}`}
            >
              {day.getDate()}
              {report && !selected && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        수업 있음
      </div>
    </section>
  );
}

function RecentReports({
  reports,
  selectedReport,
  onSelect,
}: {
  reports: LessonReport[];
  selectedReport: LessonReport;
  onSelect: (reportId: string) => void;
}) {
  return (
    <section className="rounded-lg border bg-card p-3 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">최근 수업 리포트</h2>
      <div className="space-y-2">
        {reports.slice(0, 4).map((report) => {
          const selected = report.id === selectedReport.id;
          return (
            <button
              key={report.id}
              type="button"
              onClick={() => onSelect(report.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                selected
                  ? "border-primary bg-primary/5 shadow-[inset_0_0_0_1px_var(--color-primary)]"
                  : "hover:bg-muted/30"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <ChevronRight className="h-3 w-3" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {formatKoreanDate(report.created_at)}
                </span>
                <span className="mt-0.5 block truncate text-xs">{report.progress}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  19:00 - 19:50
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <Button className="mt-3 h-9 w-full text-xs" variant="outline">
        <FileText className="h-3.5 w-3.5" /> 전체 리포트 보기
      </Button>
    </section>
  );
}

function ReportDetail({
  report,
  student,
  nextSchedule,
}: {
  report: LessonReport;
  student: Student;
  nextSchedule?: Schedule;
}) {
  const completion = parseHomeworkCompletion(report);
  const homework = parseHomeworkNumbers(report);
  return (
    <main
      id={reportAnchorId(report.id)}
      className="scroll-mt-24 rounded-lg border bg-card p-4 shadow-sm target:ring-2 target:ring-primary/40"
    >
      <div className="mb-4">
        <h2 className="text-xl font-bold tracking-tight md:text-2xl">{report.progress}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {formatDate(report.created_at)} ({weekdayShort(report.created_at)}) · 19:00 - 19:50
        </p>
      </div>

      <div className="mb-4 grid gap-x-5 gap-y-2 rounded-lg border p-3 text-xs xl:grid-cols-2">
        <MetaItem label="학생" value={student.name} />
        <MetaItem label="날짜" value={formatDate(report.created_at)} />
        <MetaItem label="이해도" value={understandingLabel(completion)} />
        <MetaItem
          label="숙제 상태"
          value={`${completion ?? 0}%${homework ? ` (${homework.done}/${homework.total})` : ""}`}
        />
        <MetaItem label="취약 포인트" value={report.weakness} />
        <MetaItem label="선생님 메모" value={teacherMemo(report)} />
      </div>

      <div className="divide-y">
        <ReportSection title="수업 요약">
          오늘 수업에서는 {report.progress} 내용을 중심으로 학습했습니다.
        </ReportSection>
        <ReportSection title="이해도">
          전반적인 이해도는 {understandingLabel(completion)} 수준입니다.
        </ReportSection>
        <ReportSection title="숙제 상태">
          숙제는 {report.homework_status} 상태로 확인되었습니다.
        </ReportSection>
        <ReportSection title="취약 포인트">
          {report.weakness} 부분을 조금 더 점검할 필요가 있습니다.
        </ReportSection>
        <ReportSection title="다음 수업 계획">{report.next_plan}</ReportSection>
      </div>

      <div className="mt-4 rounded-lg border bg-primary/5 p-3.5">
        <h3 className="text-sm font-semibold text-primary">학부모님께 보낼 메시지</h3>
        <p className="mt-2 whitespace-pre-wrap text-xs leading-6">{report.parent_report}</p>
      </div>

      {nextSchedule && (
        <div className="mt-4 text-xs text-muted-foreground">
          다음 수업: {formatDateTime(nextSchedule.available_time || nextSchedule.requested_time)}
        </div>
      )}
    </main>
  );
}

function ReportAside({ report, nextSchedule }: { report: LessonReport; nextSchedule?: Schedule }) {
  const completion = parseHomeworkCompletion(report) ?? 0;
  const homework = parseHomeworkNumbers(report);
  const weaknessTags = splitTags(report.weakness);
  return (
    <aside className="space-y-4 min-[980px]:col-span-2 min-[1320px]:col-span-1">
      <section className="rounded-lg border bg-card shadow-sm">
        <header className="flex items-center gap-2 border-b px-3.5 py-3">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">학습 요약</h2>
        </header>
        <div className="divide-y px-3.5">
          <SummaryRow label="오늘의 진도" value={report.progress} />
          <div className="grid gap-2 py-3 text-xs">
            <div className="font-medium text-muted-foreground">취약 개념</div>
            <div className="flex flex-wrap gap-2">
              {weaknessTags.map((tag) => (
                <Badge key={tag} tone="warning">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="py-3 text-xs">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-medium text-muted-foreground">숙제 진행</span>
              <span className="font-semibold">{report.homework_status}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[oklch(0.62_0.16_155)]"
                style={{ width: `${completion}%` }}
              />
            </div>
            {homework && (
              <div className="mt-2 text-right text-xs text-muted-foreground">
                {homework.done} / {homework.total}문제
              </div>
            )}
          </div>
          <SummaryRow
            label="다음 수업"
            value={
              nextSchedule
                ? `${formatKoreanDate(nextSchedule.available_time || nextSchedule.requested_time)} 19:00`
                : "예정 없음"
            }
            valueClassName="text-primary"
          />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">다음 숙제</h2>
        </div>
        <div className="space-y-2.5">
          {nextHomework(report).map((item) => (
            <label key={item} className="flex items-center gap-2.5 text-xs">
              <span className="h-4 w-4 shrink-0 rounded border" />
              {item}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[oklch(0.58_0.15_155)]" />
          <h2 className="text-sm font-semibold">다음 수업 준비</h2>
        </div>
        <div className="text-base font-bold text-primary">
          {nextSchedule
            ? `${formatKoreanDate(nextSchedule.available_time || nextSchedule.requested_time)} 19:00`
            : "예정 없음"}
        </div>
        <div className="mt-3 space-y-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5" /> 오늘 내용 복습
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" /> {report.next_plan}
          </div>
        </div>
        <div className="mt-4 rounded-md border px-3 py-2.5 text-xs font-medium">
          {nextHomework(report)[0]}
        </div>
      </section>
    </aside>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[68px_1fr] gap-2">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <span className="min-w-0 break-keep font-medium leading-5">{value}</span>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-3">
      <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
      <p className="text-xs leading-6 text-muted-foreground">{children}</p>
    </section>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[78px_1fr] gap-2 py-3 text-xs">
      <div className="font-medium text-muted-foreground">{label}</div>
      <div className={`font-semibold ${valueClassName ?? ""}`}>{value}</div>
    </div>
  );
}

function buildMonthDays(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function monthStart(date: Date) {
  const next = new Date(date);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(date.getMonth() + amount);
  return next;
}

function reportAnchorId(reportId: string) {
  return `report-${reportId}`;
}

function getReportIdFromHash() {
  if (typeof window === "undefined") return "";
  const hash = window.location.hash.replace(/^#/, "");
  return hash.startsWith("report-") ? hash.replace(/^report-/, "") : "";
}

function formatKoreanDate(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return formatDate(iso);
  return `${formatDate(iso)} (${weekdayShort(iso)})`;
}

function weekdayShort(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  return ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
}

function parseHomeworkCompletion(report: LessonReport) {
  const parsed = parseHomeworkNumbers(report);
  if (!parsed) {
    if (report.homework_status.includes("모두 완료")) return 100;
    if (report.homework_status.includes("미완료")) return 0;
    return 60;
  }
  return Math.max(0, Math.min(100, Math.round((parsed.done / parsed.total) * 100)));
}

function parseHomeworkNumbers(report: LessonReport) {
  const match = report.homework_status.match(/(\d+)\s*문제\s*중\s*(\d+)\s*문제/);
  if (!match) return null;
  const total = Number(match[1]);
  const done = Number(match[2]);
  if (!Number.isFinite(total) || !Number.isFinite(done) || total <= 0) return null;
  return { total, done };
}

function understandingLabel(completion: number | null) {
  if (completion === null) return "보통";
  if (completion >= 80) return "좋음";
  if (completion >= 50) return "보통";
  return "보강 필요";
}

function splitTags(value: string) {
  return value
    .split(/[,/·]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function teacherMemo(report: LessonReport) {
  return `${report.weakness}가 반복되어 다음 시간에 ${report.next_plan} 예정`;
}

function nextHomework(report: LessonReport) {
  const tags = splitTags(report.weakness);
  const first = tags[0] ? `${tags[0]} 기본 개념 복습` : "오늘 내용 복습";
  return [first, `${report.next_plan} 10문제`, "오답노트 3문제 정리"];
}
