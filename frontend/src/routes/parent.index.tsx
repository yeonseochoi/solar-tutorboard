import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, DEMO_STUDENT_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Section, LoadingState, EmptyState, ErrorState, Stat } from "@/components/Section";
import { Badge, statusTone, statusLabel } from "@/components/Badge";
import { formatDate, formatDateTime } from "@/lib/types";
import type { Student, Payment, LessonReport, MessageQueue, Schedule } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CalendarPlus, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/parent/")({
  component: ParentDashboard,
});

function ParentDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["parent", "dashboard"],
    queryFn: async () => {
      const [student, payments, reports, msgs, schedules] = await Promise.all([
        supabase.from("students").select("*").eq("id", DEMO_STUDENT_ID).maybeSingle(),
        supabase
          .from("payments")
          .select("*")
          .eq("student_id", DEMO_STUDENT_ID)
          .order("created_at", { ascending: false }),
        supabase
          .from("lesson_reports")
          .select("*")
          .eq("student_id", DEMO_STUDENT_ID)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("message_queue")
          .select("*")
          .eq("student_id", DEMO_STUDENT_ID)
          .order("created_at", { ascending: false }),
        supabase
          .from("schedules")
          .select("*")
          .eq("student_id", DEMO_STUDENT_ID)
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
  const pendingMsgs = data.msgs.filter((m) => m.status === "pending");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat
          label="다음 수업"
          value={
            nextSchedule
              ? formatDateTime(nextSchedule.available_time || nextSchedule.requested_time)
              : "—"
          }
        />
        <Stat
          label="결제 상태"
          value={unpaid ? "미결제" : "완료"}
          tone={unpaid ? "danger" : "success"}
        />
        <Stat label="대기 메시지" value={pendingMsgs.length} />
      </div>

      <div className="flex gap-2">
        <Button asChild size="sm">
          <Link to="/parent/reports">
            <ClipboardList className="h-4 w-4" /> 리포트 전체 보기
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/parent/schedule">
            <CalendarPlus className="h-4 w-4" /> 일정 변경 요청
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section
          title="최근 수업 리포트"
          description={latestReport ? formatDate(latestReport.created_at) : "아직 없습니다"}
        >
          {!latestReport && <EmptyState title="리포트가 없습니다" />}
          {latestReport && (
            <div className="space-y-2 text-sm">
              <Row label="진도" value={latestReport.progress} />
              <Row label="취약" value={latestReport.weakness} />
              <Row label="숙제" value={latestReport.homework_status} />
              <Row label="다음 계획" value={latestReport.next_plan} />
              <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed">
                {latestReport.parent_report}
              </div>
            </div>
          )}
        </Section>

        <div className="space-y-5">
          <Section title="결제 안내">
            {data.payments.length === 0 ? (
              <EmptyState title="결제 내역이 없습니다" />
            ) : (
              <ul className="space-y-2">
                {data.payments.slice(0, 3).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        {p.amount.toLocaleString()}원 · {p.class_count}회
                      </div>
                      <div className="text-xs text-muted-foreground">
                        예정일 {formatDate(p.payment_due_date)}
                      </div>
                    </div>
                    <Badge tone={statusTone(p.payment_status)}>
                      {statusLabel(p.payment_status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="안내 메시지">
            {pendingMsgs.length === 0 && data.msgs.length === 0 ? (
              <EmptyState title="메시지가 없습니다" />
            ) : (
              <ul className="divide-y">
                {data.msgs.slice(0, 5).map((m) => (
                  <li key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={statusTone(m.message_type)}>{statusLabel(m.message_type)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(m.created_at)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {m.message_body}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="col-span-3">{value}</span>
    </div>
  );
}
