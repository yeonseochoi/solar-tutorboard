from __future__ import annotations

from typing import Any


def agent_response(agent_type: str, result: dict[str, Any]) -> dict[str, Any]:
    return {
        "success": True,
        "agent_type": agent_type,
        "result": result,
    }

