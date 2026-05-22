from __future__ import annotations

import argparse
import json
import os
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from uuid import uuid4

from ai_tutor_agents.agent_utils import agent_response
from ai_tutor_agents.agents import generate_lesson_report, generate_payment_reminder
from ai_tutor_agents.env import load_env
from ai_tutor_agents.llm import LLMClient, SolarProClient


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def _int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _lesson_agent_input(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "student": {
            "student_id": _text(payload.get("student_id")),
            "student_name": _text(payload.get("student_name")),
            "grade": _text(payload.get("grade")),
            "subject": _text(payload.get("subject")),
            "parent_name": _text(payload.get("parent_name")),
        },
        "lesson_log": {
            "lesson_id": _text(payload.get("lesson_id") or uuid4()),
            "lesson_date": _text(payload.get("lesson_date") or date.today().isoformat()),
            "raw_memo": _text(payload.get("lesson_memo") or payload.get("raw_memo")),
        },
    }


def _payment_agent_input(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "student": {
            "student_id": _text(payload.get("student_id")),
            "student_name": _text(payload.get("student_name")),
            "grade": _text(payload.get("grade")),
            "subject": _text(payload.get("subject")),
            "parent_name": _text(payload.get("parent_name")),
        },
        "payment": {
            "payment_status": _text(payload.get("payment_status") or "unpaid"),
            "payment_due_date": _text(payload.get("payment_due_date")),
            "amount": _int(payload.get("amount")),
            "class_count": _int(payload.get("class_count")),
            "next_class": _text(payload.get("next_class")),
        },
    }


def _message_queue_response(payload: dict[str, Any]) -> dict[str, Any]:
    message_type = _text(payload.get("message_type"))
    if message_type not in {"lesson_report", "payment_reminder"}:
        raise ValueError("message_type must be lesson_report or payment_reminder")

    return agent_response(
        "message_queue",
        {
            "messages": [
                {
                    "tutor_id": _text(payload.get("tutor_id")),
                    "student_id": _text(payload.get("student_id")),
                    "message_type": message_type,
                    "channel": _text(payload.get("channel") or "email_mock"),
                    "message_status": "pending",
                    "message_body": _text(payload.get("message_body")),
                }
            ]
        },
    )


class AgentApiHandler(BaseHTTPRequestHandler):
    llm: LLMClient | None = None
    cors_origin = "*"

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _set_headers(self, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", self.cors_origin)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _write_json(self, data: dict[str, Any], status: int = 200) -> None:
        self._set_headers(status)
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _read_payload(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or "0")
        raw_body = self.rfile.read(length).decode("utf-8") if length else "{}"
        payload = json.loads(raw_body)
        if not isinstance(payload, dict):
            raise ValueError("JSON body must be an object")
        return payload

    def do_OPTIONS(self) -> None:
        self._set_headers(204)

    def do_GET(self) -> None:
        if self.path.rstrip("/") == "/health":
            self._write_json({"ok": True, "agent": "solar_tutorboard"})
            return
        self._write_json({"error": "not_found"}, status=404)

    def do_POST(self) -> None:
        try:
            payload = self._read_payload()
            path = self.path.rstrip("/")

            if path == "/lesson_report":
                result = generate_lesson_report(_lesson_agent_input(payload), llm=self.llm)
            elif path == "/payment_reminder":
                result = generate_payment_reminder(_payment_agent_input(payload), llm=self.llm)
            elif path == "/message_queue":
                result = _message_queue_response(payload)
            else:
                self._write_json({"error": "not_found"}, status=404)
                return

            self._write_json(result)
        except Exception as exc:
            self._write_json({"success": False, "error": str(exc)}, status=400)


def main() -> None:
    load_env()

    parser = argparse.ArgumentParser(description="Solar Tutorboard Python Agent API")
    parser.add_argument("--host", default=os.environ.get("AGENT_API_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("AGENT_API_PORT", "8000")))
    parser.add_argument(
        "--solar",
        action="store_true",
        default=os.environ.get("AGENT_USE_SOLAR") == "1",
        help="Use Solar API through SOLAR_API_KEY. Default uses local deterministic agents.",
    )
    args = parser.parse_args()

    AgentApiHandler.llm = SolarProClient() if args.solar else None
    AgentApiHandler.cors_origin = os.environ.get("AGENT_CORS_ORIGIN", "*")

    server = ThreadingHTTPServer((args.host, args.port), AgentApiHandler)
    mode = "solar" if AgentApiHandler.llm else "local"
    print(f"Agent API running on http://{args.host}:{args.port} ({mode})")
    server.serve_forever()


if __name__ == "__main__":
    main()
