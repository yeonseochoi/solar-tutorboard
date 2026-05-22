import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/lib/role";
import { setParentSession } from "@/lib/parent-session";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Users,
  ArrowRight,
  Sparkles,
  Database,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { ensureDemoData } from "@/lib/seed";
import { toast } from "sonner";
import type { Student } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: RoleSelect,
});

function RoleSelect() {
  const { setRole } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [showParentPicker, setShowParentPicker] = useState(false);

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["role-select", "students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("tutor_id", DEMO_TUTOR_ID)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });

  const chooseTeacher = () => {
    setRole("teacher");
    navigate({ to: "/teacher" });
  };

  const chooseParentStudent = (student: Student) => {
    setParentSession(student.id, undefined, student.parent_name);
    setRole("parent");
    navigate({ to: "/parent" });
  };

  const seed = async () => {
    setSeeding(true);
    try {
      await ensureDemoData();
      await queryClient.invalidateQueries();
      toast.success("데모 데이터가 초기화되었습니다");
    } catch (e) {
      toast.error("데모 데이터 생성 실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold">Solar Tutorboard</div>
            <div className="text-xs text-muted-foreground">
              과외 선생님을 위한 AI 운영 보조 (데모)
            </div>
          </div>
        </div>

        {!showParentPicker ? (
          <div className="grid gap-4 md:grid-cols-2">
            <button
              onClick={chooseTeacher}
              className="group rounded-xl border bg-card p-6 text-left transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">선생님 모드</span>
              </div>
              <div className="mt-3 text-lg font-semibold">선생님으로 보기</div>
              <p className="mt-1 text-sm text-muted-foreground">
                수업 메모 → AI 리포트 → 학부모 메시지까지 한 번에 처리.
              </p>
              <div className="mt-4 flex items-center text-sm text-primary">
                대시보드 시작
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>

            <button
              onClick={() => setShowParentPicker(true)}
              className="group rounded-xl border bg-card p-6 text-left transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">학부모/학생 모드</span>
              </div>
              <div className="mt-3 text-lg font-semibold">학부모/학생으로 보기</div>
              <p className="mt-1 text-sm text-muted-foreground">
                수업 리포트, 결제 안내, 일정 변경 요청 확인.
              </p>
              <div className="mt-4 flex items-center text-sm text-primary">
                학생 선택하기
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          </div>
        ) : (
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Users className="h-4 w-4" />
                  학부모/학생 모드
                </div>
                <h2 className="mt-2 text-lg font-semibold">학생을 선택해 주세요</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  등록된 전체 학생 중 선택한 학생의 리포트, 결제 안내, 일정 요청 화면으로
                  이동합니다.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowParentPicker(false)}>
                <ChevronLeft className="h-4 w-4" />
                뒤로
              </Button>
            </div>

            <div className="mt-5 grid gap-3">
              {loadingStudents && (
                <div className="flex items-center justify-center rounded-lg border bg-background py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  학생 목록을 불러오는 중
                </div>
              )}
              {!loadingStudents && students?.length === 0 && (
                <div className="rounded-lg border bg-background p-5 text-center text-sm text-muted-foreground">
                  학생 데이터가 없습니다. 아래 데모 데이터 초기화를 먼저 눌러 주세요.
                </div>
              )}
              {!loadingStudents &&
                students?.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => chooseParentStudent(student)}
                    className="group flex items-center justify-between gap-4 rounded-lg border bg-background p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {student.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{student.name} 학생</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {student.grade} · {student.subject} · {student.parent_name}
                          </div>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
            </div>
          </section>
        )}

        <div className="mt-6 flex items-center justify-center">
          <Button variant="outline" size="sm" onClick={seed} disabled={seeding}>
            <Database className="mr-1.5 h-3.5 w-3.5" />
            {seeding ? "데모 데이터 생성 중…" : "데모 데이터 초기화"}
          </Button>
        </div>
      </div>
    </div>
  );
}
