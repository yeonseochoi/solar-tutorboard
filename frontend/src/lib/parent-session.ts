import { DEMO_STUDENT_ID } from "@/lib/supabase";

export const PARENT_STUDENT_ID_KEY = "parent_student_id";
export const PARENT_INVITE_TOKEN_KEY = "parent_invite_token";
export const PARENT_ACCOUNT_LABEL_KEY = "parent_account_label";

export function getParentStudentId() {
  if (typeof window === "undefined") return DEMO_STUDENT_ID;
  return localStorage.getItem(PARENT_STUDENT_ID_KEY) || DEMO_STUDENT_ID;
}

export function getParentAccountLabel() {
  if (typeof window === "undefined") return "김서윤 학부모님";
  return localStorage.getItem(PARENT_ACCOUNT_LABEL_KEY) || "김서윤 학부모님";
}

export function setParentSession(
  student_id: string,
  invite_token?: string,
  account_label?: string,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem("demo_role", "parent");
  localStorage.setItem(PARENT_STUDENT_ID_KEY, student_id);
  if (invite_token) {
    localStorage.setItem(PARENT_INVITE_TOKEN_KEY, invite_token);
  }
  if (account_label) {
    localStorage.setItem(PARENT_ACCOUNT_LABEL_KEY, account_label);
  }
}

export function clearParentSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PARENT_STUDENT_ID_KEY);
  localStorage.removeItem(PARENT_INVITE_TOKEN_KEY);
  localStorage.removeItem(PARENT_ACCOUNT_LABEL_KEY);
}
