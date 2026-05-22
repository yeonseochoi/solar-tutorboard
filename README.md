# AI Tutor Parent Communication Agents

과외 선생님의 짧은 수업 메모를 학부모용 리포트와 결제 안내 메시지로 바꾸는 Python AI Agent 파이프라인입니다.
웹 백엔드 없이 터미널에서 먼저 검증할 수 있도록 구성했습니다.

## Shared Schema v1

모든 필드명은 `snake_case`만 사용합니다.

모든 Agent 출력은 아래 공통 구조를 따릅니다.

```json
{
  "success": true,
  "agent_type": "",
  "result": {}
}
```

`null`은 사용하지 않습니다.

- 문자열 값이 없으면 `""`
- 배열 값이 없으면 `[]`

날짜 형식:

- 날짜: `YYYY-MM-DD`
- 날짜 + 시간: `YYYY-MM-DD HH:MM`

Enum:

- `payment_status`: `paid`, `unpaid`
- `urgency`: `low`, `normal`, `high`
- `message_status`: `pending`, `sent`



## Common Input Schemas

### Student

```json
{
  "student_id": "S001",
  "student_name": "김서윤",
  "grade": "고1",
  "subject": "수학",
  "parent_name": "김서윤 학부모님"
}
```

### Teacher

```json
{
  "teacher_id": "T001",
  "teacher_name": "우은비",
  "teaching_style": "꼼꼼한 개념 설명형",
  "parent_tone": "정중하지만 부담스럽지 않게"
}
```

### Lesson Log

```json
{
  "lesson_id": "L001",
  "lesson_date": "2026-05-23",
  "raw_memo": "로그 개념 헷갈려함..."
}
```

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

## Frontend

최종 프론트엔드는 `frontend2`입니다. 기존 `frontend` 폴더는 혼선을 줄이기 위해 제거했습니다.

```bash
cd frontend2
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

## Run Agent API For Frontend

`frontend2`는 기본적으로 로컬 Python Agent API를 호출합니다.

```bash
python3 agent_api.py --host 127.0.0.1 --port 8000
```

Solar API를 실제로 사용하려면 `.env`에 `SOLAR_API_KEY`를 넣고 아래처럼 실행합니다.

```bash
python3 agent_api.py --host 127.0.0.1 --port 8000 --solar
```

프론트에서 다른 Agent API 주소를 쓰려면 `frontend2/.env`에 아래 값을 설정합니다.

```env
VITE_AGENT_API_URL=http://127.0.0.1:8000
```

mock으로 되돌리고 싶을 때만 아래 값을 추가합니다.

```env
VITE_AGENT_USE_MOCK=true
```

PowerShell에서 환경변수를 직접 넣어도 됩니다.

```powershell
$env:SOLAR_API_KEY="your_api_key"
python demo.py --solar
```

## Demo Seed Data

웹 화면에서 바로 쓸 수 있는 mock 데이터:

```text
data/tutorboard_seed.json
```

Supabase에 데모 테이블과 데이터를 넣을 때는 SQL Editor에서 아래 순서로 실행합니다.

```text
supabase/schema.sql
supabase/seed.sql
supabase/demo_access.sql
```

검증 쿼리:

```text
supabase/verify.sql
```

Supabase 연결 정보와 프론트 조회 예시는 아래 문서에 정리되어 있습니다.

```text
docs/supabase_handoff.md
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
- `data/tutorboard_seed.json`: 웹 UI용 데모 seed 데이터
- `supabase/schema.sql`: Supabase 테이블 생성 SQL
- `supabase/seed.sql`: Supabase 데모 데이터 insert SQL
- `supabase/demo_access.sql`: 데모 프론트엔드용 anon/authenticated 접근 권한 SQL
- `supabase/verify.sql`: Supabase seed 검증 SQL
- `docs/supabase_handoff.md`: 프론트/Agent 팀 전달용 DB 연결 가이드

## Fixed JSON Names

- `agent_profile`
- `lesson_report`
- `payment_reminder`
- `message_queue`
