from __future__ import annotations

import re
from typing import Any

from .agent_utils import agent_response
from .llm import LLMClient
from .prompts import LESSON_REPORT_OUTPUT_SCHEMA, LESSON_REPORT_SYSTEM_PROMPT


def generate_lesson_report(input_data: dict[str, Any], llm: LLMClient | None = None) -> dict[str, Any]:
    if llm:
        return llm.generate_json(
            system_prompt=LESSON_REPORT_SYSTEM_PROMPT,
            user_input=input_data,
            output_schema=LESSON_REPORT_OUTPUT_SCHEMA,
        )

    student = input_data.get("student", {})
    lesson_log = input_data.get("lesson_log", {})
    memo = lesson_log.get("raw_memo", input_data.get("lesson_memo", ""))
    name = student.get("student_name", student.get("name", "학생"))

    progress = _extract_progress(memo)
    weakness = _extract_weakness(memo)
    homework_status = _extract_homework(memo)
    next_plan = _make_next_plan(progress, weakness)

    parent_report = (
        f"안녕하세요. 오늘 {name} 학생은 {progress} 내용을 중심으로 수업했습니다. "
        f"수업 중에는 {weakness} 부분을 조금 더 점검할 필요가 있었습니다. "
        f"숙제는 {homework_status} 상태로 확인했습니다. "
        f"다음 수업에서는 {next_plan} 방향으로 이어가겠습니다."
    )

    return agent_response(
        "lesson_report",
        {
            "progress": progress,
            "weakness": weakness,
            "homework_status": homework_status,
            "next_plan": next_plan,
            "parent_report": parent_report,
        },
    )


def _extract_progress(memo: str) -> str:
    if "오늘" in memo and "수업" in memo:
        chunk = memo.split("오늘", 1)[1].split("수업", 1)[0]
        return chunk.strip(" .")
    if "진도" in memo:
        return memo.split("진도", 1)[-1].strip(" .:")
    return "수업 내용 정리 및 개념 점검"


def _extract_weakness(memo: str) -> str:
    hints: list[str] = []
    if "헷갈" in memo:
        match = re.search(r"([가-힣A-Za-z0-9· ]+)\s*개념\s*헷갈", memo)
        hints.append((match.group(1).strip() + " 개념") if match else "개념 이해")
    if "실수" in memo:
        hints.append("계산 실수")
    if "미완" in memo or "안 해" in memo:
        hints.append("숙제 완성도")
    return ", ".join(dict.fromkeys(hints)) if hints else "현재 큰 취약점은 안정적으로 관리 중"


def _extract_homework(memo: str) -> str:
    match = re.search(r"숙제\s*(\d+)\s*문제\s*중\s*(\d+)\s*문제\s*완료", memo)
    if match:
        return f"{match.group(1)}문제 중 {match.group(2)}문제 완료"
    if "숙제" in memo and ("잘" in memo or "완료" in memo):
        return "대체로 잘 완료"
    if "숙제" in memo and ("미완" in memo or "안 해" in memo):
        return "일부 미완료"
    return "별도 확인 필요"


def _make_next_plan(progress: str, weakness: str) -> str:
    if "로그" in weakness:
        return "로그 기본 개념 복습 후 지수·로그 연결 문제 풀이"
    if "계산 실수" in weakness:
        return f"{progress} 관련 대표 유형 복습과 계산 과정 점검"
    return f"{progress} 심화 문제 풀이와 다음 단원 예습"

