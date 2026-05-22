const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ParentInviteRow = {
  id: string;
  tutor_id: string;
  student_id: string;
  email: string;
  token: string;
  status: "pending" | "accepted" | "expired";
  expires_at: string;
  accepted_at: string | null;
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

type TutorRow = {
  id: string;
  name: string;
  subject: string;
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function normalizeBaseUrl(value: string) {
  return (value || "http://127.0.0.1:5174").replace(/\/+$/, "");
}

function buildInviteHtml({
  inviteUrl,
  student,
  tutor,
  expiresAt,
}: {
  inviteUrl: string;
  student: StudentRow;
  tutor: TutorRow;
  expiresAt: string;
}) {
  return `<!doctype html>
<html lang="ko">
  <body style="margin:0;background:#f0fbfc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border:1px solid #dbe7ea;border-radius:12px;overflow:hidden;">
        <div style="padding:24px;border-bottom:1px solid #e5edf0;">
          <div style="font-size:13px;color:#2563eb;font-weight:700;">Solar Tutorboard</div>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.4;color:#111827;">${escapeHtml(student.name)} 학생 학부모/학생 페이지 초대</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">${escapeHtml(student.grade)} · ${escapeHtml(student.subject)} · ${escapeHtml(tutor.name)}</p>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#111827;">
            안녕하세요. 아래 버튼을 누르면 Solar Tutorboard 학부모/학생 화면에 바로 로그인됩니다.
          </p>
          <a href="${escapeHtml(inviteUrl)}" style="display:inline-block;border-radius:8px;background:#0f6fdc;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;font-size:14px;">
            학부모/학생 페이지 열기
          </a>
          <p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:#64748b;">
            버튼이 열리지 않으면 아래 주소를 브라우저에 붙여넣어 주세요.<br />
            <span style="word-break:break-all;">${escapeHtml(inviteUrl)}</span>
          </p>
        </div>
        <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e5edf0;font-size:12px;color:#64748b;">
          초대 링크 만료일: ${escapeHtml(expiresAt)}
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
  supabaseUrl,
  restKey,
}: {
  path: string;
  supabaseUrl: string;
  restKey: string;
}): Promise<T> {
  const response = await fetch(`${supabaseUrl}${path}`, {
    headers: {
      apikey: restKey,
      Authorization: `Bearer ${restKey}`,
      "Content-Type": "application/json",
    },
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
    const inviteId = typeof body.invite_id === "string" ? body.invite_id : "";
    if (!inviteId) {
      return jsonResponse({ success: false, error: "invite_id is required." }, 400);
    }

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const restKey = requireEnv("SUPABASE_ANON_KEY");
    const from = Deno.env.get("GMAIL_FROM") ?? requireEnv("GMAIL_FROM_EMAIL");
    const appBaseUrl = normalizeBaseUrl(
      typeof body.origin_url === "string" && body.origin_url
        ? body.origin_url
        : Deno.env.get("APP_BASE_URL") ?? request.headers.get("origin") ?? "",
    );

    const invites = await supabaseFetch<ParentInviteRow[]>({
      path: `/rest/v1/parent_invites?id=eq.${encodeURIComponent(inviteId)}&select=*`,
      supabaseUrl,
      restKey,
    });
    const invite = invites[0];
    if (!invite) {
      return jsonResponse({ success: false, error: "Invite not found." }, 404);
    }
    if (invite.status === "expired" || new Date(invite.expires_at).getTime() < Date.now()) {
      return jsonResponse({ success: false, error: "Invite is expired." }, 400);
    }

    const [students, tutors] = await Promise.all([
      supabaseFetch<StudentRow[]>({
        path: `/rest/v1/students?id=eq.${encodeURIComponent(invite.student_id)}&select=*`,
        supabaseUrl,
        restKey,
      }),
      supabaseFetch<TutorRow[]>({
        path: `/rest/v1/tutors?id=eq.${encodeURIComponent(invite.tutor_id)}&select=id,name,subject`,
        supabaseUrl,
        restKey,
      }),
    ]);
    const student = students[0];
    const tutor = tutors[0];
    if (!student) {
      return jsonResponse({ success: false, error: "Student not found." }, 404);
    }
    if (!tutor) {
      return jsonResponse({ success: false, error: "Tutor not found." }, 404);
    }

    const testMode = envFlag("INVITE_EMAIL_TEST_MODE");
    const recipients = testMode
      ? splitEmails(Deno.env.get("INVITE_EMAIL_TEST_TO") ?? "")
      : splitEmails(invite.email);
    if (recipients.length === 0) {
      return jsonResponse({ success: false, error: "Invite recipient email is not configured." }, 400);
    }

    const inviteUrl = `${appBaseUrl}/invite/${encodeURIComponent(invite.token)}`;
    const expiresAt = new Date(invite.expires_at).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const subject = `[Solar Tutorboard] ${student.name} 학생 페이지 초대`;
    const text = [
      `안녕하세요. ${student.name} 학생 Solar Tutorboard 페이지 초대입니다.`,
      `아래 링크를 열면 학부모/학생 화면에 바로 로그인됩니다.`,
      inviteUrl,
      `초대 링크 만료일: ${expiresAt}`,
    ].join("\n\n");
    const html = buildInviteHtml({ inviteUrl, student, tutor, expiresAt });

    const gmailPayload = await sendGmail({
      from,
      to: recipients,
      subject,
      text,
      html,
    });

    return jsonResponse({
      success: true,
      invite_id: invite.id,
      gmail_message_id: gmailPayload.id ?? "",
      invite_url: inviteUrl,
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
