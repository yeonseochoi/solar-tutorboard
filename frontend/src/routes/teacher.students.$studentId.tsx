import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Section, LoadingState, EmptyState, ErrorState } from "@/components/Section";
import { Badge, statusTone, statusLabel } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/types";
import type { Student, Payment, LessonReport, MessageQueue, Schedule } from "@/lib/types";
import { FileText, Eye } from "lucide-react";

export const Route = createFileRoute("/teacher/students/$studentId")({
  component: StudentDetail,
});

function StudentDetail() {
  const { studentId } = Route.useParams();
  const navigate = useNavigate();

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
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("message_queue")
          .select("*")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(10),
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

  return (
    <AppLayout
      variant="teacher"
      title={student ? `${student.name} 학생` : "학생 상세"}
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
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() =>
                navigate({
                  to: "/teacher/lesson-report",
                  search: { studentId },
                })
              }
            >
              <FileText className="h-4 w-4" /> 수업 메모 작성
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/parent">
                <Eye className="h-4 w-4" /> 학부모 화면 미리보기
              </Link>
            </Button>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="기본 정보">
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">학년</dt>
                <dd>{student.grade}</dd>
                <dt className="text-muted-foreground">과목</dt>
                <dd>{student.subject}</dd>
                <dt className="text-muted-foreground">학부모</dt>
                <dd>{student.parent_name}</dd>
                <dt className="text-muted-foreground">연락처</dt>
                <dd>{student.parent_contact}</dd>
                <dt className="text-muted-foreground">등록일</dt>
                <dd>{formatDate(student.created_at)}</dd>
              </dl>
            </Section>

            <Section title="결제 상태">
              {data.payments.length === 0 ? (
                <EmptyState title="결제 내역이 없습니다" />
              ) : (
                <ul className="space-y-3">
                  {data.payments.slice(0, 3).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-md border bg-background p-3 text-sm"
                    >
                      <div>
                        <div className="font-medium">
                          {p.amount.toLocaleString()}원 · {p.class_count}회
                        </div>
                        <div className="text-xs text-muted-foreground">
                          예정일 {formatDate(p.payment_due_date)} · 다음 수업{" "}
                          {formatDateTime(p.next_class)}
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

            <Section title="최근 수업 리포트">
              {data.reports.length === 0 ? (
                <EmptyState title="리포트가 없습니다" />
              ) : (
                <ul className="divide-y">
                  {data.reports.map((r) => (
                    <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{r.progress || "수업 리포트"}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(r.created_at)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {r.parent_report}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="예정 일정">
              {data.schedules.length === 0 ? (
                <EmptyState title="등록된 일정이 없습니다" />
              ) : (
                <ul className="space-y-2">
                  {data.schedules.slice(0, 5).map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-md border bg-background p-2.5 text-sm"
                    >
                      <span>{formatDateTime(s.available_time || s.requested_time)}</span>
                      <Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="메시지 큐" className="lg:col-span-2">
              {data.msgs.length === 0 ? (
                <EmptyState title="메시지가 없습니다" />
              ) : (
                <ul className="divide-y">
                  {data.msgs.map((m) => (
                    <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge tone={statusTone(m.message_type)}>
                            {statusLabel(m.message_type)}
                          </Badge>
                          <Badge tone={statusTone(m.status)}>{statusLabel(m.status)}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(m.created_at)}
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
      )}
    </AppLayout>
  );
}
