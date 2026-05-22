import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { LoadingState, ErrorState } from "@/components/Section";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Copy, Loader2, RotateCcw, Wand2 } from "lucide-react";
import {
  generate_lesson_report,
  build_message_queue_mock,
  type LessonReportResult,
} from "@/lib/agent";
import type { Student } from "@/lib/types";

type Search = { studentId?: string };
type Understanding = "좋음" | "보통" | "어려움";

const HOMEWORK_TOTAL = 15;
const understandingOptions: Understanding[] = ["좋음", "보통", "어려움"];
const weaknessOptions = ["계산 실수", "개념 이해", "문제 접근", "숙제 미완료"];
const defaultTeacherMemo =
  "로그 계산 실수가 반복되어 다음 시간에 지수-로그 연결 문제를 보강할 예정";

export const Route = createFileRoute("/teacher/lesson-report")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    studentId: typeof s.studentId === "string" ? s.studentId : undefined,
  }),
  component: LessonReportGenerator,
});

function LessonReportGenerator() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState<string>(search.studentId ?? "");
  const [lessonDate, setLessonDate] = useState<string>(todayInputDate());
  const [understanding, setUnderstanding] = useState<Understanding>("보통");
  const [homeworkPercent, setHomeworkPercent] = useState(60);
  const [weaknesses, setWeaknesses] = useState<string[]>(["계산 실수", "개념 이해"]);
  const [memo, setMemo] = useState(defaultTeacherMemo);
  const [result, setResult] = useState<LessonReportResult["result"] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    data: students,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["teacher", "students-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("tutor_id", DEMO_TUTOR_ID)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });

  useEffect(() => {
    if (!studentId && students && students.length > 0) {
      setStudentId(students[0].id);
    }
  }, [students, studentId]);

  const selectedStudent = students?.find((s) => s.id === studentId);
  const homeworkDone = Math.round((HOMEWORK_TOTAL * homeworkPercent) / 100);
  const homeworkStatusText = `${HOMEWORK_TOTAL}문제 중 ${homeworkDone}문제 완료`;
  const weaknessText = weaknesses.length ? weaknesses.join(", ") : "특이사항 없음";
  const composedLessonMemo = useMemo(
    () =>
      [
        `이해도: ${understanding}`,
        `숙제 상태: ${homeworkStatusText} (${homeworkPercent}%)`,
        `취약 포인트: ${weaknessText}`,
        `선생님 메모: ${memo.trim() || "별도 메모 없음"}`,
      ].join("\n"),
    [homeworkPercent, homeworkStatusText, memo, understanding, weaknessText],
  );

  const onGenerate = async () => {
    if (!selectedStudent) {
      toast.error("학생을 선택해 주세요");
      return;
    }
    if (!memo.trim()) {
      toast.error("선생님 메모를 입력해 주세요");
      return;
    }
    setGenerating(true);
    try {
      const res = await generate_lesson_report({
        student_id: selectedStudent.id,
        student_name: selectedStudent.name,
        grade: selectedStudent.grade,
        subject: selectedStudent.subject,
        parent_name: selectedStudent.parent_name,
        lesson_date: lessonDate,
        lesson_memo: composedLessonMemo,
      });
      setResult(res.result);
      toast.success("AI 리포트 생성 완료");
    } catch (e) {
      toast.error("리포트 생성 실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setGenerating(false);
    }
  };

  const onSave = async () => {
    if (!selectedStudent || !result) return;
    setSaving(true);
    try {
      const { error: rerr } = await supabase.from("lesson_reports").insert({
        tutor_id: DEMO_TUTOR_ID,
        student_id: selectedStudent.id,
        lesson_memo: composedLessonMemo,
        progress: result.progress,
        weakness: result.weakness,
        homework_status: result.homework_status,
        next_plan: result.next_plan,
        parent_report: result.parent_report,
      });
      if (rerr) throw rerr;

      const msg = await build_message_queue_mock({
        tutor_id: DEMO_TUTOR_ID,
        student_id: selectedStudent.id,
        message_type: "lesson_report",
        message_body: result.parent_report,
      });
      const message = msg.result.messages[0];
      if (!message) throw new Error("message_queue Agent가 메시지를 반환하지 않았습니다.");
      const { error: merr } = await supabase.from("message_queue").insert(message);
      if (merr) throw merr;

      toast.success("리포트 저장 완료", {
        description: "메시지 큐에도 대기 상태로 추가되었습니다.",
      });
      setResult(null);
      qc.invalidateQueries();
    } catch (e) {
      toast.error("저장 실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    setLessonDate(todayInputDate());
    setUnderstanding("보통");
    setHomeworkPercent(60);
    setWeaknesses(["계산 실수", "개념 이해"]);
    setMemo(defaultTeacherMemo);
    setResult(null);
  };

  const onCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.parent_report);
      toast.success("학부모 메시지를 복사했습니다");
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  const toggleWeakness = (option: string) => {
    setWeaknesses((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  };

  return (
    <AppLayout
      variant="teacher"
      title="수업 리포트 생성"
      subtitle="빠른 수업 기록으로 AI 학부모 리포트를 생성"
    >
      {error && <ErrorState message={(error as Error).message} />}
      <div className="grid gap-5 min-[1240px]:grid-cols-[minmax(430px,0.95fr)_minmax(500px,1.05fr)] 2xl:grid-cols-[minmax(440px,0.9fr)_minmax(560px,1.2fr)]">
        <section className="rounded-lg border bg-card shadow-sm">
          <header className="border-b px-4 py-3.5">
            <div>
              <h2 className="text-lg font-bold tracking-tight">빠른 수업 기록</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                필수 항목만 입력하면 AI 리포트가 자동 생성됩니다.
              </p>
            </div>
          </header>

          <div className="space-y-3.5 p-4">
            {isLoading && <LoadingState />}
            {students && (
              <>
                <RecordStep number={1} label="학생 / 날짜">
                  <div className="grid gap-2 sm:grid-cols-[1.1fr_1fr]">
                    <Select value={studentId} onValueChange={setStudentId}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="학생 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} · {s.grade} {s.subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-10 text-sm"
                      type="date"
                      value={lessonDate}
                      onChange={(e) => setLessonDate(e.target.value)}
                    />
                  </div>
                </RecordStep>

                <RecordStep number={2} label="이해도">
                  <div className="grid grid-cols-3 gap-2">
                    {understandingOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setUnderstanding(option)}
                        className={`h-10 rounded-md border text-sm font-semibold transition-colors ${
                          understanding === option
                            ? "border-primary bg-primary/5 text-primary shadow-[inset_0_0_0_1px_var(--color-primary)]"
                            : "bg-background hover:bg-muted/40"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </RecordStep>

                <RecordStep number={3} label="숙제 상태" compact>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium">{homeworkStatusText}</span>
                      <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                        {homeworkPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={homeworkPercent}
                      onChange={(e) => setHomeworkPercent(Number(e.target.value))}
                      className="h-1.5 w-full accent-primary"
                      aria-label="숙제 완료율"
                    />
                  </div>
                </RecordStep>

                <RecordStep number={4} label="취약 포인트">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {weaknessOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleWeakness(option)}
                        className={`h-9 rounded-md border px-2 text-xs font-medium transition-colors ${
                          weaknesses.includes(option)
                            ? "border-primary bg-primary/5 text-primary"
                            : "bg-background hover:bg-muted/30"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </RecordStep>

                <RecordStep number={5} label="선생님 메모">
                  <div>
                    <Textarea
                      className="min-h-[150px] resize-none text-sm leading-6"
                      maxLength={200}
                      placeholder="수업 중 관찰한 내용, 다음 시간 보강 계획, 학부모에게 전달할 뉘앙스를 적어주세요."
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                    />
                    <div className="mt-1 text-right text-[11px] text-muted-foreground">
                      {memo.length}/200
                    </div>
                  </div>
                </RecordStep>

                <div className="border-t pt-4">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1.35fr)_0.9fr_0.95fr]">
                    <Button className="h-11 text-sm" onClick={onGenerate} disabled={generating}>
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                      AI 리포트 생성
                    </Button>
                    <Button className="h-11 text-sm" variant="outline" onClick={onReset}>
                      <RotateCcw className="h-4 w-4" />
                      초기화
                    </Button>
                    <Button
                      className="h-11 border-[oklch(0.7_0.12_155)] text-sm text-[oklch(0.42_0.13_155)] hover:bg-[oklch(0.97_0.03_155)]"
                      variant="outline"
                      onClick={onSave}
                      disabled={!result || saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      결과 저장
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <ReportPreview
          result={result}
          selectedStudent={selectedStudent}
          lessonDate={lessonDate}
          understanding={understanding}
          homeworkStatusText={homeworkStatusText}
          teacherMemo={memo}
          weaknessText={weaknessText}
          onCopy={onCopy}
          onGenerate={onGenerate}
          generating={generating}
        />
      </div>
    </AppLayout>
  );
}

function ReportPreview({
  result,
  selectedStudent,
  lessonDate,
  understanding,
  homeworkStatusText,
  teacherMemo,
  weaknessText,
  onCopy,
  onGenerate,
  generating,
}: {
  result: LessonReportResult["result"] | null;
  selectedStudent?: Student;
  lessonDate: string;
  understanding: Understanding;
  homeworkStatusText: string;
  teacherMemo: string;
  weaknessText: string;
  onCopy: () => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold tracking-tight">AI 리포트 미리보기</h2>
          <Badge tone={result ? "success" : "muted"}>{result ? "AI 생성 완료" : "생성 전"}</Badge>
        </div>
      </header>

      <div className="p-4">
        {!result ? (
          <div className="grid min-h-[430px] place-items-center rounded-lg border border-dashed bg-muted/20 p-6 text-center">
            <div>
              <h3 className="text-base font-semibold">아직 생성된 리포트가 없습니다</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                빠른 수업 기록을 확인한 뒤 AI 리포트 생성을 눌러 주세요.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border">
            <div className="grid gap-x-4 gap-y-3 border-b p-4 text-xs lg:grid-cols-2">
              <PreviewMeta label="학생" value={selectedStudent?.name ?? "학생 미선택"} />
              <PreviewMeta label="날짜" value={lessonDate} />
              <PreviewMeta label="이해도" value={understanding} />
              <PreviewMeta label="숙제 상태" value={result.homework_status || homeworkStatusText} />
              <PreviewMeta label="취약 포인트" value={result.weakness || weaknessText} />
              <PreviewMeta label="선생님 메모" value={teacherMemo} />
            </div>

            <div className="divide-y px-4">
              <PreviewSection title="수업 요약">
                오늘 수업에서는 {result.progress} 내용을 중심으로 학습했습니다.
              </PreviewSection>
              <PreviewSection title="이해도">
                전반적인 이해도는 {understanding} 수준입니다.
              </PreviewSection>
              <PreviewSection title="숙제 상태">
                숙제는 {result.homework_status || homeworkStatusText} 상태로 확인되었습니다.
              </PreviewSection>
              <PreviewSection title="취약 포인트">
                {result.weakness || weaknessText} 부분을 조금 더 점검할 필요가 있습니다.
              </PreviewSection>
              <PreviewSection title="다음 수업 계획">{result.next_plan}</PreviewSection>
            </div>

            <div className="p-4 pt-0">
              <div className="rounded-lg border bg-primary/5 p-3.5">
                <h3 className="text-sm font-semibold text-primary">학부모님께 보낼 메시지</h3>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-6">{result.parent_report}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button className="h-10 text-sm" variant="outline" onClick={onCopy} disabled={!result}>
            <Copy className="h-3.5 w-3.5" />
            복사
          </Button>
          <Button
            className="h-10 text-sm"
            variant="outline"
            onClick={onGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            다시 생성
          </Button>
        </div>
      </div>
    </section>
  );
}

function RecordStep({
  number,
  label,
  children,
  compact = false,
}: {
  number: number;
  label: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-2.5 sm:grid-cols-[104px_minmax(0,1fr)] ${
        compact ? "items-center" : "items-start"
      }`}
    >
      <div className="pt-1">
        <div className="text-[10px] font-semibold text-muted-foreground">
          {String(number).padStart(2, "0")}
        </div>
        <div className="text-sm font-semibold">{label}</div>
      </div>
      {children}
    </div>
  );
}

function PreviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[72px_1fr] gap-2">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <span className="min-w-0 break-keep font-medium">{value}</span>
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-3">
      <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
      <p className="text-xs leading-6 text-muted-foreground">{children}</p>
    </section>
  );
}

function todayInputDate() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
