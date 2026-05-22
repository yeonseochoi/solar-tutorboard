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

- `payment_status`: `paid`, `unpaid`, `pending`
- `urgency`: `low`, `normal`, `high`
- `message_status`: `pending`, `sent`, `failed`



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

