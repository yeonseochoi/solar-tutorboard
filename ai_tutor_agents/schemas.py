from __future__ import annotations

from typing import Any


PAYMENT_STATUS_VALUES = ["paid", "unpaid"]
URGENCY_VALUES = ["low", "normal", "high"]
MESSAGE_STATUS_VALUES = ["pending", "sent"]


STUDENT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["student_id", "student_name", "grade", "subject", "parent_name"],
    "properties": {
        "student_id": {"type": "string"},
        "student_name": {"type": "string"},
        "grade": {"type": "string"},
        "subject": {"type": "string"},
        "parent_name": {"type": "string"},
    },
}


TEACHER_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["teacher_id", "teacher_name", "teaching_style", "parent_tone"],
    "properties": {
        "teacher_id": {"type": "string"},
        "teacher_name": {"type": "string"},
        "teaching_style": {"type": "string"},
        "parent_tone": {"type": "string"},
    },
}


LESSON_LOG_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["lesson_id", "lesson_date", "raw_memo"],
    "properties": {
        "lesson_id": {"type": "string"},
        "lesson_date": {"type": "string", "description": "YYYY-MM-DD"},
        "raw_memo": {"type": "string"},
    },
}


def common_response_schema(agent_type: str, result_schema: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "object",
        "required": ["success", "agent_type", "result"],
        "properties": {
            "success": {"type": "boolean", "const": True},
            "agent_type": {"type": "string", "const": agent_type},
            "result": result_schema,
        },
    }


TUTOR_PROFILE_RESULT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["tone", "communication_rules", "report_format"],
    "properties": {
        "tone": {"type": "string"},
        "communication_rules": {"type": "array", "items": {"type": "string"}},
        "report_format": {"type": "array", "items": {"type": "string"}},
    },
}


LESSON_REPORT_RESULT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": [
        "progress",
        "weakness",
        "homework_status",
        "next_plan",
        "parent_report",
    ],
    "properties": {
        "progress": {"type": "string"},
        "weakness": {"type": "string"},
        "homework_status": {"type": "string"},
        "next_plan": {"type": "string"},
        "parent_report": {"type": "string"},
    },
}


PAYMENT_REMINDER_RESULT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["should_send", "urgency", "message_body"],
    "properties": {
        "should_send": {"type": "boolean"},
        "urgency": {"type": "string", "enum": URGENCY_VALUES},
        "message_body": {"type": "string"},
    },
}


MESSAGE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": [
        "student_id",
        "student_name",
        "message_type",
        "channel",
        "message_status",
        "message_body",
    ],
    "properties": {
        "student_id": {"type": "string"},
        "student_name": {"type": "string"},
        "message_type": {"type": "string", "enum": ["lesson_report", "payment_reminder"]},
        "channel": {"type": "string"},
        "message_status": {"type": "string", "enum": MESSAGE_STATUS_VALUES},
        "message_body": {"type": "string"},
    },
}


MESSAGE_QUEUE_RESULT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["messages"],
    "properties": {
        "messages": {
            "type": "array",
            "items": MESSAGE_SCHEMA,
        }
    },
}


TUTOR_PROFILE_SCHEMA = common_response_schema("tutor_profile", TUTOR_PROFILE_RESULT_SCHEMA)
LESSON_REPORT_SCHEMA = common_response_schema("lesson_report", LESSON_REPORT_RESULT_SCHEMA)
PAYMENT_REMINDER_SCHEMA = common_response_schema("payment_reminder", PAYMENT_REMINDER_RESULT_SCHEMA)
MESSAGE_QUEUE_SCHEMA = common_response_schema("message_queue", MESSAGE_QUEUE_RESULT_SCHEMA)

