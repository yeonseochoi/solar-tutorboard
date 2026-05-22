from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from .llm import LLMClient
from .prompts import (
    LESSON_REPORT_OUTPUT_SCHEMA,
    LESSON_REPORT_SYSTEM_PROMPT,
    PARENT_COMMUNICATION_OUTPUT_SCHEMA,
    PARENT_COMMUNICATION_SYSTEM_PROMPT,
    PAYMENT_REMINDER_OUTPUT_SCHEMA,
    PAYMENT_REMINDER_SYSTEM_PROMPT,
    TUTOR_PROFILE_OUTPUT_SCHEMA,
    TUTOR_PROFILE_SYSTEM_PROMPT,
)


def create_tutor_profile(input_data: dict[str, Any], llm: LLMClient | None = None) -> dict[str, Any]:
    if llm:
        return llm.generate_json(
            system_prompt=TUTOR_PROFILE_SYSTEM_PROMPT,
            user_input=input_data,
            output_schema=TUTOR_PROFILE_OUTPUT_SCHEMA,
        )

    teaching_style = input_data.get("teaching_style", "꼼꼼하게 지도하는 스타일")
    parent_tone = input_data.get("parent_tone", "정중하지만 부담스럽지 않게")
    tone = "꼼꼼하지만 부담스럽지 않게"
    if "친근" in parent_tone:
        tone = "친근하지만 신뢰감 있게"
    elif "정중" in parent_tone:
        tone = "정중하고 부담스럽지 않게"

    return {
        "agent_profile": {
            "subject": input_data.get("subject", ""),
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
        }
    }


def generate_lesson_report(input_data: dict[str, Any], llm: LLMClient | None = None) -> dict[str, Any]:
    if llm:
        return llm.generate_json(
            system_prompt=LESSON_REPORT_SYSTEM_PROMPT,
            user_input=input_data,
            output_schema=LESSON_REPORT_OUTPUT_SCHEMA,
        )

    memo = input_data.get("lesson_memo", "")
    student = input_data.get("student", {})
    name = student.get("name", "학생")

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

    return {
        "progress": progress,
        "weakness": weakness,
        "homework_status": homework_status,
        "next_plan": next_plan,
        "parent_report": parent_report,
    }


def generate_payment_reminder(input_data: dict[str, Any], llm: LLMClient | None = None) -> dict[str, Any]:
    if llm:
        return llm.generate_json(
            system_prompt=PAYMENT_REMINDER_SYSTEM_PROMPT,
            user_input=input_data,
            output_schema=PAYMENT_REMINDER_OUTPUT_SCHEMA,
        )

    status = input_data.get("payment_status")
    if status == "paid":
        return {
            "should_send": False,
            "message_type": "payment_reminder",
            "urgency": "none",
            "message_body": "",
        }

    parent_name = input_data.get("parent_name", "학부모님")
    student_name = input_data.get("student_name", "학생")
    amount = int(input_data.get("amount", 0))
    class_count = input_data.get("class_count", 0)
    next_class = input_data.get("next_class", "")
    due_date = input_data.get("payment_due_date", "")
    urgency = _payment_urgency(due_date)

    return {
        "should_send": True,
        "message_type": "payment_reminder",
        "urgency": urgency,
        "message_body": (
            f"안녕하세요, {parent_name}. {student_name} 학생의 다음 수업이 "
            f"{next_class}에 예정되어 있어 수업 준비 차 안내드립니다. "
            f"이번 {class_count}회차 수업료는 {amount:,}원이며, 결제 예정일은 {due_date}입니다. "
            "확인 가능하실 때 편하게 처리 부탁드립니다."
        ),
    }


def build_message_queue(input_data: dict[str, Any], llm: LLMClient | None = None) -> dict[str, Any]:
    if llm:
        return llm.generate_json(
            system_prompt=PARENT_COMMUNICATION_SYSTEM_PROMPT,
            user_input=input_data,
            output_schema=PARENT_COMMUNICATION_OUTPUT_SCHEMA,
        )

    report_result = input_data.get("report_result", {})
    payment_result = input_data.get("payment_result", {})
    student_context = input_data.get("student_context", {})
    channel = input_data.get("send_channel", "kakao_mock")
    student_name = student_context.get("name") or student_context.get("student_name", "학생")

    queue = [
        {
            "student_name": student_name,
            "message_type": "lesson_report",
            "channel": channel,
            "status": "pending",
            "message_body": report_result.get("parent_report", ""),
        }
    ]

    if payment_result.get("should_send"):
        queue.append(
            {
                "student_name": student_name,
                "message_type": "payment_reminder",
                "channel": channel,
                "status": "pending",
                "message_body": payment_result.get("message_body", ""),
            }
        )

    return {"message_queue": queue}


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


def _payment_urgency(due_date: str) -> str:
    try:
        due = datetime.fromisoformat(due_date).date()
        today = datetime.now().date()
    except ValueError:
        return "normal"
    return "high" if due <= today else "normal"

