import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, DEMO_TUTOR_ID } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Section, LoadingState, EmptyState, ErrorState } from "@/components/Section";
import { Badge, statusTone, statusLabel } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/types";
import type { MessageQueue, Student, MessageStatus } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Eye } from "lucide-react";

export const Route = createFileRoute("/teacher/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<MessageQueue | null>(null);

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

  const updateStatus = async (id: string, status: MessageStatus) => {
    try {
      const { error: uerr } = await supabase.from("message_queue").update({ status }).eq("id", id);
      if (uerr) throw uerr;
      toast.success(status === "sent" ? "발송 완료 처리" : "발송 제외 처리");
      qc.invalidateQueries({ queryKey: ["teacher"] });
    } catch (e) {
      toast.error("상태 변경 실패", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <AppLayout variant="teacher" title="메시지" subtitle="학부모 발송 대기 메시지 큐 (데모 발송)">
      <Section>
        {isLoading && <LoadingState />}
        {error && <ErrorState message={(error as Error).message} />}
        {data && data.msgs.length === 0 && (
          <EmptyState
            title="메시지가 없습니다"
            description="수업 리포트 또는 결제 안내를 생성하면 여기에 쌓입니다."
          />
        )}
        {data && data.msgs.length > 0 && (
          <div className="overflow-x-auto -m-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
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
                {data.msgs.map((m) => {
                  const student = data.students.find((s) => s.id === m.student_id);
                  return (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{student?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(m.message_type)}>
                          {statusLabel(m.message_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{m.channel}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(m.status)}>{statusLabel(m.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        <div className="text-xs text-muted-foreground truncate">
                          {m.message_body}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setPreview(m)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {m.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus(m.id, "sent")}
                              >
                                <Check className="h-3.5 w-3.5" />
                                완료
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateStatus(m.id, "skipped")}
                              >
                                <X className="h-3.5 w-3.5" />
                                제외
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                <Badge tone={statusTone(preview.status)}>{statusLabel(preview.status)}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(preview.created_at)}
                </span>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed">
                {preview.message_body}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
