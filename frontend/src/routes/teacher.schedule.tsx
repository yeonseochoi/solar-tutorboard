import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, DEMO_TUTOR_ID, DEMO_STUDENT_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Section, LoadingState, EmptyState, ErrorState } from "@/components/Section";
import { Badge, statusTone, statusLabel } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/types";
import type { Schedule, Student, ScheduleStatus } from "@/lib/types";
import { toast } from "sonner";
import { CalendarPlus, Check, X } from "lucide-react";

export const Route = createFileRoute("/teacher/schedule")({
  component: SchedulePage,
});

function SchedulePage() {
  const qc = useQueryClient();
  const [newTime, setNewTime] = useState("");
  const [forStudent, setForStudent] = useState(DEMO_STUDENT_ID);

  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher", "schedules"],
    queryFn: async () => {
      const [students, schedules] = await Promise.all([
        supabase.from("students").select("*").eq("tutor_id", DEMO_TUTOR_ID),
        supabase
          .from("schedules")
          .select("*")
          .eq("tutor_id", DEMO_TUTOR_ID)
          .order("available_time", { ascending: true }),
      ]);
      if (students.error || schedules.error) throw students.error || schedules.error;
      return {
        students: (students.data ?? []) as Student[],
        schedules: (schedules.data ?? []) as Schedule[],
      };
    },
  });

  const addSlot = async () => {
    if (!newTime) {
      toast.error("시간을 선택해 주세요");
      return;
    }
    try {
      const { error: ierr } = await supabase.from("schedules").insert({
        tutor_id: DEMO_TUTOR_ID,
        student_id: forStudent,
        available_time: new Date(newTime).toISOString(),
        requested_time: "",
        status: "available",
      });
      if (ierr) throw ierr;
      toast.success("일정 추가 완료");
      setNewTime("");
      qc.invalidateQueries({ queryKey: ["teacher", "schedules"] });
    } catch (e) {
      toast.error("일정 추가 실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const setStatus = async (id: string, status: ScheduleStatus) => {
    try {
      const { error: uerr } = await supabase.from("schedules").update({ status }).eq("id", id);
      if (uerr) throw uerr;
      toast.success("상태 변경");
      qc.invalidateQueries({ queryKey: ["teacher", "schedules"] });
    } catch (e) {
      toast.error("실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <AppLayout variant="teacher" title="일정" subtitle="수업 가능 시간과 요청 관리">
      <div className="space-y-5">
        <Section title="새 가능 시간 추가">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
            <div>
              <Label className="mb-1.5 block text-xs">학생</Label>
              <Select value={forStudent} onValueChange={setForStudent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(data?.students ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">가능 시간</Label>
              <Input
                type="datetime-local"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
            <Button onClick={addSlot}>
              <CalendarPlus className="h-4 w-4" /> 추가
            </Button>
          </div>
        </Section>

        <Section title="일정 목록">
          {isLoading && <LoadingState />}
          {error && <ErrorState message={(error as Error).message} />}
          {data && data.schedules.length === 0 && <EmptyState title="등록된 일정이 없습니다" />}
          {data && data.schedules.length > 0 && (
            <ul className="divide-y">
              {data.schedules.map((s) => {
                const student = data.students.find((st) => st.id === s.student_id);
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {student?.name ?? "—"} ·{" "}
                        {formatDateTime(s.available_time || s.requested_time)}
                      </div>
                      {s.requested_time && s.available_time && (
                        <div className="text-xs text-muted-foreground">
                          요청: {formatDateTime(s.requested_time)}
                        </div>
                      )}
                    </div>
                    <Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
                    {s.status === "requested" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(s.id, "approved")}
                        >
                          <Check className="h-3.5 w-3.5" /> 승인
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatus(s.id, "rejected")}
                        >
                          <X className="h-3.5 w-3.5" /> 거절
                        </Button>
                      </>
                    )}
                    {s.status === "available" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatus(s.id, "cancelled")}
                      >
                        취소
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </AppLayout>
  );
}
