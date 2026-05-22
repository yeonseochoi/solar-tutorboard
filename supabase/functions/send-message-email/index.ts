const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MessageQueueRow = {
  id: string;
  tutor_id: string;
  student_id: string;
  message_type: "lesson_report" | "payment_reminder" | "schedule_coordination";
  channel: string;
  message_status: "pending" | "sent";
  message_body: string;
  created_at: string;
};

type StudentRow = {
  id: string;
  name: string;
  grade: string;
  subject: string;
  parent_name: string;
  parent_contact: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} secret is not configured.`);
  }
  return value;
}

function envFlag(name: string) {
  return Deno.env.get(name)?.toLowerCase() === "true";
}

function splitEmails(value: string) {
  return value
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function getMappedTestRecipients(student: StudentRow) {
  const rawMap =
    Deno.env.get("EMAIL_TEST_RECIPIENT_MAP") ?? Deno.env.get("GMAIL_TEST_RECIPIENT_MAP") ?? "";
  if (!rawMap) return [];

  try {
    const parsed = JSON.parse(rawMap) as Record<string, string | string[]>;
    const value = parsed[student.id] ?? parsed[student.name] ?? parsed[student.parent_name];
    if (Array.isArray(value)) {
      return value.flatMap(splitEmails);
    }
    if (typeof value === "string") {
      return splitEmails(value);
    }
  } catch {
    for (const pair of rawMap.split(";")) {
      const [key, value] = pair.split("=");
      if (!key || !value) continue;
      if ([student.id, student.name, student.parent_name].includes(key.trim())) {
        return splitEmails(value);
      }
    }
  }

  return [];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function messageTypeLabel(type: MessageQueueRow["message_type"]) {
  switch (type) {
    case "lesson_report":
      return "수업 리포트";
    case "payment_reminder":
      return "결제 안내";
    case "schedule_coordination":
      return "일정 조정";
  }
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function encodeBase64Url(value: string) {
  return encodeBase64(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${encodeBase64(value)}?=`;
}

function buildEmailHtml({
  message,
  student,
}: {
  message: MessageQueueRow;
  student: StudentRow;
}) {
  const safeBody = escapeHtml(message.message_body).replaceAll("\n", "<br />");
  return `<!doctype html>
<html lang="ko">
  <body style="margin:0;background:#f0fbfc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border:1px solid #dbe7ea;border-radius:12px;overflow:hidden;">
        <div style="padding:24px;border-bottom:1px solid #e5edf0;">
          <div style="font-size:13px;color:#2563eb;font-weight:700;">Solar Tutorboard</div>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.4;color:#111827;">${escapeHtml(student.name)} 학생 ${messageTypeLabel(message.message_type)}</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">${escapeHtml(student.grade)} · ${escapeHtml(student.subject)}</p>
        </div>
        <div style="padding:24px;">
          <div style="font-size:15px;line-height:1.8;color:#111827;">${safeBody}</div>
        </div>
        <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e5edf0;font-size:12px;color:#64748b;">
          이 메일은 Solar Tutorboard에서 생성한 데모 발송 메일입니다.
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function buildRawEmail({
  from,
  to,
  subject,
  text,
  html,
}: {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}) {
  const boundary = `solar-tutorboard-${crypto.randomUUID()}`;
  const raw = [
    `From: ${from}`,
    `To: ${to.join(", ")}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return encodeBase64Url(raw);
}

async function getGmailAccessToken() {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: requireEnv("GMAIL_CLIENT_ID"),
      client_secret: requireEnv("GMAIL_CLIENT_SECRET"),
      refresh_token: requireEnv("GMAIL_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  });
  const tokenPayload = await tokenResponse.json().catch(() => null);

  if (!tokenResponse.ok) {
    throw new Error(
      tokenPayload?.error_description ??
        tokenPayload?.error ??
        `Gmail token request failed: ${tokenResponse.status}`,
    );
  }

  if (!tokenPayload?.access_token) {
    throw new Error("Gmail access token was not returned.");
  }

  return tokenPayload.access_token as string;
}

async function sendGmail({
  from,
  to,
  subject,
  text,
  html,
}: {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}) {
  const accessToken = await getGmailAccessToken();
  const gmailResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: buildRawEmail({ from, to, subject, text, html }),
    }),
  });
  const gmailPayload = await gmailResponse.json().catch(() => null);

  if (!gmailResponse.ok) {
    throw new Error(
      gmailPayload?.error?.message ??
        gmailPayload?.error ??
        `Gmail delivery failed: ${gmailResponse.status}`,
    );
  }

  return gmailPayload as { id?: string };
}

async function supabaseFetch<T>({
  path,
  method = "GET",
  body,
  supabaseUrl,
  serviceKey,
}: {
  path: string;
  method?: "GET" | "PATCH";
  body?: unknown;
  supabaseUrl: string;
  serviceKey: string;
}): Promise<T> {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error ?? `Supabase request failed: ${response.status}`);
  }
  return payload as T;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed." }, 405);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const messageId = typeof body.message_id === "string" ? body.message_id : "";
    if (!messageId) {
      return jsonResponse({ success: false, error: "message_id is required." }, 400);
    }

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const restKey = requireEnv("SUPABASE_ANON_KEY");
    const from = Deno.env.get("GMAIL_FROM") ?? requireEnv("GMAIL_FROM_EMAIL");
    const testMode = envFlag("EMAIL_TEST_MODE") || envFlag("GMAIL_TEST_MODE");
    const testTo = Deno.env.get("EMAIL_TEST_TO") ?? Deno.env.get("GMAIL_TEST_TO") ?? "";

    const messages = await supabaseFetch<MessageQueueRow[]>({
      path: `/rest/v1/message_queue?id=eq.${encodeURIComponent(messageId)}&select=*`,
      supabaseUrl,
      serviceKey: restKey,
    });
    const message = messages[0];
    if (!message) {
      return jsonResponse({ success: false, error: "Message not found." }, 404);
    }
    if (message.message_status === "sent") {
      return jsonResponse({
        success: true,
        already_sent: true,
        message_id: message.id,
        message_status: message.message_status,
      });
    }

    const students = await supabaseFetch<StudentRow[]>({
      path: `/rest/v1/students?id=eq.${encodeURIComponent(message.student_id)}&select=*`,
      supabaseUrl,
      serviceKey: restKey,
    });
    const student = students[0];
    if (!student) {
      return jsonResponse({ success: false, error: "Student not found." }, 404);
    }

    const mappedTestRecipients = testMode ? getMappedTestRecipients(student) : [];
    const recipients = testMode
      ? mappedTestRecipients.length > 0
        ? mappedTestRecipients
        : splitEmails(testTo)
      : splitEmails(student.parent_contact ?? "");
    if (recipients.length === 0) {
      return jsonResponse({ success: false, error: "Recipient email is not configured." }, 400);
    }

    const subject = `[Solar Tutorboard] ${student.name} 학생 ${messageTypeLabel(message.message_type)}`;
    const html = buildEmailHtml({ message, student });
    const gmailPayload = await sendGmail({
      from,
      to: recipients,
      subject,
      text: message.message_body,
      html,
    });

    const updated = await supabaseFetch<MessageQueueRow[]>({
      path: `/rest/v1/message_queue?id=eq.${encodeURIComponent(message.id)}`,
      method: "PATCH",
      body: { message_status: "sent" },
      supabaseUrl,
      serviceKey: restKey,
    });

    return jsonResponse({
      success: true,
      message_id: message.id,
      message_status: updated[0]?.message_status ?? "sent",
      gmail_message_id: gmailPayload.id ?? "",
      test_mode: testMode,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
