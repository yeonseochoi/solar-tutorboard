import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Section, LoadingState, EmptyState, ErrorState } from "@/components/Section";
import { Badge, statusTone, statusLabel } from "@/components/Badge";
import type { Student, Payment, LessonReport } from "@/lib/types";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/teacher/students")({
  component: StudentsPage,
});

function StudentsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher", "students"],
    queryFn: async () => {
      const [students, payments, reports] = await Promise.all([
        supabase
          .from("students")
          .select("*")
          .eq("tutor_id", DEMO_TUTOR_ID)
          .order("created_at", { ascending: false }),
        supabase.from("payments").select("*").eq("tutor_id", DEMO_TUTOR_ID),
        supabase.from("lesson_reports").select("*").eq("tutor_id", DEMO_TUTOR_ID),
      ]);
      const err = students.error || payments.error || reports.error;
      if (err) throw err;
      return {
        students: (students.data ?? []) as Student[],
        payments: (payments.data ?? []) as Payment[],
        reports: (reports.data ?? []) as LessonReport[],
      };
    },
  });

  return (
    <AppLayout variant="teacher" title="학생" subtitle="학생 목록과 운영 현황">
      <Section>
        {isLoading && <LoadingState />}
        {error && <ErrorState message={(error as Error).message} />}
        {data && data.students.length === 0 && (
          <EmptyState
            title="학생이 없습니다"
            description="홈에서 데모 데이터를 초기화하면 샘플 학생이 추가됩니다."
          />
        )}
        {data && data.students.length > 0 && (
          <div className="overflow-x-auto -m-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">학생명</th>
                  <th className="px-4 py-2 font-medium">학년</th>
                  <th className="px-4 py-2 font-medium">과목</th>
                  <th className="px-4 py-2 font-medium">학부모</th>
                  <th className="px-4 py-2 font-medium">연락처</th>
                  <th className="px-4 py-2 font-medium">최근 리포트</th>
                  <th className="px-4 py-2 font-medium">결제</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => {
                  const pay = data.payments.find((p) => p.student_id === s.id);
                  const hasReport = data.reports.some((r) => r.student_id === s.id);
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.grade}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.subject}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.parent_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.parent_contact}</td>
                      <td className="px-4 py-3">
                        {hasReport ? (
                          <Badge tone="info">있음</Badge>
                        ) : (
                          <Badge tone="muted">없음</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {pay ? (
                          <Badge tone={statusTone(pay.payment_status)}>
                            {statusLabel(pay.payment_status)}
                          </Badge>
                        ) : (
                          <Badge tone="muted">—</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/teacher/students/$studentId"
                          params={{ studentId: s.id }}
                          className="inline-flex items-center text-xs text-primary hover:underline"
                        >
                          상세 <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </AppLayout>
  );
}
