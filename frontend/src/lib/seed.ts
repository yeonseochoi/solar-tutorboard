import { supabase, DEMO_TUTOR_ID, DEMO_STUDENT_ID, DEMO_TUTOR } from "./supabase";

export async function ensureDemoData() {
  // tutors
  await supabase.from("tutors").upsert(
    {
      id: DEMO_TUTOR_ID,
      name: DEMO_TUTOR.name,
      subject: DEMO_TUTOR.subject,
      teaching_style: DEMO_TUTOR.teaching_style,
      payment_policy: DEMO_TUTOR.payment_policy,
      parent_tone: DEMO_TUTOR.parent_tone,
    },
    { onConflict: "id" },
  );

  // students
  await supabase.from("students").upsert(
    {
      id: DEMO_STUDENT_ID,
      tutor_id: DEMO_TUTOR_ID,
      name: "김서윤",
      grade: "고1",
      subject: "수학",
      parent_name: "김서윤 학부모님",
      parent_contact: "parent@example.com",
    },
    { onConflict: "id" },
  );

  // payments: 하나만 있도록 (이미 있는지 확인 후 insert)
  const { data: pays } = await supabase
    .from("payments")
    .select("id")
    .eq("student_id", DEMO_STUDENT_ID)
    .limit(1);
  if (!pays || pays.length === 0) {
    const due = new Date();
    due.setDate(due.getDate() + 7);
    await supabase.from("payments").insert({
      tutor_id: DEMO_TUTOR_ID,
      student_id: DEMO_STUDENT_ID,
      payment_status: "unpaid",
      payment_due_date: due.toISOString().slice(0, 10),
      amount: 320000,
      class_count: 4,
      next_class: new Date(Date.now() + 2 * 86400000).toISOString(),
    });
  }

  // schedules: available 슬롯 2개
  const { data: schs } = await supabase
    .from("schedules")
    .select("id")
    .eq("student_id", DEMO_STUDENT_ID)
    .limit(1);
  if (!schs || schs.length === 0) {
    const slot1 = new Date(Date.now() + 3 * 86400000);
    slot1.setHours(19, 0, 0, 0);
    const slot2 = new Date(Date.now() + 5 * 86400000);
    slot2.setHours(20, 0, 0, 0);
    await supabase.from("schedules").insert([
      {
        tutor_id: DEMO_TUTOR_ID,
        student_id: DEMO_STUDENT_ID,
        available_time: slot1.toISOString(),
        requested_time: "",
        status: "available",
      },
      {
        tutor_id: DEMO_TUTOR_ID,
        student_id: DEMO_STUDENT_ID,
        available_time: slot2.toISOString(),
        requested_time: "",
        status: "available",
      },
    ]);
  }
}
