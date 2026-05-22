import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase, DEMO_TUTOR_ID, DEMO_STUDENT_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "@/components/Section";
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
import { formatDate } from "@/lib/types";
import type { Schedule, Student, ScheduleStatus } from "@/lib/types";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  X,
} from "lucide-react";

export const Route = createFileRoute("/teacher/schedule")({
  component: SchedulePage,
});

function SchedulePage() {
  const qc = useQueryClient();
  const todayKey = formatDate(new Date().toISOString());
  const [newDate, setNewDate] = useState(todayKey);
  const [startTime, setStartTime] = useState("20:00");
  const [endTime, setEndTime] = useState("21:00");
  const [newMemo, setNewMemo] = useState("");
  const [forStudent, setForStudent] = useState(DEMO_STUDENT_ID);
  const [autoSelected, setAutoSelected] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher", "schedules"],
    queryFn: async () => {
      const [students, schedules] = await Promise.all([
        supabase.from("students").select("*").eq("tutor_id", DEMO_TUTOR_ID).order("name"),
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

  const studentsById = useMemo(() => {
    const map = new Map<string, Student>();
    for (const student of data?.students ?? []) map.set(student.id, student);
    return map;
  }, [data?.students]);

  const selectedSchedules = useMemo(
    () =>
      (data?.schedules ?? [])
        .filter((schedule) => formatDate(scheduleTime(schedule)) === selectedDate)
        .sort((a, b) => scheduleTime(a).localeCompare(scheduleTime(b))),
    [data?.schedules, selectedDate],
  );

  const counts = useMemo(() => {
    const base: Record<ScheduleStatus, number> = {
      available: 0,
      requested: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };
    for (const schedule of selectedSchedules) base[schedule.status] += 1;
    return base;
  }, [selectedSchedules]);

  const selectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    setNewDate(dateKey);
  };

  useEffect(() => {
    if (autoSelected || !data?.schedules.length) return;
    const scheduleDates = data.schedules
      .map((schedule) => formatDate(scheduleTime(schedule)))
      .filter(Boolean)
      .sort();
    const nextDate = scheduleDates.find((dateKey) => dateKey >= todayKey) ?? scheduleDates[0];
    if (!nextDate) return;
    const nextMonth = new Date(`${nextDate}T00:00:00`);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    setMonthCursor(nextMonth);
    setSelectedDate(nextDate);
    setNewDate(nextDate);
    setAutoSelected(true);
  }, [autoSelected, data?.schedules, todayKey]);

  const goToday = () => {
    const now = new Date();
    const key = formatDate(now.toISOString());
    const month = new Date(now);
    month.setDate(1);
    month.setHours(0, 0, 0, 0);
    setMonthCursor(month);
    selectDate(key);
  };

  const addSlot = async () => {
    if (!newDate || !startTime) {
      toast.error("날짜와 시작 시간을 선택해 주세요");
      return;
    }
    try {
      const availableTime = new Date(`${newDate}T${startTime}:00`);
      const { error: ierr } = await supabase.from("schedules").insert({
        tutor_id: DEMO_TUTOR_ID,
        student_id: forStudent,
        available_time: availableTime.toISOString(),
        requested_time: null,
        status: "available",
      });
      if (ierr) throw ierr;
      toast.success("가능 시간이 등록되었습니다");
      selectDate(newDate);
      setNewMemo("");
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
      toast.success(status === "approved" ? "일정을 승인했습니다" : "상태를 변경했습니다");
      qc.invalidateQueries({ queryKey: ["teacher", "schedules"] });
    } catch (e) {
      toast.error("실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const studentName = (id: string) => studentsById.get(id)?.name ?? "학생";

  return (
    <AppLayout
      variant="teacher"
      title="일정 관리"
      subtitle="수업 가능 시간과 요청 일정을 한눈에 관리"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          className="bg-[oklch(0.53_0.22_275)] shadow-sm hover:bg-[oklch(0.48_0.22_275)]"
          onClick={() => {
            setNewDate(selectedDate);
            setStartTime("20:00");
            setEndTime("21:00");
          }}
        >
          <Plus className="h-4 w-4" /> 가능 시간 추가
        </Button>
        <Button variant="outline" onClick={goToday}>
          <CalendarDays className="h-4 w-4" /> 오늘로 이동
        </Button>
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      <div className="grid gap-5 [@media(min-width:1200px)]:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.85fr)]">
        <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <header className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setMonthCursor(addMonths(monthCursor, -1))}
                aria-label="이전 달"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
                aria-label="다음 달"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-center text-xl font-bold md:text-2xl">
              {monthCursor.getFullYear()}년 {monthCursor.getMonth() + 1}월
            </h2>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={goToday}>
                오늘
              </Button>
              <Button size="sm" variant="outline">
                월간 보기 <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </header>

          {isLoading && <LoadingState />}
          {data && (
            <MonthCalendar
              cursor={monthCursor}
              schedules={data.schedules}
              selectedDate={selectedDate}
              todayKey={todayKey}
              onSelect={selectDate}
              studentName={studentName}
            />
          )}
        </section>

        <div className="space-y-5">
          <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <header className="border-b px-5 py-5">
              <h2 className="text-xl font-bold md:text-2xl">{formatKoreanDate(selectedDate)}</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <SummaryChip tone="success" label="승인" value={counts.approved} />
                <SummaryChip tone="warning" label="요청" value={counts.requested} />
                <SummaryChip tone="info" label="가능" value={counts.available} />
              </div>
            </header>

            {!data ? null : selectedSchedules.length === 0 ? (
              <EmptyState
                title="선택한 날짜에 일정이 없습니다"
                description="가능 시간을 등록하거나 다른 날짜를 선택해 주세요."
              />
            ) : (
              <div className="divide-y">
                {selectedSchedules.map((schedule) => (
                  <AgendaItem
                    key={schedule.id}
                    schedule={schedule}
                    student={studentsById.get(schedule.student_id)}
                    onApprove={() => setStatus(schedule.id, "approved")}
                    onReject={() => setStatus(schedule.id, "rejected")}
                    onCancel={() => setStatus(schedule.id, "cancelled")}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">새 가능 시간 등록</h2>
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium">학생</Label>
                <Select value={forStudent} onValueChange={setForStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="학생을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.students ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} · {s.grade} {s.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                <div className="sm:col-span-2 2xl:col-span-1">
                  <Label className="mb-1.5 block text-sm font-medium">날짜</Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">시작 시간</Label>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">종료 시간</Label>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 2xl:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">과목</Label>
                  <Select value={studentsById.get(forStudent)?.subject ?? ""} disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="과목을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={studentsById.get(forStudent)?.subject ?? "subject"}>
                        {studentsById.get(forStudent)?.subject ?? "과목"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">메모</Label>
                  <Input
                    value={newMemo}
                    onChange={(e) => setNewMemo(e.target.value)}
                    placeholder="메모를 입력하세요"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  className="min-w-32 bg-[oklch(0.53_0.22_275)] hover:bg-[oklch(0.48_0.22_275)]"
                  onClick={addSlot}
                >
                  등록
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function MonthCalendar({
  cursor,
  schedules,
  selectedDate,
  todayKey,
  onSelect,
  studentName,
}: {
  cursor: Date;
  schedules: Schedule[];
  selectedDate: string;
  todayKey: string;
  onSelect: (date: string) => void;
  studentName: (id: string) => string;
}) {
  const days = buildMonthDays(cursor);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return (
    <div>
      <div className="grid grid-cols-7 border-b bg-muted/20 text-center text-sm font-semibold text-foreground">
        {weekdays.map((day) => (
          <div key={day} className="py-3">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = formatDate(day.toISOString());
          const inMonth = day.getMonth() === cursor.getMonth();
          const daySchedules = schedules
            .filter((schedule) => formatDate(scheduleTime(schedule)) === key)
            .sort((a, b) => scheduleTime(a).localeCompare(scheduleTime(b)));
          const selected = selectedDate === key;
          const today = todayKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={`relative min-h-24 border-b border-r p-1.5 text-left transition-colors hover:bg-muted/30 2xl:min-h-28 2xl:p-3 ${
                selected
                  ? "z-10 border-[oklch(0.58_0.22_275)] bg-[oklch(0.97_0.025_275)] shadow-[inset_0_0_0_1px_oklch(0.58_0.22_275)]"
                  : "bg-card"
              } ${inMonth ? "" : "text-muted-foreground/65"}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`grid h-6 min-w-6 place-items-center rounded-full text-sm font-semibold ${
                    selected
                      ? "bg-[oklch(0.56_0.22_275)] text-white"
                      : today
                        ? "ring-1 ring-[oklch(0.56_0.22_275)]"
                        : ""
                  } ${day.getDay() === 0 ? "text-destructive" : ""}`}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-1.5">
                {daySchedules.slice(0, 3).map((schedule) => (
                  <SchedulePill
                    key={schedule.id}
                    schedule={schedule}
                    label={studentName(schedule.student_id)}
                  />
                ))}
                {daySchedules.length > 3 && (
                  <div className="pl-1 text-xs font-medium text-muted-foreground">
                    +{daySchedules.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <Legend />
    </div>
  );
}

function SchedulePill({ schedule, label }: { schedule: Schedule; label: string }) {
  return (
    <div
      className={`truncate rounded px-0.5 py-1 text-[9px] font-semibold 2xl:px-2 2xl:text-xs ${scheduleColor(
        schedule.status,
      )}`}
      title={`${formatTime(scheduleTime(schedule))} ${label}`}
    >
      {formatTime(scheduleTime(schedule))} {schedule.status === "available" ? "가능" : label}
    </div>
  );
}

function AgendaItem({
  schedule,
  student,
  onApprove,
  onReject,
  onCancel,
}: {
  schedule: Schedule;
  student?: Student;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
}) {
  const time = scheduleTime(schedule);
  const requested = schedule.status === "requested";
  const available = schedule.status === "available";
  return (
    <div className="grid gap-3 px-5 py-5 sm:grid-cols-[64px_minmax(0,1fr)] sm:items-start">
      <div className="whitespace-nowrap text-base font-semibold">{formatTime(time)}</div>
      <div className="min-w-0 border-l pl-4">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="whitespace-nowrap text-base font-semibold">
              {student?.name ?? "학생"}
            </div>
            <Badge tone={statusTone(schedule.status)}>{statusLabel(schedule.status)}</Badge>
            <div className="ml-auto whitespace-nowrap text-sm text-muted-foreground">
              {student ? `${student.grade} ${student.subject}` : ""}
            </div>
          </div>
          <div className="break-keep text-sm leading-relaxed text-muted-foreground">
            {scheduleMessage(schedule)}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          {requested && (
            <>
              <Button size="sm" variant="outline" onClick={onApprove}>
                <Check className="h-4 w-4 text-[oklch(0.45_0.15_155)]" /> 승인
              </Button>
              <Button size="sm" variant="outline" onClick={onReject}>
                <X className="h-4 w-4 text-destructive" /> 거절
              </Button>
            </>
          )}
          {available && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              취소
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryChip({
  tone,
  label,
  value,
}: {
  tone: "success" | "warning" | "info";
  label: string;
  value: number;
}) {
  const classes = {
    success: "bg-[oklch(0.95_0.04_155)] text-[oklch(0.38_0.13_155)]",
    warning: "bg-[oklch(0.96_0.05_75)] text-[oklch(0.47_0.15_65)]",
    info: "bg-[oklch(0.95_0.04_255)] text-[oklch(0.42_0.17_255)]",
  };
  return (
    <span className={`rounded-md px-3 py-1.5 text-sm font-bold ${classes[tone]}`}>
      {label} {value}
    </span>
  );
}

function Legend() {
  const items: Array<{ status: ScheduleStatus; label: string }> = [
    { status: "available", label: "가능 (available)" },
    { status: "requested", label: "요청 (requested)" },
    { status: "approved", label: "승인 (approved)" },
    { status: "rejected", label: "거절 (rejected)" },
    { status: "cancelled", label: "취소 (cancelled)" },
  ];
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 border-t px-5 py-4 text-sm">
      {items.map((item) => (
        <div key={item.status} className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${legendDot(item.status)}`} />
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
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

function scheduleTime(schedule: Schedule) {
  return schedule.available_time || schedule.requested_time || "";
}

function formatTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso.slice(11, 16);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatKoreanDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (isNaN(date.getTime())) return dateKey;
  const weekday = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"][
    date.getDay()
  ];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}`;
}

function scheduleMessage(schedule: Schedule) {
  switch (schedule.status) {
    case "requested":
      return "학부모 요청: 가능한 시간으로 조율을 요청했습니다.";
    case "approved":
      return "정기 수업 · 지난 수업 리포트 확인 완료";
    case "available":
      return "선생님 가능 시간";
    case "rejected":
      return "요청이 거절된 일정입니다.";
    case "cancelled":
      return "취소된 일정입니다.";
    default:
      return "";
  }
}

function scheduleColor(status: ScheduleStatus) {
  switch (status) {
    case "available":
      return "bg-[oklch(0.94_0.04_255)] text-[oklch(0.42_0.17_255)]";
    case "requested":
      return "bg-[oklch(0.96_0.05_75)] text-[oklch(0.48_0.15_65)]";
    case "approved":
      return "bg-[oklch(0.94_0.05_155)] text-[oklch(0.37_0.13_155)]";
    case "rejected":
      return "bg-[oklch(0.96_0.04_25)] text-[oklch(0.45_0.18_25)]";
    case "cancelled":
      return "bg-muted text-muted-foreground";
  }
}

function legendDot(status: ScheduleStatus) {
  switch (status) {
    case "available":
      return "bg-[oklch(0.56_0.22_255)]";
    case "requested":
      return "bg-[oklch(0.72_0.17_65)]";
    case "approved":
      return "bg-[oklch(0.56_0.16_155)]";
    case "rejected":
      return "bg-destructive";
    case "cancelled":
      return "bg-muted-foreground";
  }
}
