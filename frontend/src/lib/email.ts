import { supabase } from "@/lib/supabase";

export type SendMessageEmailResult = {
  success: boolean;
  message_id?: string;
  message_status?: "pending" | "sent";
  gmail_message_id?: string;
  test_mode?: boolean;
  already_sent?: boolean;
  error?: string;
};

export async function send_message_email(message_id: string) {
  const { data, error } = await supabase.functions.invoke<SendMessageEmailResult>(
    "send-message-email",
    {
      body: { message_id },
    },
  );

  if (error) {
    throw new Error(error.message);
  }
  if (!data?.success) {
    throw new Error(data?.error ?? "메일 발송에 실패했습니다.");
  }

  return data;
}

export type SendParentInviteResult = {
  success: boolean;
  invite_id?: string;
  gmail_message_id?: string;
  invite_url?: string;
  error?: string;
};

export async function send_parent_invite(invite_id: string) {
  const origin_url = typeof window !== "undefined" ? window.location.origin : "";
  const { data, error } = await supabase.functions.invoke<SendParentInviteResult>(
    "send-parent-invite",
    {
      body: { invite_id, origin_url },
    },
  );

  if (error) {
    throw new Error(error.message);
  }
  if (!data?.success) {
    throw new Error(data?.error ?? "초대 메일 발송에 실패했습니다.");
  }

  return data;
}
