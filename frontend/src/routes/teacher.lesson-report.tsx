import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Section, LoadingState, ErrorState } from "@/components/Section";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Save, Loader2 } from "lucide-react";
import {
  generate_lesson_report,
  build_message_queue_mock,
  type LessonReportResult,
} from "@/lib/agent";
import type { Student } from "@/lib/types";

type Search = { studentId?: string };

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
  const [lessonDate, setLessonDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [result, setResult] = useState<LessonReportResult["result"] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: students, isLoading } = useQuery({
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

  const onGenerate = async () => {
    if (!selectedStudent) {
      toast.error("학생을 선택해 주세요");
      return;
    }
    if (!memo.trim()) {
      toast.error("수업 메모를 입력해 주세요");
      return;
    }
    setGenerating(true);
    try {
      const res = await generate_lesson_report({
        student_name: selectedStudent.name,
        grade: selectedStudent.grade,
        subject: selectedStudent.subject,
        lesson_memo: memo,
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
        lesson_memo: memo,
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
      const { error: merr } = await supabase.from("message_queue").insert(msg.result);
      if (merr) throw merr;

      toast.success("리포트 저장 완료", {
        description: "메시지 큐에도 대기 상태로 추가되었습니다.",
      });
      setResult(null);
      setMemo("");
      qc.invalidateQueries();
    } catch (e) {
      toast.error("저장 실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      variant="teacher"
      title="수업 리포트 생성"
      subtitle="수업 메모 → AI 리포트 → 학부모 메시지 자동 생성"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="입력">
          {isLoading && <LoadingState />}
          {students && (
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs">학생</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger>
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
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">수업 날짜</Label>
                <Input
                  type="date"
                  value={lessonDate}
                  onChange={(e) => setLessonDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">수업 메모</Label>
                <Textarea
                  rows={8}
                  placeholder="오늘 어떤 단원/개념을 다뤘고, 어떤 부분이 부족했는지, 숙제는 어땠는지 간단히 적어주세요."
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={onGenerate} disabled={generating}>
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  AI 리포트 생성
                </Button>
                <Button variant="outline" onClick={onSave} disabled={!result || saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  결과 저장
                </Button>
              </div>
            </div>
          )}
        </Section>

        <Section title="AI 리포트 미리보기">
          {!result && (
            <div className="text-sm text-muted-foreground">
              아직 생성된 리포트가 없습니다. 메모를 입력 후 “AI 리포트 생성”을 눌러 주세요.
            </div>
          )}
          {result && (
            <div className="space-y-3 text-sm">
              <FieldRow label="현재 진도" value={result.progress} />
              <FieldRow label="취약 개념" value={result.weakness} />
              <FieldRow label="숙제 상태" value={result.homework_status} />
              <FieldRow label="다음 수업 계획" value={result.next_plan} />
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  학부모용 최종 리포트
                </div>
                <div className="rounded-md border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.parent_report}
                </div>
              </div>
            </div>
          )}
        </Section>
      </div>
    </AppLayout>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-3 border-b pb-2 last:border-0 last:pb-0">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="col-span-2 text-sm">{value}</div>
    </div>
  );
}
