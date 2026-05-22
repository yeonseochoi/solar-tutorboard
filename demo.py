from __future__ import annotations

import argparse
import json

from ai_tutor_agents.env import load_env
from ai_tutor_agents.llm import SolarProClient
from ai_tutor_agents.pipeline import run_tutor_agent_pipeline


DEMO_INPUT = {
    "student": {
        "student_id": "S001",
        "student_name": "김서윤",
        "grade": "고1",
        "subject": "수학",
        "parent_name": "김서윤 학부모님",
    },
    "teacher": {
        "teacher_id": "T001",
        "teacher_name": "우은비",
        "teaching_style": "꼼꼼한 개념 설명형",
        "parent_tone": "정중하지만 부담스럽지 않게",
    },
    "lesson_log": {
        "lesson_id": "L001",
        "lesson_date": "2026-05-23",
        "raw_memo": "오늘 지수함수 그래프 이동 수업. 로그 개념 헷갈려함. 숙제 15문제 중 9문제 완료. 계산 실수 많음.",
    },
    "payment": {
        "payment_status": "unpaid",
        "payment_due_date": "2026-05-24",
        "amount": 320000,
        "class_count": 4,
        "next_class": "2026-05-24 19:00",
    },
    "send_channel": "email_mock",
}


def main() -> None:
    load_env()

    parser = argparse.ArgumentParser()
    parser.add_argument("--solar", action="store_true", help="Use Solar Pro API instead of local mock logic")
    args = parser.parse_args()

    llm = SolarProClient() if args.solar else None
    result = run_tutor_agent_pipeline(DEMO_INPUT, llm=llm)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
