import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Section, LoadingState, EmptyState, ErrorState, Stat } from "@/components/Section";
import { Badge, statusTone, statusLabel } from "@/components/Badge";
import { formatDate, formatDateTime } from "@/lib/types";
import type { Student, Payment, LessonReport, MessageQueue, Schedule } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/teacher/")({
  component: TeacherDashboard,
});

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
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("message_queue")
          .select("*")
          .eq("tutor_id", DEMO_TUTOR_ID)
          .order("created_at", { ascending: false })
          .limit(5),
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
    <AppLayout variant="teacher" title="대시보드" subtitle="오늘의 운영 상태를 한눈에 확인하세요">
      {isLoading && <LoadingState />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && <DashboardBody data={data} />}
    </AppLayout>
  );
}

function DashboardBody({
  data,
}: {
  data: {
    students: Student[];
    payments: Payment[];
    reports: LessonReport[];
    msgs: MessageQueue[];
    schedules: Schedule[];
  };
}) {
  const pendingMsgs = data.msgs.filter((m) => m.status === "pending");
  const unpaid = data.payments.filter((p) => p.payment_status === "unpaid");
  const nextSchedule = data.schedules
    .filter((s) => s.status !== "cancelled" && s.status !== "rejected")
    .sort(
      (a, b) =>
        new Date(a.available_time || a.requested_time).getTime() -
        new Date(b.available_time || b.requested_time).getTime(),
    )[0];

  const studentName = (id: string) => data.students.find((s) => s.id === id)?.name ?? "학생";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="전체 학생" value={data.students.length} />
        <Stat
          label="대기 메시지"
          value={pendingMsgs.length}
          tone={pendingMsgs.length > 0 ? "warning" : "default"}
        />
        <Stat
          label="미결제"
          value={unpaid.length}
          tone={unpaid.length > 0 ? "danger" : "success"}
        />
        <Stat
          label="다음 수업"
          value={
            nextSchedule
              ? formatDateTime(nextSchedule.available_time || nextSchedule.requested_time)
              : "—"
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to="/teacher/lesson-report">
            <FileText className="h-4 w-4" /> 수업 메모 작성
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/teacher/messages">
            <MessageSquare className="h-4 w-4" /> 메시지 큐 보기
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section
          title="최근 수업 리포트"
          actions={
            <Link
              to="/teacher/students"
              className="text-xs text-primary hover:underline inline-flex items-center"
            >
              전체 학생 <ArrowRight className="ml-0.5 h-3 w-3" />
            </Link>
          }
        >
          {data.reports.length === 0 ? (
            <EmptyState
              title="아직 리포트가 없습니다"
              description="수업 메모를 입력해 첫 리포트를 생성해 보세요."
            />
          ) : (
            <ul className="divide-y">
              {data.reports.map((r) => (
                <li key={r.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{studentName(r.student_id)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-1">
                    {r.progress || r.lesson_memo}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="대기 중인 메시지">
          {pendingMsgs.length === 0 ? (
            <EmptyState title="대기 메시지가 없습니다" />
          ) : (
            <ul className="divide-y">
              {pendingMsgs.map((m) => (
                <li key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{studentName(m.student_id)}</span>
                    <Badge tone={statusTone(m.message_type)}>{statusLabel(m.message_type)}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-1">
                    {m.message_body}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
