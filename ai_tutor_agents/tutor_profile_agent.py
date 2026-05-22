from __future__ import annotations

from typing import Any

from .agent_utils import agent_response
from .llm import LLMClient
from .prompts import TUTOR_PROFILE_OUTPUT_SCHEMA, TUTOR_PROFILE_SYSTEM_PROMPT


def create_tutor_profile(input_data: dict[str, Any], llm: LLMClient | None = None) -> dict[str, Any]:
    if llm:
        return llm.generate_json(
            system_prompt=TUTOR_PROFILE_SYSTEM_PROMPT,
            user_input=input_data,
            output_schema=TUTOR_PROFILE_OUTPUT_SCHEMA,
        )

    teacher = input_data.get("teacher", input_data)
    teaching_style = teacher.get("teaching_style", "꼼꼼하게 지도하는 스타일")
    parent_tone = teacher.get("parent_tone", "정중하지만 부담스럽지 않게")

    tone = "꼼꼼하지만 부담스럽지 않게"
    if "친근" in parent_tone:
        tone = "친근하지만 신뢰감 있게"
    elif "정중" in parent_tone:
        tone = "정중하고 부담스럽지 않게"

    return agent_response(
        "tutor_profile",
        {
            "tone": tone,
            "communication_rules": [
                "학생을 부정적으로 단정하지 않는다",
                "문제점과 개선 계획을 함께 제시한다",
                "결제 안내는 수업 준비와 연결해 설명한다",
                f"수업 스타일은 '{teaching_style}'을 기준으로 유지한다",
            ],
            "report_format": [
                "오늘의 진도",
                "취약 개념",
                "숙제 상태",
                "다음 수업 계획",
            ],
        },
    )

