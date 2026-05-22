from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from typing import Any
from urllib import request


class LLMClient(ABC):
    @abstractmethod
    def generate_json(
        self,
        *,
        system_prompt: str,
        user_input: dict[str, Any],
        output_schema: str,
    ) -> dict[str, Any]:
        raise NotImplementedError


class SolarProClient(LLMClient):
    """Minimal OpenAI-compatible client for Solar models.

    Set these values in .env or environment variables before running:
    - SOLAR_API_KEY
    - SOLAR_MODEL, optional, default: solar-pro3
    - SOLAR_BASE_URL, optional, default: https://api.upstage.ai/v1/chat/completions
    """

    def __init__(self) -> None:
        self.api_key = os.environ.get("SOLAR_API_KEY")
        if not self.api_key:
            raise RuntimeError("SOLAR_API_KEY 환경변수가 없습니다. .env 파일을 확인하세요.")
        self.model = os.environ.get("SOLAR_MODEL", "solar-pro3")
        self.base_url = os.environ.get(
            "SOLAR_BASE_URL",
            "https://api.upstage.ai/v1/chat/completions",
        )

    def generate_json(
        self,
        *,
        system_prompt: str,
        user_input: dict[str, Any],
        output_schema: str,
    ) -> dict[str, Any]:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        "INPUT JSON:\n"
                        f"{json.dumps(user_input, ensure_ascii=False)}\n\n"
                        "OUTPUT SCHEMA:\n"
                        f"{output_schema}"
                    ),
                },
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }

        req = request.Request(
            self.base_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with request.urlopen(req, timeout=60) as res:
            data = json.loads(res.read().decode("utf-8"))

        content = data["choices"][0]["message"]["content"]
        return json.loads(content)


class MockLLMClient(LLMClient):
    """Deterministic local fake LLM for demos and tests without API access."""

    def generate_json(
        self,
        *,
        system_prompt: str,
        user_input: dict[str, Any],
        output_schema: str,
    ) -> dict[str, Any]:
        raise RuntimeError(
            "MockLLMClient는 agents.py의 deterministic 함수에서 직접 처리됩니다."
        )

