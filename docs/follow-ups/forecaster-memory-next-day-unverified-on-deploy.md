# 배포 주소에서 forecaster-chat-memory의 다음 날 흐름(AC7, AC8)을 아직 확인하지 않음

**Symptom**: `docs/specs/forecaster-chat-memory/`의 AC7(로그인 사용자에게 지난 예보가 있으면 예보관이 그 날짜와 등급으로 먼저 묻기)과 AC8(답한 내용이 다음 예보 카드에 "지난 기억" 한 줄로 나오기)은 배포 주소 https://side-project-nine-pi.vercel.app 에서 확인되지 않았다. 나머지 AC1–AC6, AC9는 배포 주소에서 확인했다.

**Observed evidence**: 2026-11-19 배포(`f45f2ed`)에서 시험 계정 `forecast-test-1@example.com`으로 가입해 부산·목요일 회의 예보와 대화 1회를 저장했다. 이 계정에는 오늘 날짜 예보만 있어 "지난 예보"가 없으므로 AC7 질문이 나올 조건이 아니다. 구현 세션은 로컬(http://localhost:3100)에서 AC7, AC8을 확인했다고 보고했다.

**Suspected cause**: 결함이 아니라 확인 조건(하루 전 날짜의 예보)이 아직 없다. Spec은 실제로 하루를 기다리지 않고 Supabase 대시보드에서 저장된 예보 날짜를 하루 전으로 바꿔 확인해도 된다고 정해 두었다.

**What was tried**: 사용자가 이번에는 날짜 변경 확인을 뒤로 미루기로 했다. 대시보드 날짜 변경은 하지 않았다.

**Proposed next step**: Supabase 대시보드 Table Editor의 `forecasts`에서 `forecast-test-1@example.com` 계정의 2026-11-19 예보 날짜를 2026-11-18로 바꾸거나, 실제로 다음 날 같은 계정으로 로그인한다. 그다음 배포 주소에서 예보를 받아 예보관 첫 질문(AC7) → 답하기 → 다시 날짜를 넘겨 예보를 받아 "지난 기억" 줄(AC8)을 확인한다. 같은 날 다시 예보를 받으면 질문이 반복되지 않는지도 본다. 시험 계정 비밀번호는 저장소에 없으니 사용자에게 받거나 새 시험 계정을 만든다.
