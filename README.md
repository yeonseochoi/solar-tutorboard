# AI Tutor Parent Communication Agents

과외 선생님의 짧은 수업 메모를 학부모용 리포트와 결제 안내 메시지로 바꾸는 Python AI Agent 파이프라인입니다.
웹 백엔드 없이 터미널에서 먼저 검증할 수 있도록 구성했습니다.

## Agent Structure

1. `Tutor Profile Agent`
2. `Lesson Report Agent`
3. `Payment Reminder Agent`
4. `Parent Communication Agent / Orchestrator`

최종 결과는 UI, DB, 메일 발송 모듈에 넘기기 쉬운 `message_queue` JSON입니다.

## Run Without API

API 없이 로컬 mock 로직으로 실행합니다.

```bash
python demo.py
```

테스트:

```bash
python tests.py
```

## Run With Solar API

먼저 `.env.example`을 복사해서 `.env` 파일을 만듭니다.

```bash
cp .env.example .env
```

Windows PowerShell에서는 직접 파일을 복사해도 되고, 아래 명령을 써도 됩니다.

```powershell
Copy-Item .env.example .env
```

그다음 `.env` 파일 안의 값을 실제 Solar API 키로 바꿉니다.

```env
SOLAR_API_KEY=your_solar_api_key_here
SOLAR_MODEL=solar-pro3
SOLAR_BASE_URL=https://api.upstage.ai/v1/chat/completions
```

실행:

```bash
python demo.py --solar
```

PowerShell에서 환경변수를 직접 넣어도 됩니다.

```powershell
$env:SOLAR_API_KEY="your_api_key"
python demo.py --solar
```

## Files

- `ai_tutor_agents/prompts.py`: Agent별 system prompt와 output schema
- `ai_tutor_agents/schemas.py`: 고정 JSON schema 이름
- `ai_tutor_agents/agents.py`: 각 Agent 호출 함수
- `ai_tutor_agents/llm.py`: Solar API 호출 코드
- `ai_tutor_agents/env.py`: `.env` 파일 로더
- `ai_tutor_agents/pipeline.py`: 전체 Agent 연결 흐름
- `demo.py`: 시연용 입력 데이터
- `tests.py`: Agent별 테스트 케이스

## Fixed JSON Names

- `agent_profile`
- `lesson_report`
- `payment_reminder`
- `message_queue`

