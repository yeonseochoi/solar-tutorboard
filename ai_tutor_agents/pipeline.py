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
    profile = create_tutor_profile(input_data["tutor_profile_input"], llm=llm)

    lesson_input = {
        **input_data["lesson_report_input"],
        "agent_profile": profile["agent_profile"],
    }
    lesson_report = generate_lesson_report(lesson_input, llm=llm)

    payment_input = {
        **input_data["payment_reminder_input"],
        "agent_profile": profile["agent_profile"],
    }
    payment_reminder = generate_payment_reminder(payment_input, llm=llm)

    message_queue = build_message_queue(
        {
            "report_result": lesson_report,
            "payment_result": payment_reminder,
            "student_context": input_data["lesson_report_input"]["student"],
            "send_channel": input_data.get("send_channel", "email_mock"),
        },
        llm=llm,
    )

    return {
        "agent_profile": profile["agent_profile"],
        "lesson_report": lesson_report,
        "payment_reminder": payment_reminder,
        "message_queue": message_queue["message_queue"],
    }

