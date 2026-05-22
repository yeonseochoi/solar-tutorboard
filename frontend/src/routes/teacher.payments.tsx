import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Section, LoadingState, EmptyState, ErrorState } from "@/components/Section";
import { Badge, statusTone, statusLabel } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/types";
import type { Student, Payment } from "@/lib/types";
import { toast } from "sonner";
import { generate_payment_reminder, build_message_queue_mock } from "@/lib/agent";
import { Send, Loader2 } from "lucide-react";

export const Route = createFileRoute("/teacher/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher", "payments"],
    queryFn: async () => {
      const [students, payments] = await Promise.all([
        supabase.from("students").select("*").eq("tutor_id", DEMO_TUTOR_ID),
        supabase
          .from("payments")
          .select("*")
          .eq("tutor_id", DEMO_TUTOR_ID)
          .order("payment_due_date"),
      ]);
      if (students.error || payments.error) throw students.error || payments.error;
      return {
        students: (students.data ?? []) as Student[],
        payments: (payments.data ?? []) as Payment[],
      };
    },
  });

  const onGenerate = async (p: Payment) => {
    const student = data?.students.find((s) => s.id === p.student_id);
    if (!student) {
      toast.error("학생 정보를 찾을 수 없습니다");
      return;
    }
    setBusy(p.id);
    try {
      const res = await generate_payment_reminder({
        student_id: student.id,
        student_name: student.name,
        grade: student.grade,
        subject: student.subject,
        parent_name: student.parent_name,
        payment_status: p.payment_status,
        amount: p.amount,
        payment_due_date: formatDate(p.payment_due_date),
        class_count: p.class_count,
        next_class: formatDateTime(p.next_class),
      });
      if (!res.result.should_send) {
        toast.info("결제 완료 상태라 안내 메시지를 생성하지 않았습니다.");
        return;
      }
      const msg = await build_message_queue_mock({
        tutor_id: DEMO_TUTOR_ID,
        student_id: student.id,
        message_type: "payment_reminder",
        message_body: res.result.message_body,
      });
      const message = msg.result.messages[0];
      if (!message) throw new Error("message_queue Agent가 메시지를 반환하지 않았습니다.");
      const { error: merr } = await supabase.from("message_queue").insert(message);
      if (merr) throw merr;
      toast.success("결제 안내 메시지 생성 완료", {
        description: "메시지 큐에 대기 상태로 추가되었습니다.",
      });
      qc.invalidateQueries({ queryKey: ["teacher"] });
    } catch (e) {
      toast.error("생성 실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy("");
    }
  };

  return (
    <AppLayout variant="teacher" title="결제" subtitle="학생별 결제 상태 및 안내 메시지">
      <Section>
        {isLoading && <LoadingState />}
        {error && <ErrorState message={(error as Error).message} />}
        {data && data.payments.length === 0 && <EmptyState title="결제 내역이 없습니다" />}
        {data && data.payments.length > 0 && (
          <div className="overflow-x-auto -m-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">학생</th>
                  <th className="px-4 py-2 font-medium">상태</th>
                  <th className="px-4 py-2 font-medium">예정일</th>
                  <th className="px-4 py-2 font-medium">금액</th>
                  <th className="px-4 py-2 font-medium">회차</th>
                  <th className="px-4 py-2 font-medium">다음 수업</th>
                  <th className="px-4 py-2 text-right font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => {
                  const student = data.students.find((s) => s.id === p.student_id);
                  const isUnpaid = p.payment_status === "unpaid";
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{student?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(p.payment_status)}>
                          {statusLabel(p.payment_status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(p.payment_due_date)}
                      </td>
                      <td className="px-4 py-3">{p.amount.toLocaleString()}원</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.class_count}회</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(p.next_class)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isUnpaid ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onGenerate(p)}
                            disabled={busy === p.id}
                          >
                            {busy === p.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            결제 안내 생성
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">결제 완료</span>
                        )}
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
