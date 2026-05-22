import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { setParentSession } from "@/lib/parent-session";
import { useRole } from "@/lib/role";
import type { ParentInvite, Student } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, MailCheck } from "lucide-react";

export const Route = createFileRoute("/invite/$token")({
  component: InviteLoginPage,
});

type InviteState =
  | { status: "checking"; message: string }
  | { status: "accepted"; message: string; student_name: string }
  | { status: "invalid"; message: string };

function InviteLoginPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { setRole } = useRole();
  const [state, setState] = useState<InviteState>({
    status: "checking",
    message: "초대 링크를 확인하고 있습니다.",
  });

  useEffect(() => {
    let alive = true;

    async function acceptInvite() {
      try {
        const { data: invite, error: inviteError } = await supabase
          .from("parent_invites")
          .select("*")
          .eq("token", token)
          .maybeSingle();
        if (inviteError) throw inviteError;
        if (!invite) {
          setState({ status: "invalid", message: "초대 링크를 찾을 수 없습니다." });
          return;
        }

        const parentInvite = invite as ParentInvite;
        const expired = new Date(parentInvite.expires_at).getTime() < Date.now();
        if (expired || parentInvite.status === "expired") {
          if (parentInvite.status !== "expired") {
            await supabase
              .from("parent_invites")
              .update({ status: "expired" })
              .eq("id", parentInvite.id);
          }
          if (!alive) return;
          setState({
            status: "invalid",
            message: "만료된 초대 링크입니다. 선생님에게 새 초대 메일을 요청해 주세요.",
          });
          return;
        }

        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("*")
          .eq("id", parentInvite.student_id)
          .maybeSingle();
        if (studentError) throw studentError;
        if (!student) {
          setState({ status: "invalid", message: "연결된 학생 정보를 찾을 수 없습니다." });
          return;
        }

        if (parentInvite.status === "pending") {
          await supabase
            .from("parent_invites")
            .update({ status: "accepted", accepted_at: new Date().toISOString() })
            .eq("id", parentInvite.id);
        }

        const selectedStudent = student as Student;
        setParentSession(parentInvite.student_id, parentInvite.token, selectedStudent.parent_name);
        setRole("parent");
        if (!alive) return;
        setState({
          status: "accepted",
          message: "로그인이 완료되었습니다. 학부모 대시보드로 이동합니다.",
          student_name: selectedStudent.name,
        });
        window.setTimeout(() => {
          navigate({ to: "/parent" });
        }, 600);
      } catch (error) {
        if (!alive) return;
        setState({
          status: "invalid",
          message:
            error instanceof Error ? error.message : "초대 링크 처리 중 문제가 발생했습니다.",
        });
      }
    }

    acceptInvite();
    return () => {
      alive = false;
    };
  }, [navigate, setRole, token]);

  const accepted = state.status === "accepted";
  const checking = state.status === "checking";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eefbfc] px-4">
      <section className="w-full max-w-md rounded-xl border bg-background p-6 text-center shadow-sm">
        <div
          className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${
            state.status === "invalid"
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          }`}
        >
          {checking ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : accepted ? (
            <MailCheck className="h-6 w-6" />
          ) : (
            <AlertTriangle className="h-6 w-6" />
          )}
        </div>
        <h1 className="mt-4 text-xl font-bold">
          {checking ? "초대 확인 중" : accepted ? "초대 로그인 완료" : "초대 링크 오류"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {accepted ? `${state.student_name} 학생 계정으로 연결되었습니다.` : state.message}
        </p>
        {accepted && <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>}
        {state.status === "invalid" && (
          <Button asChild className="mt-5">
            <Link to="/">처음 화면으로 이동</Link>
          </Button>
        )}
      </section>
    </main>
  );
}
