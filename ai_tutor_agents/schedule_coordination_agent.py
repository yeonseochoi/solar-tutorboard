from __future__ import annotations

from typing import Any

from .agent_utils import agent_response
from .llm import LLMClient
from .prompts import (
    SCHEDULE_COORDINATION_OUTPUT_SCHEMA,
    SCHEDULE_COORDINATION_SYSTEM_PROMPT,
)


def coordinate_schedule(input_data: dict[str, Any], llm: LLMClient | None = None) -> dict[str, Any]:
    if llm:
        return llm.generate_json(
            system_prompt=SCHEDULE_COORDINATION_SYSTEM_PROMPT,
            user_input=input_data,
            output_schema=SCHEDULE_COORDINATION_OUTPUT_SCHEMA,
        )

    student = input_data.get("student", {})
    request = input_data.get("schedule_request", {})

    student_name = student.get("student_name", student.get("name", "학생"))
    parent_name = student.get("parent_name", "학부모님")
    requested_time = _normalize_time(request.get("requested_time", ""))
    available_times = [_normalize_time(value) for value in request.get("available_times", [])]
    available_times = [value for value in available_times if value]

    matched_time = _find_match(requested_time, available_times)
    if matched_time:
        return agent_response(
            "schedule_coordination",
            {
                "should_update": True,
                "recommended_status": "approved",
                "matched_time": matched_time,
                "reason": "요청 시간이 선생님의 가능 시간과 일치합니다.",
                "message_body": (
                    f"안녕하세요, {parent_name}. 요청해주신 {matched_time} 일정으로 "
                    f"{student_name} 학생 수업 변경이 가능합니다. 해당 시간으로 일정에 반영해두겠습니다."
                ),
            },
        )

    alternatives = ", ".join(available_times[:3])
    alternative_text = f" 현재 가능한 시간은 {alternatives}입니다." if alternatives else ""
    return agent_response(
        "schedule_coordination",
        {
            "should_update": True,
            "recommended_status": "rejected",
            "matched_time": "",
            "reason": "요청 시간이 현재 등록된 선생님의 가능 시간과 일치하지 않습니다.",
            "message_body": (
                f"안녕하세요, {parent_name}. 요청해주신 {requested_time} 일정은 현재 조율이 어렵습니다."
                f"{alternative_text} 편하신 시간을 다시 선택해주시면 확인하겠습니다."
            ),
        },
    )


def _normalize_time(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if "T" in text:
        date_part, time_part = text.split("T", 1)
        return f"{date_part} {time_part[:5]}"
    return text[:16]


def _find_match(requested_time: str, available_times: list[str]) -> str:
    if not requested_time:
        return ""
    for available_time in available_times:
        if available_time == requested_time:
            return available_time
    return ""
