from __future__ import annotations

from typing import Any

from .agent_utils import agent_response
from .llm import LLMClient
from .prompts import (
    PARENT_COMMUNICATION_OUTPUT_SCHEMA,
    PARENT_COMMUNICATION_SYSTEM_PROMPT,
)


def build_message_queue(input_data: dict[str, Any], llm: LLMClient | None = None) -> dict[str, Any]:
    if llm:
        return llm.generate_json(
            system_prompt=PARENT_COMMUNICATION_SYSTEM_PROMPT,
            user_input=input_data,
            output_schema=PARENT_COMMUNICATION_OUTPUT_SCHEMA,
        )

    report_response = input_data.get("report_result", {})
    payment_response = input_data.get("payment_result", {})
    student = input_data.get("student", input_data.get("student_context", {}))
    channel = input_data.get("send_channel", "email_mock")

    report_result = report_response.get("result", report_response)
    payment_result = payment_response.get("result", payment_response)
    student_id = student.get("student_id", "")
    student_name = student.get("student_name", student.get("name", "학생"))

    messages = [
        {
            "student_id": student_id,
            "student_name": student_name,
            "message_type": "lesson_report",
            "channel": channel,
            "message_status": "pending",
            "message_body": report_result.get("parent_report", ""),
        }
    ]

    if payment_result.get("should_send"):
        messages.append(
            {
                "student_id": student_id,
                "student_name": student_name,
                "message_type": "payment_reminder",
                "channel": channel,
                "message_status": "pending",
                "message_body": payment_result.get("message_body", ""),
            }
        )

    return agent_response("message_queue", {"messages": messages})

