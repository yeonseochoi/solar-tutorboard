import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://hwrgylwqgqjurkrdjtrd.supabase.co";
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ub6aGG-pH7OLF2BvU6WHKA_c3mBIIX6";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const DEMO_TUTOR_ID = "11111111-1111-1111-1111-111111111111";
export const DEMO_STUDENT_ID = "22222222-2222-2222-2222-222222222222";

export const DEMO_TUTOR = {
  id: DEMO_TUTOR_ID,
  name: "데모 선생님",
  subject: "고등 수학",
  teaching_style: "꼼꼼하게 개념을 잡아주는 스타일",
  payment_policy: "월 4회 선결제",
  parent_tone: "정중하지만 부담스럽지 않게",
};
