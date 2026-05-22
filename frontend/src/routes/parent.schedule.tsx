import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { getParentStudentId } from "@/lib/parent-session";
import { AppLayout } from "@/components/AppLayout";
import { Section, LoadingState, EmptyState, ErrorState } from "@/components/Section";
import { Badge, statusTone, statusLabel } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/types";
import type { Schedule } from "@/lib/types";
import { toast } from "sonner";
import { Send } from "lucide-react";

export const Route = createFileRoute("/parent/schedule")({
  component: ScheduleRequest,
});

function ScheduleRequest() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const studentId = getParentStudentId();

  const { data, isLoading, error } = useQuery({
    queryKey: ["parent", "schedules", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("student_id", studentId)
        .order("available_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Schedule[];
    },
  });

  const available = (data ?? []).filter((s) => s.status === "available");
  const others = (data ?? []).filter((s) => s.status !== "available");

  const submit = async () => {
    if (!selected) {
      toast.error("원하는 시간을 선택해 주세요");
      return;
    }
    setSubmitting(true);
    try {
      const slot = available.find((s) => s.id === selected);
      const reqIso = slot ? slot.available_time : new Date().toISOString();
      const { error: uerr } = await supabase
        .from("schedules")
        .update({
          status: "requested",
          requested_time: reqIso,
        })
        .eq("id", selected);
      if (uerr) throw uerr;

      // 사유를 메시지 큐에 기록
      if (reason.trim()) {
        await supabase.from("message_queue").insert({
          tutor_id: DEMO_TUTOR_ID,
          student_id: studentId,
          message_type: "schedule_coordination",
          channel: "email_mock",
          message_status: "pending",
          message_body: `[일정 요청 사유] ${reason}`,
        });
      }
      toast.success("일정 요청 제출 완료");
      setSelected("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["parent"] });
    } catch (e) {
      toast.error("제출 실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      variant="parent"
      title="일정 요청"
      subtitle="가능 시간 중에서 원하는 수업 시간을 요청하세요"
    >
      <div className="space-y-5">
        <Section title="가능한 시간">
          {isLoading && <LoadingState />}
          {error && <ErrorState message={(error as Error).message} />}
          {!isLoading && available.length === 0 && <EmptyState title="가능한 시간이 없습니다" />}
          {available.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {available.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={`flex items-center justify-between rounded-md border p-3 text-sm transition-colors ${
                    selected === s.id ? "border-primary bg-primary/5" : "hover:border-primary/30"
                  }`}
                >
                  <span className="font-medium">{formatDateTime(s.available_time)}</span>
                  <Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section title="요청 사유 (선택)">
          <Label className="mb-1.5 block text-xs">메모</Label>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="시험 기간이라 시간 변경이 필요합니다 등"
          />
          <div className="mt-3">
            <Button onClick={submit} disabled={submitting || !selected}>
              <Send className="h-4 w-4" /> 요청 제출
            </Button>
          </div>
        </Section>

        {others.length > 0 && (
          <Section title="내 요청 / 확정 일정">
            <ul className="divide-y">
              {others.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm">
                    {formatDateTime(s.requested_time || s.available_time)}
                  </span>
                  <Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </AppLayout>
  );
}
