import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { formatDate, formatDateTime } from "@/lib/types";
import type { Schedule, Student, ScheduleStatus } from "@/lib/types";
import { toast } from "sonner";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, X } from "lucide-react";

export const Route = createFileRoute("/teacher/schedule")({
  component: SchedulePage,
});

function SchedulePage() {
  const qc = useQueryClient();
  const [newTime, setNewTime] = useState("");
  const [forStudent, setForStudent] = useState(DEMO_STUDENT_ID);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date().toISOString()));

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

  const selectedSchedules = useMemo(
    () =>
      (data?.schedules ?? []).filter(
        (schedule) =>
          formatDate(schedule.available_time || schedule.requested_time) === selectedDate,
      ),
    [data?.schedules, selectedDate],
  );

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
        requested_time: null,
        status: "available",
      });
      if (ierr) throw ierr;
      toast.success("일정 추가 완료");
      setSelectedDate(formatDate(new Date(newTime).toISOString()));
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

  const studentName = (id: string) => data?.students.find((s) => s.id === id)?.name ?? "학생";

  return (
    <AppLayout
      variant="teacher"
      title="일정 관리"
      subtitle="월간 달력으로 수업 가능 시간과 요청 확인"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <Section
          title={`월간 캘린더 · ${monthCursor.getFullYear()}년 ${monthCursor.getMonth() + 1}월`}
          actions={
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMonthCursor(addMonths(monthCursor, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          }
        >
          {isLoading && <LoadingState />}
          {error && <ErrorState message={(error as Error).message} />}
          {data && (
            <MonthCalendar
              cursor={monthCursor}
              schedules={data.schedules}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
              studentName={studentName}
            />
          )}
        </Section>

        <div className="space-y-5">
          <Section title="새 가능 시간 등록">
            <div className="space-y-3">
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
              <Button className="w-full" onClick={addSlot}>
                <CalendarPlus className="h-4 w-4" /> 추가
              </Button>
            </div>
          </Section>

          <Section title={`선택 날짜 일정 · ${selectedDate}`}>
            {!data ? null : selectedSchedules.length === 0 ? (
              <EmptyState title="선택한 날짜에 일정이 없습니다" />
            ) : (
              <div className="space-y-3">
                {selectedSchedules.map((schedule) => (
                  <div key={schedule.id} className="rounded-md border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{studentName(schedule.student_id)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(schedule.available_time || schedule.requested_time)}
                        </div>
                        {schedule.requested_time && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            요청 시간 {formatDateTime(schedule.requested_time)}
                          </div>
                        )}
                      </div>
                      <Badge tone={statusTone(schedule.status)}>
                        {statusLabel(schedule.status)}
                      </Badge>
                    </div>
                    {schedule.status === "requested" && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(schedule.id, "approved")}
                        >
                          <Check className="h-3.5 w-3.5" /> 승인
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatus(schedule.id, "rejected")}
                        >
                          <X className="h-3.5 w-3.5" /> 거절
                        </Button>
                      </div>
                    )}
                    {schedule.status === "available" && (
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatus(schedule.id, "cancelled")}
                      >
                        취소
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </AppLayout>
  );
}

function MonthCalendar({
  cursor,
  schedules,
  selectedDate,
  onSelect,
  studentName,
}: {
  cursor: Date;
  schedules: Schedule[];
  selectedDate: string;
  onSelect: (date: string) => void;
  studentName: (id: string) => string;
}) {
  const days = buildMonthDays(cursor);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return (
    <div>
      <div className="grid grid-cols-7 border-b pb-2 text-center text-xs font-medium text-muted-foreground">
        {weekdays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = formatDate(day.toISOString());
          const inMonth = day.getMonth() === cursor.getMonth();
          const daySchedules = schedules.filter(
            (schedule) => formatDate(schedule.available_time || schedule.requested_time) === key,
          );
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={`min-h-32 rounded-md border p-2 text-left transition-colors ${
                selectedDate === key
                  ? "border-primary bg-primary/5"
                  : "bg-background hover:bg-muted/40"
              } ${inMonth ? "" : "opacity-45"}`}
            >
              <div className="text-xs font-semibold">{day.getDate()}</div>
              <div className="mt-2 space-y-1">
                {daySchedules.slice(0, 3).map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`truncate rounded px-1.5 py-1 text-[10px] font-medium ${scheduleColor(
                      schedule.status,
                    )}`}
                  >
                    {studentName(schedule.student_id)}
                  </div>
                ))}
                {daySchedules.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">
                    +{daySchedules.length - 3}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
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

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(date.getMonth() + amount);
  return next;
}

function scheduleColor(status: string) {
  switch (status) {
    case "available":
      return "bg-[oklch(0.94_0.04_255)] text-[oklch(0.42_0.15_255)]";
    case "requested":
      return "bg-[oklch(0.96_0.05_75)] text-[oklch(0.45_0.14_60)]";
    case "approved":
      return "bg-[oklch(0.94_0.05_155)] text-[oklch(0.36_0.12_155)]";
    case "rejected":
      return "bg-[oklch(0.96_0.04_25)] text-[oklch(0.42_0.18_25)]";
    default:
      return "bg-muted text-muted-foreground";
  }
}
