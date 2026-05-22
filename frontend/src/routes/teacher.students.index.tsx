import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { send_parent_invite } from "@/lib/email";
import { AppLayout } from "@/components/AppLayout";
import { Section, LoadingState, EmptyState, ErrorState } from "@/components/Section";
import { Badge, statusTone, statusLabel } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Student,
  Payment,
  LessonReport,
  MessageQueue,
  Schedule,
  ParentInvite,
} from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/types";
import { ChevronRight, Mail, Search, SlidersHorizontal, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/students/")({
  component: StudentsPage,
});

const emptyInviteForm = {
  student_name: "",
  grade: "",
  subject: "",
  parent_name: "",
  parent_contact: "",
};

function StudentsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(emptyInviteForm);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher", "students"],
    queryFn: async () => {
      const [students, payments, reports, msgs, schedules] = await Promise.all([
        supabase
          .from("students")
          .select("*")
          .eq("tutor_id", DEMO_TUTOR_ID)
          .order("created_at", { ascending: false }),
        supabase.from("payments").select("*").eq("tutor_id", DEMO_TUTOR_ID),
        supabase
          .from("lesson_reports")
          .select("*")
          .eq("tutor_id", DEMO_TUTOR_ID)
          .order("created_at", { ascending: false }),
        supabase.from("message_queue").select("*").eq("tutor_id", DEMO_TUTOR_ID),
        supabase
          .from("schedules")
          .select("*")
          .eq("tutor_id", DEMO_TUTOR_ID)
          .order("available_time", { ascending: true }),
      ]);
      const err =
        students.error || payments.error || reports.error || msgs.error || schedules.error;
      if (err) throw err;
      return {
        students: (students.data ?? []) as Student[],
        payments: (payments.data ?? []) as Payment[],
        reports: (reports.data ?? []) as LessonReport[],
        msgs: (msgs.data ?? []) as MessageQueue[],
        schedules: (schedules.data ?? []) as Schedule[],
      };
    },
  });

  const subjects = useMemo(() => {
    const values = new Set((data?.students ?? []).map((s) => s.subject));
    return ["all", ...Array.from(values)];
  }, [data?.students]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.students
      .map((student) => {
        const payment = data.payments.find((p) => p.student_id === student.id);
        const latestReport = data.reports.find((r) => r.student_id === student.id);
        const nextSchedule = data.schedules.find(
          (s) => s.student_id === student.id && s.status !== "cancelled" && s.status !== "rejected",
        );
        const pendingMessages = data.msgs.filter(
          (m) => m.student_id === student.id && m.message_status === "pending",
        ).length;
        return { student, payment, latestReport, nextSchedule, pendingMessages };
      })
      .filter(({ student, payment }) => {
        const text =
          `${student.name} ${student.grade} ${student.subject} ${student.parent_name} ${student.parent_contact}`.toLowerCase();
        const matchesText = text.includes(query.trim().toLowerCase());
        const matchesSubject = subject === "all" || student.subject === subject;
        const matchesPayment = paymentStatus === "all" || payment?.payment_status === paymentStatus;
        return matchesText && matchesSubject && matchesPayment;
      });
  }, [data, paymentStatus, query, subject]);

  const updateInviteForm = (key: keyof typeof emptyInviteForm, value: string) => {
    setInviteForm((current) => ({ ...current, [key]: value }));
  };

  const openStudentDetail = (student_id: string) => {
    navigate({ to: "/teacher/students/$studentId", params: { studentId: student_id } });
  };

  const createInvite = async () => {
    const student_name = inviteForm.student_name.trim();
    const grade = inviteForm.grade.trim();
    const inviteSubject = inviteForm.subject.trim();
    const parent_name = inviteForm.parent_name.trim();
    const parent_contact = inviteForm.parent_contact.trim();

    if (!student_name || !grade || !inviteSubject || !parent_name || !parent_contact) {
      toast.error("학생 이름, 학년, 과목, 학부모 이름, 이메일을 모두 입력해 주세요");
      return;
    }
    if (!parent_contact.includes("@")) {
      toast.error("학부모 이메일 형식을 확인해 주세요");
      return;
    }

    setCreatingInvite(true);
    try {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert({
          tutor_id: DEMO_TUTOR_ID,
          name: student_name,
          grade,
          subject: inviteSubject,
          parent_name,
          parent_contact,
        })
        .select("*")
        .single();
      if (studentError) throw studentError;

      const token = generateInviteToken();
      const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: invite, error: inviteError } = await supabase
        .from("parent_invites")
        .insert({
          tutor_id: DEMO_TUTOR_ID,
          student_id: (student as Student).id,
          email: parent_contact,
          token,
          status: "pending",
          expires_at,
        })
        .select("*")
        .single();
      if (inviteError) throw inviteError;

      await send_parent_invite((invite as ParentInvite).id);

      toast.success("학생 초대 메일을 보냈습니다", {
        description: `${parent_contact} 주소로 로그인 링크가 발송되었습니다.`,
      });
      setInviteForm({ ...emptyInviteForm });
      setInviteOpen(false);
      await qc.invalidateQueries({ queryKey: ["teacher"] });
    } catch (e) {
      toast.error("학생 초대 실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setCreatingInvite(false);
    }
  };

  return (
    <AppLayout variant="teacher" title="학생 관리" subtitle="학생별 수업, 결제, 메시지 상태">
      <Section
        title="학생 목록"
        description="학생을 클릭하면 상세 관리 화면으로 이동합니다."
        actions={
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" /> 학생 추가
          </Button>
        }
      >
        <div className="mb-4 grid gap-2 lg:grid-cols-[1fr_160px_160px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="학생, 학년, 과목, 학부모 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger>
              <SelectValue placeholder="과목" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "all" ? "전체 과목" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger>
              <SelectValue placeholder="결제" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 결제</SelectItem>
              <SelectItem value="paid">결제 완료</SelectItem>
              <SelectItem value="unpaid">미결제</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <LoadingState />}
        {error && <ErrorState message={(error as Error).message} />}
        {data && rows.length === 0 && (
          <EmptyState
            title="조건에 맞는 학생이 없습니다"
            description="검색어와 필터를 다시 확인해 주세요."
          />
        )}
        {data && rows.length > 0 && (
          <>
            <div className="hidden overflow-x-auto rounded-md border md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">학생</th>
                    <th className="px-4 py-2 font-medium">학부모</th>
                    <th className="px-4 py-2 font-medium">결제</th>
                    <th className="px-4 py-2 font-medium">다음 수업</th>
                    <th className="px-4 py-2 font-medium">최근 리포트</th>
                    <th className="px-4 py-2 font-medium">대기 메시지</th>
                    <th className="px-4 py-2 text-right font-medium">
                      <SlidersHorizontal className="ml-auto h-4 w-4" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ student, payment, latestReport, nextSchedule, pendingMessages }) => (
                    <tr
                      key={student.id}
                      role="link"
                      tabIndex={0}
                      className="cursor-pointer border-t transition-colors hover:bg-muted/35 focus-visible:bg-muted/35 focus-visible:outline-none"
                      onClick={() => openStudentDetail(student.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openStudentDetail(student.id);
                        }
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {student.grade} · {student.subject}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{student.parent_name}</div>
                        <div className="text-xs">{student.parent_contact}</div>
                      </td>
                      <td className="px-4 py-3">
                        {payment ? (
                          <Badge tone={statusTone(payment.payment_status)}>
                            {statusLabel(payment.payment_status)}
                          </Badge>
                        ) : (
                          <Badge tone="muted">없음</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {nextSchedule
                          ? formatDateTime(
                              nextSchedule.available_time || nextSchedule.requested_time,
                            )
                          : "등록 필요"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {latestReport ? formatDate(latestReport.created_at) : "리포트 없음"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={pendingMessages > 0 ? "warning" : "muted"}>
                          {pendingMessages}건
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/teacher/students/$studentId"
                          params={{ studentId: student.id }}
                          className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          상세 <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {rows.map(({ student, payment, latestReport, nextSchedule, pendingMessages }) => (
                <Link
                  key={student.id}
                  to="/teacher/students/$studentId"
                  params={{ studentId: student.id }}
                  className="block rounded-md border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {student.grade} · {student.subject}
                      </div>
                    </div>
                    {payment && (
                      <Badge tone={statusTone(payment.payment_status)}>
                        {statusLabel(payment.payment_status)}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                    <div>학부모: {student.parent_name}</div>
                    <div>
                      다음 수업:{" "}
                      {nextSchedule
                        ? formatDateTime(nextSchedule.available_time || nextSchedule.requested_time)
                        : "등록 필요"}
                    </div>
                    <div>
                      최근 리포트: {latestReport ? formatDate(latestReport.created_at) : "없음"}
                    </div>
                    <div>대기 메시지: {pendingMessages}건</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Section>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>새 학생 초대</DialogTitle>
            <DialogDescription>
              학생 정보를 저장하고 학부모/학생용 로그인 링크를 이메일로 보냅니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invite-student-name">학생 이름</Label>
              <Input
                id="invite-student-name"
                placeholder="예: 최지우"
                value={inviteForm.student_name}
                onChange={(e) => updateInviteForm("student_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-grade">학년</Label>
              <Input
                id="invite-grade"
                placeholder="예: 고1"
                value={inviteForm.grade}
                onChange={(e) => updateInviteForm("grade", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-subject">과목</Label>
              <Input
                id="invite-subject"
                placeholder="예: 수학"
                value={inviteForm.subject}
                onChange={(e) => updateInviteForm("subject", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-parent-name">학부모 이름</Label>
              <Input
                id="invite-parent-name"
                placeholder="예: 최지우 학부모님"
                value={inviteForm.parent_name}
                onChange={(e) => updateInviteForm("parent_name", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="invite-parent-contact">초대 이메일</Label>
              <Input
                id="invite-parent-contact"
                type="email"
                placeholder="parent@example.com"
                value={inviteForm.parent_contact}
                onChange={(e) => updateInviteForm("parent_contact", e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/25 p-3 text-xs leading-relaxed text-muted-foreground">
            메일의 초대 URL을 누르면 별도 비밀번호 없이 해당 학생의 학부모/학생 모드로 로그인됩니다.
            초대 링크는 7일 뒤 만료됩니다.
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteOpen(false)}
              disabled={creatingInvite}
            >
              취소
            </Button>
            <Button onClick={createInvite} disabled={creatingInvite}>
              <Mail className="h-4 w-4" />
              {creatingInvite ? "초대 발송 중" : "초대 메일 보내기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function generateInviteToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
