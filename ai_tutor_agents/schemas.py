from __future__ import annotations

from typing import Any


AGENT_PROFILE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["agent_profile"],
    "properties": {
        "agent_profile": {
            "type": "object",
            "required": ["subject", "tone", "communication_rules", "report_format"],
            "properties": {
                "subject": {"type": "string"},
                "tone": {"type": "string"},
                "communication_rules": {"type": "array", "items": {"type": "string"}},
                "report_format": {"type": "array", "items": {"type": "string"}},
            },
        }
    },
}


LESSON_REPORT_SCHEMA: dict[str, Any] = {
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


PAYMENT_REMINDER_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["should_send", "message_type", "urgency", "message_body"],
    "properties": {
        "should_send": {"type": "boolean"},
        "message_type": {"type": "string", "const": "payment_reminder"},
        "urgency": {"type": "string", "enum": ["none", "normal", "high"]},
        "message_body": {"type": "string"},
    },
}


MESSAGE_QUEUE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["message_queue"],
    "properties": {
        "message_queue": {
            "type": "array",
            "items": {
                "type": "object",
                "required": [
                    "student_name",
                    "message_type",
                    "channel",
                    "status",
                    "message_body",
                ],
                "properties": {
                    "student_name": {"type": "string"},
                    "message_type": {
                        "type": "string",
                        "enum": ["lesson_report", "payment_reminder"],
                    },
                    "channel": {"type": "string"},
                    "status": {"type": "string", "const": "pending"},
                    "message_body": {"type": "string"},
                },
            },
        }
    },
}

