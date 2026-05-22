# AI Tutor Parent Communication Agents

과외 선생님 메모를 학부모용 리포트와 결제 안내 메시지로 바꾸는 Python AI Agent 파이프라인입니다.
웹 백엔드 없이 터미널에서 먼저 검증할 수 있도록 구성했습니다.

## Agent 구조

1. `Tutor Profile Agent`
2. `Lesson Report Agent`
3. `Payment Reminder Agent`
4. `Parent Communication Agent / Orchestrator`

최종 결과는 UI나 DB에 넘기기 쉬운 `message_queue` JSON입니다.

## 실행

API 없이 로컬 규칙 기반 mock으로 실행:

```bash
python demo.py
```

테스트:

```bash
python tests.py
```

Solar Pro API를 붙여 실행:

```bash
set SOLAR_API_KEY=your_api_key
python demo.py --solar
```

PowerShell에서는:

```powershell
$env:SOLAR_API_KEY="your_api_key"
python demo.py --solar
```

## 핵심 파일

- `ai_tutor_agents/prompts.py`: Agent별 system prompt와 output schema
- `ai_tutor_agents/schemas.py`: 고정 JSON schema 이름
- `ai_tutor_agents/agents.py`: 각 Agent 호출 함수
- `ai_tutor_agents/pipeline.py`: 전체 Agent 연결 흐름
- `demo.py`: 시연용 입력 데이터
- `tests.py`: Agent별 테스트 케이스

## 고정 JSON 이름

- `agent_profile`
- `lesson_report`
- `payment_reminder`
- `message_queue`

