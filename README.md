# 🌞 Solar Tutorboard

> **2026 제 3회 MixUp AI HACKATHON**  
> - **Track 1. [업스테이지] SOLAR PRO3를 활용한 Agent 개발**  
> - **Team 4**

Solar Tutorboard는 과외 선생님의 수업 메모, 결제 상태, 일정 요청을 AI Agent가 분석해 학부모용 리포트와 안내 메시지로 자동 생성하는 서비스입니다.  
선생님과 학부모가 수업 현황, 결제 알림, 일정 조정을 한 화면에서 관리할 수 있도록 돕는 **AI 기반 과외 운영 대시보드**입니다.

---

## ✨ 핵심 기능

- 📝 선생님 수업 메모를 학부모용 수업 리포트로 자동 변환
- 💳 결제 상태와 다음 수업 일정을 기반으로 결제 안내 메시지 생성
- 📅 학생/학부모의 일정 변경 요청을 AI Agent가 승인/거절 판단
- 📬 생성된 리포트, 결제 안내, 일정 안내를 `message_queue` 형태로 저장
- 🧑‍🏫 선생님용 대시보드와 👨‍👩‍👧 학생/학부모용 대시보드 제공
- 🤖 Solar Pro3 API와 로컬 mock Agent를 모두 지원

---

## 🧭 전체 구조

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

---

## 🔁 서비스 흐름

```text
선생님/학부모 웹 UI
  ↓
frontend/src/lib/agent.ts
  ↓ HTTP POST
agent_api.py
  ↓
ai_tutor_agents/*
  ↓
Solar Pro3 API 또는 로컬 mock Agent
  ↓
JSON 응답
  ↓
Supabase tables
  ↓
대시보드, 리포트, 메시지 큐 화면에 표시
```

모든 Agent는 아래 공통 JSON 형식으로 응답합니다.

```json
{
  "success": true,
  "agent_type": "",
  "result": {}
}
```

---

## 📐 공통 JSON 규칙

- 필드명은 `snake_case`만 사용합니다.
- 문자열 값이 없으면 `""`를 사용합니다.
- 배열 값이 없으면 `[]`를 사용합니다.
- `null`은 최소화합니다.
- 날짜는 `YYYY-MM-DD` 형식을 사용합니다.
- 날짜와 시간이 함께 필요하면 `YYYY-MM-DD HH:MM` 형식을 사용합니다.

### Enum 규칙

```text
payment_status: paid, unpaid
message_status: pending, sent
urgency: low, normal, high
schedule_status: available, requested, approved, rejected, cancelled
message_type: lesson_report, payment_reminder, schedule_coordination
```

---

## 🤖 Agent 구성

### 1. Tutor Profile Agent

파일: `ai_tutor_agents/tutor_profile_agent.py`

과외 선생님의 운영 스타일을 구조화하는 Agent입니다. 다른 Agent가 학부모용 문장을 만들 때 기준으로 삼을 수 있는 말투, 커뮤니케이션 규칙, 리포트 형식을 생성합니다.

```json
{
  "success": true,
  "agent_type": "tutor_profile",
  "result": {
    "tone": "정중하고 부담스럽지 않게",
    "communication_rules": [
      "학생을 부정적으로 단정하지 않는다",
      "문제점과 개선 계획을 함께 제시한다"
    ],
    "report_format": [
      "오늘의 진도",
      "취약 개념",
      "숙제 상태",
      "다음 수업 계획"
    ]
  }
}
```

### 2. Lesson Report Agent

파일: `ai_tutor_agents/lesson_report_agent.py`

선생님의 짧은 수업 메모를 학부모가 읽기 쉬운 수업 리포트로 변환합니다.

생성 항목:

- 현재 진도
- 취약 개념
- 숙제 상태
- 다음 수업 계획
- 학부모용 리포트 문장

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

결제 상태와 다음 수업 일정을 보고 학부모용 결제 안내 메시지를 생성합니다. 독촉이 아니라 “수업 준비 안내”처럼 정중하게 작성하는 것이 핵심입니다.

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

선생님이 등록한 가능 시간과 학생/학부모가 요청한 변경 시간을 비교해 일정 승인 또는 거절을 추천합니다. 결과와 함께 학부모에게 보낼 일정 조정 안내 메시지도 생성합니다.

판단 기준:

- 요청 시간이 가능 시간 목록에 있으면 `approved`
- 요청 시간이 가능 시간 목록에 없으면 `rejected`
- 거절 시 가능한 대체 시간을 안내

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

앞선 Agent 결과를 UI, DB, 메일 발송 모듈에 넘기기 쉬운 `message_queue` 형태로 정리합니다.

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

---

## 🗄️ DB 테이블

- `tutors`: 과외 선생님 정보
- `students`: 학생 및 학부모 정보
- `lesson_reports`: 생성된 수업 리포트
- `payments`: 결제 상태와 다음 수업 정보
- `message_queue`: 학부모에게 발송 예정인 메시지
- `schedules`: 선생님 가능 시간, 학부모 요청 시간, 일정 상태

---

## 🚀 실행 방법

### 1. Python Agent만 실행

Solar API 없이 로컬 mock 로직으로 실행합니다.

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

```powershell
python demo.py --solar
```

### 2. Python Agent API 서버 실행

프론트엔드와 연결하려면 Python API 서버를 먼저 켭니다.

```powershell
python agent_api.py --solar
```

Solar 없이 로컬 mock Agent로 실행하려면:

```powershell
python agent_api.py
```

정상 실행 예시:

```text
Agent API running on http://127.0.0.1:8000 (solar)
```

### 3. Frontend 실행

새 터미널에서 실행합니다.

```powershell
cd frontend
npm install
npm run dev
```

`frontend/.env.local` 예시:

```env
VITE_AGENT_API_URL=http://127.0.0.1:8000
VITE_AGENT_USE_MOCK=false
```

Agent API 없이 프론트 화면만 확인하려면:

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

기존 DB에 `message_queue.status` 또는 예전 `message_type` 제약조건이 남아 있다면 아래 파일도 실행합니다.

```text
supabase/migrate_message_status.sql
```

---

## 🔌 웹과 Agent 연결 방식

### 수업 리포트

```text
teacher.lesson-report.tsx
  → generate_lesson_report()
  → POST /lesson_report
  → Lesson Report Agent
  → lesson_reports 저장
  → message_queue 저장
```

### 결제 안내

```text
teacher.payments.tsx
  → generate_payment_reminder()
  → POST /payment_reminder
  → Payment Reminder Agent
  → message_queue 저장
```

### 일정 조정

```text
parent.schedule.tsx
  → 학부모가 일정 변경 요청
  → schedules.status = requested
  ↓
teacher.schedule.tsx
  → 선생님이 AI 일정 검토 클릭
  → coordinate_schedule()
  → POST /schedule_coordination
  → Schedule Coordination Agent
  → schedules.status = approved 또는 rejected
  → message_queue에 schedule_coordination 메시지 저장
```

---

## 🧪 테스트와 빌드

Python Agent 테스트:

```powershell
python tests.py
```

Frontend production build:

```powershell
cd frontend
npm run build
```

---

## 🧪 데모 데이터

시연용 데이터는 아래 파일들에 있습니다.

- `data/tutorboard_seed.json`
- `supabase/seed.sql`
- `frontend/src/lib/seed.ts`
- `frontend/src/lib/supabase.ts`

대표 데모 데이터:

- 선생님: 데모 선생님
- 학생: 김서윤
- 과목: 고등 수학
- 결제 상태: `unpaid`
- 결제 예정일: `2026-05-24`
- 다음 수업: `2026-05-24 19:00`

---

