from __future__ import annotations

from datetime import datetime
from typing import Any

from .agent_utils import agent_response
from .llm import LLMClient
from .prompts import PAYMENT_REMINDER_OUTPUT_SCHEMA, PAYMENT_REMINDER_SYSTEM_PROMPT


def generate_payment_reminder(input_data: dict[str, Any], llm: LLMClient | None = None) -> dict[str, Any]:
    if llm:
        return llm.generate_json(
            system_prompt=PAYMENT_REMINDER_SYSTEM_PROMPT,
            user_input=input_data,
            output_schema=PAYMENT_REMINDER_OUTPUT_SCHEMA,
        )

    payment = input_data.get("payment", input_data)
    student = input_data.get("student", {})
    payment_status = payment.get("payment_status", "pending")

    if payment_status == "paid":
        return agent_response(
            "payment_reminder",
            {
                "should_send": False,
                "urgency": "low",
                "message_body": "",
            },
        )

    student_name = student.get("student_name", payment.get("student_name", "학생"))
    parent_name = student.get("parent_name", payment.get("parent_name", "학부모님"))
    amount = int(payment.get("amount", 0))
    class_count = payment.get("class_count", 0)
    next_class = payment.get("next_class", "")
    due_date = payment.get("payment_due_date", "")
    urgency = _payment_urgency(due_date)

    return agent_response(
        "payment_reminder",
        {
            "should_send": True,
            "urgency": urgency,
            "message_body": (
                f"안녕하세요, {parent_name}. {student_name} 학생의 다음 수업이 "
                f"{next_class}에 예정되어 있어 수업 준비 차 안내드립니다. "
                f"이번 {class_count}회차 수업료는 {amount:,}원이며, 결제 예정일은 {due_date}입니다. "
                "확인 가능하실 때 편하게 처리 부탁드립니다."
            ),
        },
    )


def _payment_urgency(due_date: str) -> str:
    try:
        due = datetime.fromisoformat(due_date).date()
        today = datetime.now().date()
    except ValueError:
        return "normal"
    return "high" if due <= today else "normal"

