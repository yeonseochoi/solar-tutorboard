from __future__ import annotations

from ai_tutor_agents.agents import (
    build_message_queue,
    create_tutor_profile,
    generate_lesson_report,
    generate_payment_reminder,
)


STUDENT = {
    "student_id": "S001",
    "student_name": "김서윤",
    "grade": "고1",
    "subject": "수학",
    "parent_name": "김서윤 학부모님",
}

TEACHER = {
    "teacher_id": "T001",
    "teacher_name": "우은비",
    "teaching_style": "꼼꼼한 개념 설명형",
    "parent_tone": "정중하지만 부담스럽지 않게",
}


def test_lesson_report_cases() -> None:
    profile = create_tutor_profile({"teacher": TEACHER})

    cases = [
        "오늘 이차함수 최대최소 수업. 숙제 잘 완료. 개념 안정적.",
        "오늘 지수함수 그래프 이동 수업. 로그 개념 헷갈려함. 숙제 15문제 중 9문제 완료. 계산 실수 많음.",
        "오늘 수열 기본 유형 수업. 숙제 미완. 최근 자신감이 떨어져 보여 쉬운 문제부터 다시 정리함.",
    ]

    for index, memo in enumerate(cases, start=1):
        result = generate_lesson_report(
            {
                "student": STUDENT,
                "lesson_log": {
                    "lesson_id": f"L00{index}",
                    "lesson_date": "2026-05-23",
                    "raw_memo": memo,
                },
                "agent_profile": profile["result"],
            }
        )
        assert result["success"] is True
        assert result["agent_type"] == "lesson_report"
        assert result["result"]["parent_report"]
        assert result["result"]["next_plan"]


def test_payment_cases() -> None:
    profile = create_tutor_profile({"teacher": TEACHER})

    unpaid = generate_payment_reminder(
        {
            "student": STUDENT,
            "payment": {
                "payment_status": "unpaid",
                "payment_due_date": "2026-05-24",
                "amount": 280000,
                "class_count": 4,
                "next_class": "2026-05-24 18:00",
            },
            "agent_profile": profile["result"],
        }
    )
    overdue = generate_payment_reminder(
        {
            "student": STUDENT,
            "payment": {
                "payment_status": "unpaid",
                "payment_due_date": "2026-05-22",
                "amount": 280000,
                "class_count": 4,
                "next_class": "2026-05-23 18:00",
            },
            "agent_profile": profile["result"],
        }
    )
    paid = generate_payment_reminder(
        {
            "student": STUDENT,
            "payment": {
                "payment_status": "paid",
                "payment_due_date": "2026-05-24",
                "amount": 280000,
                "class_count": 4,
                "next_class": "2026-05-24 18:00",
            },
            "agent_profile": profile["result"],
        }
    )
    assert unpaid["success"] is True
    assert unpaid["agent_type"] == "payment_reminder"
    assert unpaid["result"]["should_send"] is True
    assert unpaid["result"]["urgency"] == "normal"
    assert "수업 자료" in unpaid["result"]["message_body"]
    assert overdue["result"]["should_send"] is True
    assert overdue["result"]["urgency"] == "high"
    assert paid["result"]["should_send"] is False
    assert paid["result"]["urgency"] == "low"
    assert paid["result"]["message_body"] == ""


def test_message_queue() -> None:
    queue = build_message_queue(
        {
            "report_result": {
                "success": True,
                "agent_type": "lesson_report",
                "result": {"parent_report": "오늘 수업 리포트입니다."},
            },
            "payment_result": {
                "success": True,
                "agent_type": "payment_reminder",
                "result": {
                    "should_send": True,
                    "urgency": "normal",
                    "message_body": "결제 안내입니다.",
                },
            },
            "student": STUDENT,
            "send_channel": "email_mock",
        }
    )
    assert queue["success"] is True
    assert queue["agent_type"] == "message_queue"
    assert len(queue["result"]["messages"]) == 2
    assert queue["result"]["messages"][0]["message_type"] == "lesson_report"
    assert queue["result"]["messages"][1]["message_status"] == "pending"


if __name__ == "__main__":
    test_lesson_report_cases()
    test_payment_cases()
    test_message_queue()
    print("All tests passed.")

