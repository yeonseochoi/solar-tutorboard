# Solar Tutorboard

과외 선생님이 짧은 수업 메모와 일정/결제 정보를 입력하면, Solar API 기반 AI Agent가 학부모용 수업 리포트, 결제 안내, 일정 조정 메시지를 생성하는 데모 프로젝트입니다.

현재 구현은 크게 세 부분으로 나뉩니다.

- Python AI Agent: Solar API 또는 로컬 mock 로직으로 JSON 결과 생성
- Supabase DB: 학생, 수업 리포트, 결제, 메시지 큐, 일정 데이터 저장
- Frontend: 선생님용/학부모용 웹 대시보드와 Agent API 연결

## 전체 구조

```text
solar-tutorboard/
├─ ai_tutor_agents/
│  ├─ __init__.py
│  ├─ agent_utils.py
│  ├─ agents.py
│  ├─ env.py
│  ├─ lesson_report_agent.py
│  ├─ llm.py
│  ├─ parent_communication_agent.py
│  ├─ payment_reminder_agent.py
│  ├─ pipeline.py
│  ├─ prompts.py
│  ├─ schedule_coordination_agent.py
│  ├─ schemas.py
│  └─ tutor_profile_agent.py
├─ data/
│  └─ tutorboard_seed.json
├─ docs/
│  ├─ supabase_handoff.md
│  └─ tutorboard_planning_document.md
├─ frontend/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ lib/
│  │  └─ routes/
│  ├─ .env.example
│  ├─ package.json
│  └─ vite.config.ts
├─ supabase/
│  ├─ demo_access.sql
│  ├─ migrate_message_status.sql
│  ├─ schema.sql
│  ├─ seed.sql
│  └─ verify.sql
├─ .env.example
├─ agent_api.py
├─ demo.py
├─ README.md
└─ tests.py
```

## 핵심 데이터 흐름

```text
선생님/학부모 웹 UI
  ↓
frontend/src/lib/agent.ts
  ↓ HTTP POST
agent_api.py
  ↓
ai_tutor_agents/*
  ↓
Solar API 또는 로컬 mock Agent
  ↓
JSON 응답
  ↓
Supabase tables
  ↓
대시보드, 리포트, 메시지 큐 화면에 표시
```

Agent의 공통 출력 형식은 항상 아래 구조를 따릅니다.

```json
{
  "success": true,
  "agent_type": "",
  "result": {}
}
```

## 공통 JSON 규칙

- 필드명은 `snake_case`만 사용합니다.
- `null`은 최소화합니다.
- 문자열 값이 없으면 `""`를 사용합니다.
- 배열 값이 없으면 `[]`를 사용합니다.
- 날짜는 `YYYY-MM-DD` 형식을 사용합니다.
- 날짜와 시간이 함께 필요하면 `YYYY-MM-DD HH:MM` 형식을 사용합니다.

현재 사용하는 enum은 다음과 같습니다.

```text
payment_status: paid, unpaid
message_status: pending, sent
urgency: low, normal, high
schedule_status: available, requested, approved, rejected, cancelled
message_type: lesson_report, payment_reminder, schedule_coordination
```

## Agent 설명

### 1. Tutor Profile Agent

파일: `ai_tutor_agents/tutor_profile_agent.py`

과외 선생님의 운영 스타일을 구조화합니다. 다른 Agent가 문장을 만들 때 기준으로 삼을 수 있는 tone, communication_rules, report_format을 생성합니다.

입력 예시:

```json
{
  "teacher": {
    "teacher_id": "T001",
    "teacher_name": "우은비",
    "teaching_style": "꼼꼼한 개념 설명형",
    "parent_tone": "정중하지만 부담스럽지 않게"
  }
}
```

출력 핵심:

```json
{
  "success": true,
  "agent_type": "tutor_profile",
  "result": {
    "tone": "정중하고 부담스럽지 않게",
    "communication_rules": [],
    "report_format": []
  }
}
```

### 2. Lesson Report Agent

파일: `ai_tutor_agents/lesson_report_agent.py`

선생님의 짧은 수업 메모를 학부모용 리포트로 바꿉니다. 현재 진도, 취약 개념, 숙제 상태, 다음 수업 계획, 학부모용 문장을 생성합니다.

입력 예시:

```json
{
  "student": {
    "student_id": "S001",
    "student_name": "김서윤",
    "grade": "고1",
    "subject": "수학",
    "parent_name": "김서윤 학부모님"
  },
  "lesson_log": {
    "lesson_id": "L001",
    "lesson_date": "2026-05-23",
    "raw_memo": "오늘 지수함수 그래프 이동 수업. 로그 개념 헷갈려함. 숙제 15문제 중 9문제 완료. 계산 실수 많음."
  },
  "agent_profile": {}
}
```

출력 핵심:

```json
{
  "success": true,
  "agent_type": "lesson_report",
  "result": {
    "progress": "지수함수 그래프 이동",
    "weakness": "로그 개념, 계산 실수",
    "homework_status": "15문제 중 9문제 완료",
    "next_plan": "로그 기본 개념 복습 후 지수와 로그 연결 문제 풀이",
    "parent_report": "안녕하세요..."
  }
}
```

### 3. Payment Reminder Agent

파일: `ai_tutor_agents/payment_reminder_agent.py`

결제 상태와 다음 수업 일정을 보고 학부모용 결제 안내 메시지를 생성합니다. 핵심은 결제 안내를 독촉처럼 쓰지 않고, “다음 수업 준비 안내”처럼 정중하게 만드는 것입니다.

입력 예시:

```json
{
  "student": {
    "student_id": "S001",
    "student_name": "김서윤",
    "parent_name": "김서윤 학부모님"
  },
  "payment": {
    "payment_status": "unpaid",
    "payment_due_date": "2026-05-24",
    "amount": 320000,
    "class_count": 4,
    "next_class": "2026-05-24 19:00"
  },
  "agent_profile": {}
}
```

출력 핵심:

```json
{
  "success": true,
  "agent_type": "payment_reminder",
  "result": {
    "should_send": true,
    "urgency": "normal",
    "message_body": "안녕하세요..."
  }
}
```

### 4. Schedule Coordination Agent

파일: `ai_tutor_agents/schedule_coordination_agent.py`

선생님이 등록한 가능 시간과 학생/학부모가 요청한 변경 시간을 비교해서 승인 또는 거절을 추천합니다. 동시에 학부모에게 보낼 일정 조정 안내 메시지를 생성합니다.

입력 예시:

```json
{
  "student": {
    "student_id": "S001",
    "student_name": "김서윤",
    "grade": "고1",
    "subject": "수학",
    "parent_name": "김서윤 학부모님"
  },
  "schedule_request": {
    "schedule_id": "SCH001",
    "available_times": ["2026-05-24 19:00", "2026-05-25 20:00"],
    "requested_time": "2026-05-24 19:00",
    "current_status": "requested"
  }
}
```

판단 기준:

- 요청 시간이 가능 시간 목록에 있으면 `recommended_status`는 `approved`
- 요청 시간이 가능 시간 목록에 없으면 `recommended_status`는 `rejected`
- 거절 시 가능한 대체 시간을 메시지에 포함

출력 핵심:

```json
{
  "success": true,
  "agent_type": "schedule_coordination",
  "result": {
    "should_update": true,
    "recommended_status": "approved",
    "matched_time": "2026-05-24 19:00",
    "reason": "요청 시간이 선생님의 가능 시간과 일치합니다.",
    "message_body": "안녕하세요..."
  }
}
```

### 5. Parent Communication Agent / Orchestrator

파일: `ai_tutor_agents/parent_communication_agent.py`

앞선 Agent 결과를 UI나 DB에 넘기기 쉬운 `message_queue` 형태로 정리합니다. 수업 리포트 메시지, 결제 안내 메시지, 일정 조정 메시지는 최종적으로 모두 메시지 큐에 들어갑니다.

출력 핵심:

```json
{
  "success": true,
  "agent_type": "message_queue",
  "result": {
    "messages": [
      {
        "student_id": "S001",
        "student_name": "김서윤",
        "message_type": "lesson_report",
        "channel": "email_mock",
        "message_status": "pending",
        "message_body": "안녕하세요..."
      }
    ]
  }
}
```

## Python 파일 역할

### 루트 파일

- `demo.py`: 터미널에서 전체 Agent 파이프라인을 한 번 실행하는 데모 파일입니다. `--solar` 옵션을 붙이면 Solar API를 사용합니다.
- `agent_api.py`: 프론트엔드가 호출하는 로컬 HTTP API 서버입니다. `/lesson_report`, `/payment_reminder`, `/schedule_coordination`, `/message_queue`, `/health` 엔드포인트를 제공합니다.
- `tests.py`: Agent별 기본 테스트 케이스입니다. 로컬 mock 로직 기준으로 JSON 구조와 핵심 필드를 검증합니다.
- `.env.example`: Solar API 설정 예시 파일입니다. 실제 키는 `.env`에 넣습니다.

### `ai_tutor_agents/`

- `agent_utils.py`: 모든 Agent가 공통 응답 형식 `{ success, agent_type, result }`를 만들 때 사용하는 유틸입니다.
- `agents.py`: 각 Agent 함수를 한 곳에서 import/export하는 진입점입니다.
- `env.py`: `.env` 파일을 읽어 환경변수로 등록합니다.
- `llm.py`: Solar API 호출 클라이언트입니다. JSON 응답만 파싱하도록 구성되어 있습니다.
- `prompts.py`: Agent별 system prompt와 output schema 텍스트를 정의합니다.
- `schemas.py`: Agent 출력 JSON schema와 enum 값을 정의합니다.
- `pipeline.py`: Tutor Profile, Lesson Report, Payment Reminder, Message Queue를 순서대로 연결하는 파이프라인입니다.
- `tutor_profile_agent.py`: 선생님 운영 스타일을 구조화합니다.
- `lesson_report_agent.py`: 수업 메모를 학부모용 리포트로 변환합니다.
- `payment_reminder_agent.py`: 결제 안내 메시지를 생성합니다.
- `schedule_coordination_agent.py`: 일정 요청을 승인/거절 판단하고 안내 메시지를 생성합니다.
- `parent_communication_agent.py`: 최종 발송 대기 메시지 큐를 생성합니다.

## Frontend 파일 역할

프론트엔드는 `frontend/` 폴더에 있으며, Lovable 기반 Vite/TanStack React 앱입니다.

### 주요 설정 파일

- `frontend/package.json`: 프론트엔드 실행 스크립트와 의존성 목록입니다.
- `frontend/vite.config.ts`: Vite 설정 파일입니다.
- `frontend/.env.example`: 프론트엔드 환경변수 예시입니다.
- `frontend/.env.local`: 로컬 실행용 환경변수 파일입니다. GitHub에는 올리지 않는 것을 권장합니다.

### `frontend/src/lib/`

- `agent.ts`: 프론트엔드에서 Python Agent API를 호출하는 함수들이 있습니다. `generate_lesson_report`, `generate_payment_reminder`, `coordinate_schedule`, `build_message_queue`를 제공합니다.
- `supabase.ts`: Supabase client와 데모 계정 ID를 정의합니다.
- `types.ts`: Tutor, Student, LessonReport, Payment, MessageQueue, Schedule 등 공통 타입을 정의합니다.
- `seed.ts`: 프론트에서 사용할 수 있는 데모 seed 데이터입니다.
- `role.tsx`: 선생님/학부모 모드 전환 관련 로직입니다.
- `utils.ts`: UI 공통 유틸입니다.

### `frontend/src/routes/`

- `index.tsx`: 첫 진입 화면입니다.
- `teacher.tsx`: 선생님 화면 레이아웃입니다.
- `teacher.index.tsx`: 선생님 대시보드입니다.
- `teacher.students.index.tsx`: 학생 목록 화면입니다.
- `teacher.students.$studentId.tsx`: 학생별 상세 화면입니다.
- `teacher.lesson-report.tsx`: 수업 메모를 입력하고 Lesson Report Agent를 호출하는 화면입니다.
- `teacher.payments.tsx`: 결제 상태와 결제 안내 Agent를 다루는 화면입니다.
- `teacher.messages.tsx`: `message_queue`에 쌓인 메시지를 확인하고 전송 상태를 바꾸는 화면입니다.
- `teacher.schedule.tsx`: 일정표 화면입니다. 요청 일정에서 `AI 일정 검토`를 누르면 Schedule Coordination Agent를 호출하고, 결과를 Supabase 일정/메시지 큐에 반영합니다.
- `parent.tsx`: 학부모 화면 레이아웃입니다.
- `parent.index.tsx`: 학부모 대시보드입니다.
- `parent.reports.tsx`: 학부모가 수업 리포트를 확인하는 화면입니다.
- `parent.schedule.tsx`: 학부모가 일정 변경을 요청하는 화면입니다.

### `frontend/src/components/`

- `AppLayout.tsx`: 선생님/학부모 공통 레이아웃입니다.
- `Badge.tsx`: 상태 라벨과 메시지 타입 라벨을 표시합니다. `schedule_coordination`은 “일정 조정”으로 표시됩니다.
- `Section.tsx`: 로딩, 빈 상태, 에러 상태 등 공통 섹션 컴포넌트입니다.
- `ui/`: shadcn/Radix 기반 UI 컴포넌트 모음입니다.

## Supabase 파일 역할

- `supabase/schema.sql`: DB 테이블과 인덱스를 생성합니다.
- `supabase/seed.sql`: 데모 시연용 데이터를 삽입합니다.
- `supabase/demo_access.sql`: 데모용 anon/authenticated 권한을 부여합니다.
- `supabase/verify.sql`: seed 데이터가 제대로 들어갔는지 확인하는 SQL입니다.
- `supabase/migrate_message_status.sql`: 기존 DB에서 `message_queue.status`를 `message_status`로 맞추고, `schedule_coordination` 메시지 타입을 허용하도록 보정합니다.

주요 테이블:

- `tutors`: 과외 선생님 정보
- `students`: 학생과 학부모 정보
- `lesson_reports`: 생성된 수업 리포트
- `payments`: 결제 상태와 다음 수업 정보
- `message_queue`: 학부모에게 발송 예정인 메시지
- `schedules`: 선생님 가능 시간, 학부모 요청 시간, 일정 상태

## Data와 Docs

- `data/tutorboard_seed.json`: Python/프론트/DB가 같은 데모 데이터를 기준으로 볼 수 있게 만든 JSON seed 파일입니다.
- `docs/supabase_handoff.md`: Supabase 연동을 팀원에게 넘길 때 필요한 설명 문서입니다.
- `docs/tutorboard_planning_document.md`: 프로젝트 기획 문서입니다.

## 실행 방법

### 1. Python Agent만 실행

Solar API 없이 로컬 mock 로직으로 전체 파이프라인을 확인합니다.

```powershell
python demo.py
```

Solar API를 사용하려면 `.env` 파일을 만든 뒤 실행합니다.

```powershell
Copy-Item .env.example .env
```

`.env` 예시:

```env
SOLAR_API_KEY=your_solar_api_key_here
SOLAR_MODEL=solar-pro3
SOLAR_BASE_URL=https://api.upstage.ai/v1/chat/completions
```

실행:

```powershell
python demo.py --solar
```

### 2. Python Agent API 서버 실행

프론트엔드와 연결하려면 먼저 Python API 서버를 실행합니다.

Solar 없이 로컬 Agent로 실행:

```powershell
python agent_api.py
```

Solar API로 실행:

```powershell
python agent_api.py --solar
```

정상 실행되면 아래처럼 표시됩니다.

```text
Agent API running on http://127.0.0.1:8000 (solar)
```

헬스체크:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
```

### 3. Frontend 실행

새 터미널을 열고 실행합니다.

```powershell
cd frontend
npm install
npm run dev
```

프론트엔드가 Python Agent API를 보게 하려면 `frontend/.env.local`에 아래 값을 둡니다.

```env
VITE_AGENT_API_URL=http://127.0.0.1:8000
VITE_AGENT_USE_MOCK=false
```

Agent API 없이 프론트만 보고 싶으면 mock 모드로 바꿀 수 있습니다.

```env
VITE_AGENT_USE_MOCK=true
```

### 4. Supabase 세팅

Supabase SQL Editor에서 아래 순서로 실행합니다.

```text
supabase/schema.sql
supabase/seed.sql
supabase/demo_access.sql
```

이미 기존 DB가 있고 `message_queue.status` 컬럼을 쓰던 상태라면 아래 마이그레이션도 실행합니다.

```text
supabase/migrate_message_status.sql
```

데이터 확인:

```text
supabase/verify.sql
```

## 웹에서 Agent가 연결되는 방식

### 수업 리포트 생성

```text
teacher.lesson-report.tsx
  → frontend/src/lib/agent.ts generate_lesson_report()
  → POST /lesson_report
  → Lesson Report Agent
  → lesson_reports 저장
  → message_queue 저장
```

### 결제 안내 생성

```text
teacher.payments.tsx
  → frontend/src/lib/agent.ts generate_payment_reminder()
  → POST /payment_reminder
  → Payment Reminder Agent
  → should_send가 true이면 message_queue 저장
```

### 일정 조정 생성

```text
parent.schedule.tsx
  → 학부모가 requested 일정 생성
  ↓
teacher.schedule.tsx
  → 선생님이 AI 일정 검토 클릭
  → frontend/src/lib/agent.ts coordinate_schedule()
  → POST /schedule_coordination
  → Schedule Coordination Agent
  → schedules.status를 approved 또는 rejected로 업데이트
  → message_queue에 schedule_coordination 메시지 저장
```

### 메시지 큐 확인

```text
teacher.messages.tsx
  → message_queue 조회
  → pending 메시지 확인
  → sent 상태로 변경 가능
```

## 테스트와 빌드

Python Agent 테스트:

```powershell
python tests.py
```

Frontend production build:

```powershell
cd frontend
npm run build
```

## 데모 계정과 mock 데이터

현재 시연용 데이터는 다음 파일들에 들어 있습니다.

- `data/tutorboard_seed.json`
- `supabase/seed.sql`
- `frontend/src/lib/seed.ts`
- `frontend/src/lib/supabase.ts`

대표 데모 데이터:

- 선생님: 데모 선생님
- 학생: 김서윤
- 과목: 고등 수학/수학
- 결제 상태: `unpaid`
- 결제 예정일: `2026-05-24`
- 다음 수업: `2026-05-24 19:00`

## GitHub에 올릴 때 주의할 파일

실제 API 키가 들어 있는 파일은 올리지 않는 것이 좋습니다.

- `.env`
- `frontend/.env.local`

공유용 예시는 아래 파일만 올립니다.

- `.env.example`
- `frontend/.env.example`

## 추천 커밋 메시지

이번 변경사항에는 아래 메시지가 잘 맞습니다.

```text
feat: add schedule coordination agent and document project flow
```
