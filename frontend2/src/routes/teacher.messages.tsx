import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, Eye, Search } from "lucide-react";

export const Route = createFileRoute("/teacher/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<MessageQueue | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | MessageStatus>("all");
  const [query, setQuery] = useState("");

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

  const updateStatus = async (id: string, status: MessageStatus) => {
    try {
      const { error: uerr } = await supabase
        .from("message_queue")
        .update({ message_status: status })
        .eq("id", id);
      if (uerr) throw uerr;
      toast.success("발송 완료 처리");
      qc.invalidateQueries({ queryKey: ["teacher"] });
    } catch (e) {
      toast.error("상태 변경 실패", {
        description: e instanceof Error ? e.message : String(e),
      });
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
                  <tr key={m.id} className="border-t">
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
                        <Button size="sm" variant="ghost" onClick={() => setPreview(m)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {m.message_status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(m.id, "sent")}
                          >
                            <Check className="h-3.5 w-3.5" />
                            발송 완료 처리
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>메시지 미리보기</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(preview.message_type)}>
                  {statusLabel(preview.message_type)}
                </Badge>
                <Badge tone={statusTone(preview.message_status)}>
                  {statusLabel(preview.message_status)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(preview.created_at)}
                </span>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                {preview.message_body}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
