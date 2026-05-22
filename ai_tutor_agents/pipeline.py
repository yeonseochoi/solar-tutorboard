from __future__ import annotations

from typing import Any

from .agents import (
    build_message_queue,
    create_tutor_profile,
    generate_lesson_report,
    generate_payment_reminder,
)
from .llm import LLMClient


def run_tutor_agent_pipeline(input_data: dict[str, Any], llm: LLMClient | None = None) -> dict[str, Any]:
    student = input_data["student"]
    teacher = input_data["teacher"]
    lesson_log = input_data["lesson_log"]
    payment = input_data["payment"]

    tutor_profile = create_tutor_profile({"teacher": teacher}, llm=llm)

    lesson_report = generate_lesson_report(
        {
            "student": student,
            "lesson_log": lesson_log,
            "agent_profile": tutor_profile["result"],
        },
        llm=llm,
    )

    payment_reminder = generate_payment_reminder(
        {
            "student": student,
            "payment": payment,
            "agent_profile": tutor_profile["result"],
        },
        llm=llm,
    )

    message_queue = build_message_queue(
        {
            "report_result": lesson_report,
            "payment_result": payment_reminder,
            "student": student,
            "send_channel": input_data.get("send_channel", "email_mock"),
        },
        llm=llm,
    )

    return {
        "agent_profile": tutor_profile,
        "lesson_report": lesson_report,
        "payment_reminder": payment_reminder,
        "message_queue": message_queue,
    }

