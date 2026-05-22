import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Section, LoadingState, EmptyState, ErrorState } from "@/components/Section";
import { Badge, statusTone, statusLabel } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Student, Payment, LessonReport, MessageQueue, Schedule } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/types";
import { ChevronRight, Search, SlidersHorizontal, UserPlus } from "lucide-react";

export const Route = createFileRoute("/teacher/students/")({
  component: StudentsPage,
});

function StudentsPage() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher", "students"],
    queryFn: async () => {
      const [students, payments, reports, msgs, schedules] = await Promise.all([
        supabase
          .from("students")
          .select("*")
          .eq("tutor_id", DEMO_TUTOR_ID)
          .order("created_at", { ascending: false }),
        supabase.from("payments").select("*").eq("tutor_id", DEMO_TUTOR_ID),
        supabase
          .from("lesson_reports")
          .select("*")
          .eq("tutor_id", DEMO_TUTOR_ID)
          .order("created_at", { ascending: false }),
        supabase.from("message_queue").select("*").eq("tutor_id", DEMO_TUTOR_ID),
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

  const subjects = useMemo(() => {
    const values = new Set((data?.students ?? []).map((s) => s.subject));
    return ["all", ...Array.from(values)];
  }, [data?.students]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.students
      .map((student) => {
        const payment = data.payments.find((p) => p.student_id === student.id);
        const latestReport = data.reports.find((r) => r.student_id === student.id);
        const nextSchedule = data.schedules.find(
          (s) => s.student_id === student.id && s.status !== "cancelled" && s.status !== "rejected",
        );
        const pendingMessages = data.msgs.filter(
          (m) => m.student_id === student.id && m.message_status === "pending",
        ).length;
        return { student, payment, latestReport, nextSchedule, pendingMessages };
      })
      .filter(({ student, payment }) => {
        const text =
          `${student.name} ${student.grade} ${student.subject} ${student.parent_name} ${student.parent_contact}`.toLowerCase();
        const matchesText = text.includes(query.trim().toLowerCase());
        const matchesSubject = subject === "all" || student.subject === subject;
        const matchesPayment = paymentStatus === "all" || payment?.payment_status === paymentStatus;
        return matchesText && matchesSubject && matchesPayment;
      });
  }, [data, paymentStatus, query, subject]);

  return (
    <AppLayout variant="teacher" title="학생 관리" subtitle="학생별 수업, 결제, 메시지 상태">
      <Section
        title="학생 목록"
        description="학생을 클릭하면 상세 관리 화면으로 이동합니다."
        actions={
          <Button size="sm" variant="outline">
            <UserPlus className="h-4 w-4" /> 학생 추가
          </Button>
        }
      >
        <div className="mb-4 grid gap-2 lg:grid-cols-[1fr_160px_160px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="학생, 학년, 과목, 학부모 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger>
              <SelectValue placeholder="과목" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "all" ? "전체 과목" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger>
              <SelectValue placeholder="결제" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 결제</SelectItem>
              <SelectItem value="paid">결제 완료</SelectItem>
              <SelectItem value="unpaid">미결제</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <LoadingState />}
        {error && <ErrorState message={(error as Error).message} />}
        {data && rows.length === 0 && (
          <EmptyState
            title="조건에 맞는 학생이 없습니다"
            description="검색어와 필터를 다시 확인해 주세요."
          />
        )}
        {data && rows.length > 0 && (
          <>
            <div className="hidden overflow-x-auto rounded-md border md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">학생</th>
                    <th className="px-4 py-2 font-medium">학부모</th>
                    <th className="px-4 py-2 font-medium">결제</th>
                    <th className="px-4 py-2 font-medium">다음 수업</th>
                    <th className="px-4 py-2 font-medium">최근 리포트</th>
                    <th className="px-4 py-2 font-medium">대기 메시지</th>
                    <th className="px-4 py-2 text-right font-medium">
                      <SlidersHorizontal className="ml-auto h-4 w-4" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ student, payment, latestReport, nextSchedule, pendingMessages }) => (
                    <tr key={student.id} className="border-t hover:bg-muted/35">
                      <td className="px-4 py-3">
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {student.grade} · {student.subject}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{student.parent_name}</div>
                        <div className="text-xs">{student.parent_contact}</div>
                      </td>
                      <td className="px-4 py-3">
                        {payment ? (
                          <Badge tone={statusTone(payment.payment_status)}>
                            {statusLabel(payment.payment_status)}
                          </Badge>
                        ) : (
                          <Badge tone="muted">없음</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {nextSchedule
                          ? formatDateTime(
                              nextSchedule.available_time || nextSchedule.requested_time,
                            )
                          : "등록 필요"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {latestReport ? formatDate(latestReport.created_at) : "리포트 없음"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={pendingMessages > 0 ? "warning" : "muted"}>
                          {pendingMessages}건
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/teacher/students/$studentId"
                          params={{ studentId: student.id }}
                          className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                        >
                          상세 <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {rows.map(({ student, payment, latestReport, nextSchedule, pendingMessages }) => (
                <Link
                  key={student.id}
                  to="/teacher/students/$studentId"
                  params={{ studentId: student.id }}
                  className="block rounded-md border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {student.grade} · {student.subject}
                      </div>
                    </div>
                    {payment && (
                      <Badge tone={statusTone(payment.payment_status)}>
                        {statusLabel(payment.payment_status)}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                    <div>학부모: {student.parent_name}</div>
                    <div>
                      다음 수업:{" "}
                      {nextSchedule
                        ? formatDateTime(nextSchedule.available_time || nextSchedule.requested_time)
                        : "등록 필요"}
                    </div>
                    <div>
                      최근 리포트: {latestReport ? formatDate(latestReport.created_at) : "없음"}
                    </div>
                    <div>대기 메시지: {pendingMessages}건</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Section>
    </AppLayout>
  );
}
