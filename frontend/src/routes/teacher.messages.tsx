import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Section, EmptyState, ErrorState, LoadingState } from "@/components/Section";
import { Badge, statusTone, statusLabel } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/types";
import type { MessageQueue, MessageStatus, Student } from "@/lib/types";
import { send_message_email } from "@/lib/email";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Archive,
  Eye,
  Forward,
  MailOpen,
  MoreHorizontal,
  Reply,
  Search,
  Send,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/teacher/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<MessageQueue | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | MessageStatus>("all");
  const [query, setQuery] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher", "messages"],
    queryFn: async () => {
      const [students, msgs] = await Promise.all([
        supabase.from("students").select("*").eq("tutor_id", DEMO_TUTOR_ID),
        supabase
          .from("message_queue")
          .select("*")
          .eq("tutor_id", DEMO_TUTOR_ID)
          .order("created_at", { ascending: false }),
      ]);
      if (students.error || msgs.error) throw students.error || msgs.error;
      return {
        students: (students.data ?? []) as Student[],
        msgs: (msgs.data ?? []) as MessageQueue[],
      };
    },
  });

  const studentNames = useMemo(
    () => new Map((data?.students ?? []).map((student) => [student.id, student.name])),
    [data?.students],
  );
  const studentsById = useMemo(
    () => new Map((data?.students ?? []).map((student) => [student.id, student])),
    [data?.students],
  );
  const studentName = (id: string) => studentNames.get(id) ?? "—";

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.msgs.filter((message) => {
      const targetStudent = studentNames.get(message.student_id) ?? "—";
      const matchesStatus = statusFilter === "all" || message.message_status === statusFilter;
      const text = `${targetStudent} ${message.message_type} ${message.message_body}`.toLowerCase();
      const matchesText = text.includes(query.trim().toLowerCase());
      return matchesStatus && matchesText;
    });
  }, [data, query, statusFilter, studentNames]);

  const sendEmail = async (id: string) => {
    try {
      setSendingId(id);
      const result = await send_message_email(id);
      toast.success("메일 발송 완료", {
        description: result.test_mode
          ? "테스트 수신자 이메일로 전송했습니다."
          : "Gmail 발송 계정에서 학부모 이메일로 전송했습니다.",
      });
      qc.invalidateQueries({ queryKey: ["teacher"] });
    } catch (e) {
      toast.error("메일 발송 실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <AppLayout variant="teacher" title="메시지 큐" subtitle="학부모 발송 대기 메시지 관리">
      <Section title="message_queue">
        <div className="mb-4 grid gap-2 lg:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="학생명, 메시지 내용 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="pending">대기 중</SelectItem>
              <SelectItem value="sent">발송 완료</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <LoadingState />}
        {error && <ErrorState message={(error as Error).message} />}
        {data && filtered.length === 0 && (
          <EmptyState
            title="메시지가 없습니다"
            description="수업 리포트 또는 결제 안내를 생성하면 여기에 쌓입니다."
          />
        )}
        {data && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">학생</th>
                  <th className="px-4 py-2 font-medium">종류</th>
                  <th className="px-4 py-2 font-medium">채널</th>
                  <th className="px-4 py-2 font-medium">상태</th>
                  <th className="px-4 py-2 font-medium">미리보기</th>
                  <th className="px-4 py-2 font-medium">생성일</th>
                  <th className="px-4 py-2 text-right font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr
                    key={m.id}
                    className="cursor-pointer border-t transition-colors hover:bg-muted/30 focus-within:bg-muted/30"
                    tabIndex={0}
                    onClick={() => setPreview(m)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setPreview(m);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-medium">{studentName(m.student_id)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(m.message_type)}>{statusLabel(m.message_type)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{m.channel}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(m.message_status)}>
                        {statusLabel(m.message_status)}
                      </Badge>
                    </td>
                    <td className="max-w-[320px] px-4 py-3">
                      <div className="truncate text-xs text-muted-foreground">{m.message_body}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(m.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPreview(m);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {m.message_status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={sendingId === m.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              sendEmail(m.id);
                            }}
                          >
                            <Send className="h-3.5 w-3.5" />
                            {sendingId === m.id ? "발송 중" : "메일 발송"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4 pr-12">
            <DialogTitle>실제 발송 메일 미리보기</DialogTitle>
          </DialogHeader>
          {preview && (
            <EmailPreview message={preview} student={studentsById.get(preview.student_id)} />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function EmailPreview({ message, student }: { message: MessageQueue; student?: Student }) {
  const studentDisplayName = student?.name ?? "학생";
  const recipient = student?.parent_contact || "수신자 이메일 없음";
  const messageLabel = statusLabel(message.message_type);
  const subject = `[Solar Tutorboard] ${studentDisplayName} 학생 ${messageLabel}`;
  const sentAt = formatDateTime(message.created_at);

  return (
    <div className="max-h-[calc(92vh-61px)] overflow-y-auto bg-[#eef3f8]">
      <div className="border-b bg-[#edf2f8] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(message.message_type)}>{messageLabel}</Badge>
              <Badge tone={statusTone(message.message_status)}>
                {statusLabel(message.message_status)}
              </Badge>
            </div>
            <h3 className="mt-2 truncate text-base font-semibold">{subject}</h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Solar Tutorboard &lt;tutorboard.ai@gmail.com&gt; → {recipient}
            </p>
          </div>
          <div className="hidden items-center gap-1 text-muted-foreground sm:flex">
            <IconTool label="보관" icon={<Archive className="h-4 w-4" />} />
            <IconTool label="삭제" icon={<Trash2 className="h-4 w-4" />} />
            <IconTool label="읽음 처리" icon={<MailOpen className="h-4 w-4" />} />
            <IconTool label="더보기" icon={<MoreHorizontal className="h-4 w-4" />} />
          </div>
        </div>
      </div>

      <div className="border-b bg-background px-5 py-4">
        <div className="grid gap-2 text-sm sm:grid-cols-[96px_1fr]">
          <span className="text-muted-foreground">보낸 사람</span>
          <span className="font-medium">Solar Tutorboard &lt;tutorboard.ai@gmail.com&gt;</span>
          <span className="text-muted-foreground">받는 사람</span>
          <span className="font-medium">{recipient}</span>
          <span className="text-muted-foreground">날짜</span>
          <span className="font-medium">{sentAt}</span>
        </div>
      </div>

      <div className="bg-[#f0fbfc] p-5 sm:p-8">
        <div className="mx-auto max-w-[640px] overflow-hidden rounded-xl border border-[#dbe7ea] bg-white">
          <div className="border-b border-[#e5edf0] p-6">
            <div className="text-[13px] font-bold text-[#2563eb]">Solar Tutorboard</div>
            <h4 className="mt-2 text-2xl font-bold leading-snug tracking-normal text-[#111827]">
              {studentDisplayName} 학생 {messageLabel}
            </h4>
            {student && (
              <p className="mt-2 text-sm text-[#6b7280]">
                {student.grade} · {student.subject}
              </p>
            )}
          </div>
          <div className="p-6">
            <div className="whitespace-pre-wrap text-[15px] leading-8 text-[#111827]">
              {message.message_body}
            </div>
          </div>
          <div className="border-t border-[#e5edf0] bg-[#f8fafc] px-6 py-4 text-xs leading-relaxed text-[#64748b]">
            이 메일은 Solar Tutorboard에서 생성한 데모 발송 메일입니다.
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <Button size="sm" variant="outline" disabled>
          <Reply className="h-4 w-4" />
          답장
        </Button>
        <Button size="sm" variant="outline" disabled>
          <Forward className="h-4 w-4" />
          전달
        </Button>
      </div>
    </div>
  );
}

function IconTool({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-background"
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}
