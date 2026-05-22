from __future__ import annotations

from ai_tutor_agents.agents import (
    build_message_queue,
    create_tutor_profile,
    generate_lesson_report,
    generate_payment_reminder,
)


def test_lesson_report_cases() -> None:
    profile = create_tutor_profile(
        {
            "subject": "고등 수학",
            "teaching_style": "꼼꼼하게 개념을 잡아주는 스타일",
            "payment_policy": "월 4회 선결제",
            "parent_tone": "정중하지만 부담스럽지 않게",
        }
    )["agent_profile"]

    cases = [
        "오늘 이차함수 최대최소 수업. 숙제 잘 완료. 개념 안정적.",
        "오늘 지수함수 그래프 이동 수업. 로그 개념 헷갈려함. 숙제 15문제 중 9문제 완료. 계산 실수 많음.",
        "오늘 수열 기본 유형 수업. 숙제 미완. 최근 자신감이 떨어져 보여 쉬운 문제부터 다시 정리함.",
    ]

    for memo in cases:
        result = generate_lesson_report(
            {
                "student": {"name": "김서윤", "grade": "고1", "subject": "수학"},
                "lesson_memo": memo,
                "agent_profile": profile,
            }
        )
        assert result["parent_report"]
        assert result["next_plan"]


def test_payment_cases() -> None:
    profile = create_tutor_profile(
        {
            "subject": "중등 영어",
            "teaching_style": "차분하게 약점을 정리하는 스타일",
            "payment_policy": "월 4회 선결제",
            "parent_tone": "정중하지만 부담스럽지 않게",
        }
    )["agent_profile"]

    unpaid = generate_payment_reminder(
        {
            "student_name": "박민준",
            "parent_name": "박민준 학부모님",
            "payment_status": "unpaid",
            "payment_due_date": "2026-05-24",
            "amount": 280000,
            "class_count": 4,
            "next_class": "2026-05-24 18:00",
            "agent_profile": profile,
        }
    )
    overdue = generate_payment_reminder(
        {
            "student_name": "박민준",
            "parent_name": "박민준 학부모님",
            "payment_status": "unpaid",
            "payment_due_date": "2026-05-22",
            "amount": 280000,
            "class_count": 4,
            "next_class": "2026-05-23 18:00",
            "agent_profile": profile,
        }
    )
    pending = generate_payment_reminder(
        {
            "student_name": "박민준",
            "parent_name": "박민준 학부모님",
            "payment_status": "pending",
            "payment_due_date": "2026-05-24",
            "amount": 280000,
            "class_count": 4,
            "next_class": "2026-05-24 18:00",
            "agent_profile": profile,
        }
    )
    paid = generate_payment_reminder(
        {
            "student_name": "박민준",
            "parent_name": "박민준 학부모님",
            "payment_status": "paid",
            "payment_due_date": "2026-05-24",
            "amount": 280000,
            "class_count": 4,
            "next_class": "2026-05-24 18:00",
            "agent_profile": profile,
        }
    )
    assert unpaid["should_send"] is True
    assert unpaid["message_type"] == "payment_reminder"
    assert unpaid["urgency"] == "normal"
    assert "수업 자료" in unpaid["message_body"]
    assert overdue["should_send"] is True
    assert overdue["urgency"] == "high"
    assert pending["should_send"] is True
    assert pending["message_body"]
    assert paid["should_send"] is False
    assert paid["urgency"] == "none"
    assert paid["message_body"] == ""


def test_message_queue() -> None:
    queue = build_message_queue(
        {
            "report_result": {"parent_report": "오늘 수업 리포트입니다."},
            "payment_result": {
                "should_send": True,
                "message_body": "결제 안내입니다.",
            },
            "student_context": {"name": "김서윤"},
            "send_channel": "email_mock",
        }
    )
    assert len(queue["message_queue"]) == 2
    assert queue["message_queue"][0]["message_type"] == "lesson_report"
    assert queue["message_queue"][1]["message_type"] == "payment_reminder"


if __name__ == "__main__":
    test_lesson_report_cases()
    test_payment_cases()
    test_message_queue()
    print("All tests passed.")

