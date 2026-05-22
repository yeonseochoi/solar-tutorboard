import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/lib/role";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, ArrowRight, Sparkles, Database } from "lucide-react";
import { useState } from "react";
import { ensureDemoData } from "@/lib/seed";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: RoleSelect,
});

function RoleSelect() {
  const { setRole } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);

  const choose = (role: "teacher" | "parent") => {
    setRole(role);
    navigate({ to: role === "teacher" ? "/teacher" : "/parent" });
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

        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => choose("teacher")}
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
            onClick={() => choose("parent")}
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
              학부모 대시보드
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>
        </div>

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
