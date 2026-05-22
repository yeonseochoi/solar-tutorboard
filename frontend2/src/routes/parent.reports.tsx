import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, DEMO_STUDENT_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Section, LoadingState, EmptyState, ErrorState } from "@/components/Section";
import { formatDate } from "@/lib/types";
import type { LessonReport } from "@/lib/types";

export const Route = createFileRoute("/parent/reports")({
  component: ReportView,
});

function ReportView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["parent", "reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_reports")
        .select("*")
        .eq("student_id", DEMO_STUDENT_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LessonReport[];
    },
  });

  return (
    <AppLayout variant="parent" title="수업 리포트" subtitle="날짜별 학습 기록">
      {isLoading && <LoadingState />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && data.length === 0 && (
        <EmptyState
          title="아직 리포트가 없습니다"
          description="선생님이 수업 후 리포트를 등록하면 여기에 표시됩니다."
        />
      )}
      {data && data.length > 0 && (
        <div className="space-y-4">
          {data.map((r) => (
            <Section
              key={r.id}
              title={r.progress || "수업 리포트"}
              description={formatDate(r.created_at)}
            >
              <div className="space-y-2 text-sm">
                <Row label="진도" value={r.progress} />
                <Row label="취약 개념" value={r.weakness} />
                <Row label="숙제" value={r.homework_status} />
                <Row label="다음 계획" value={r.next_plan} />
                <div className="mt-2 rounded-md border bg-muted/30 p-3 whitespace-pre-wrap leading-relaxed">
                  {r.parent_report}
                </div>
              </div>
            </Section>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="col-span-3">{value}</span>
    </div>
  );
}
