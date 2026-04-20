# Suppo Helpdesk Design System Spec

## Context

이 문서는 Suppo Helpdesk의 현재 UI를 감사한 뒤, 앞으로 제품 전반에 적용할 단일 디자인 시스템 규칙을 정의한다. 목표는 다음 네 가지다.

- 고객용 퍼블릭 플로우와 관리자 백오피스 사이의 시각적 분열 해소
- shadcn/ui 기반 프리미티브를 실제 소스 오브 트루스로 승격
- 브랜딩 커스터마이징을 허용하되 컴포넌트 품질은 일관되게 유지
- 이후 구현 작업이 바로 따라갈 수 있는 마이그레이션 우선순위 제시

## Audit Summary

현재 UI는 하나의 시스템이라기보다 세 가지 스타일이 공존한다.

1. 관리자 백오피스는 `src/components/ui/*` 프리미티브를 일부 잘 활용한다.
2. 퍼블릭 티켓 작성/조회 플로우는 raw HTML 폼 요소와 인라인 브랜딩 색상에 크게 의존한다.
3. 완료 화면과 일부 상세/댓글 화면은 별도 회색 계열 스타일을 사용해 또 다른 시각 규칙을 만든다.

정량 감사 결과:

- raw `<input>`: 18개
- `ui/input` import: 15개
- raw `<textarea>`: 5개
- `ui/textarea` import: 9개
- raw `<select>`: 7개
- `ui/select` import: 7개
- `slate-*` 사용: 73회
- `gray-*` 사용: 96회
- `blue-*` 사용: 72회
- `red-*` 사용: 43회
- `rounded-xl`: 20회
- `rounded-lg`: 37회
- `rounded-md`: 36회

핵심 문제:

- 시맨틱 토큰 대신 `gray`, `slate`, `blue`, `red` 유틸리티를 직접 사용해 상태 표현과 브랜드 표현이 섞여 있다.
- `src/components/ui/input.tsx`와 `src/components/ui/button.tsx`가 이미 존재하지만, 주요 퍼블릭 폼은 raw `<input>`, `<select>`, `<textarea>`, `<button>`를 사용한다.
- `--radius`는 6px 기준인데 실제 화면에서는 6px, 8px, 12px, 16px, full이 혼용된다.
- 포커스 상태가 `focus-visible:ring-ring` 기반과 `focus:ring-2` 기반으로 분리되어 있다.
- 퍼블릭 브랜딩은 인라인 `style={{ backgroundColor: branding.primaryColor }}` 패턴에 의존해 컴포넌트 변형과 접근성 검증이 어렵다.

## Canonical Design Direction

Suppo Helpdesk는 "실무형 운영 도구 + 친절한 고객 접점"이라는 이중 성격을 가진다. 따라서 기본 톤은 차분하고 데이터 지향적이어야 하고, 퍼블릭 화면에서도 과도하게 마케팅스러워지면 안 된다.

기본 방향:

- 뉴트럴한 표면 위에 브랜드 컬러를 액션과 강조에만 사용한다.
- 관리자와 고객 화면은 레이아웃 밀도는 달라도 동일한 토큰 체계를 공유한다.
- 모든 상호작용 요소는 shadcn/ui 프리미티브에서 출발하고, 제품 전용 규칙은 래퍼나 variant로 확장한다.
- 상태 색상은 브랜드 색상과 분리한다. 파랑은 "브랜드/기본 액션", 상태는 별도 success/warning/info/danger 체계로 관리한다.

## Core Tokens

### Color Tokens

현재 전역 토큰은 `src/app/globals.css`를 기준으로 유지하되, 역할을 더 명확히 정의한다.

| Token | Current Value | Hex | Canonical Role |
| --- | --- | --- | --- |
| `--background` | `0 0% 96%` | `#f5f5f5` | 앱 기본 배경 |
| `--foreground` | `240 10% 4%` | `#09090b` | 기본 본문 텍스트 |
| `--card` | `0 0% 100%` | `#ffffff` | 카드/패널 표면 |
| `--card-foreground` | `240 10% 4%` | `#09090b` | 카드 위 텍스트 |
| `--primary` | `221 83% 53%` | `#2463eb` | 기본 CTA, 링크, 활성 상태 |
| `--primary-foreground` | `0 0% 100%` | `#ffffff` | primary 위 텍스트 |
| `--secondary` | `240 5% 96%` | `#f4f4f5` | 약한 배경, 탭/필터 표면 |
| `--secondary-foreground` | `240 6% 10%` | `#18181b` | secondary 위 텍스트 |
| `--muted` | `240 5% 96%` | `#f4f4f5` | 보조 영역 배경 |
| `--muted-foreground` | `240 4% 46%` | `#71717a` | 보조 설명 텍스트 |
| `--accent` | `240 5% 96%` | `#f4f4f5` | hover/선택 보조 배경 |
| `--accent-foreground` | `240 6% 10%` | `#18181b` | accent 위 텍스트 |
| `--border` | `240 6% 90%` | `#e4e4e7` | 기본 경계선 |
| `--input` | `240 6% 90%` | `#e4e4e7` | 입력 요소 경계선 |
| `--destructive` | `0 84% 60%` | `#ef4343` | 파괴 동작, 오류 |
| `--ring` | `221 83% 53%` | `#2463eb` | 포커스 링 |

추가가 필요한 토큰:

- `--success`, `--success-foreground`
- `--warning`, `--warning-foreground`
- `--info`, `--info-foreground`
- `--brand-primary`, `--brand-secondary`

원칙:

- `primary`는 제품 기본 액션용으로 유지한다.
- 테넌트 브랜딩은 `brand-*` 토큰으로 주입하고, 컴포넌트는 직접 hex를 받지 않는다.
- 상태 뱃지와 상태 배경은 `success/warning/info/destructive`로 표현한다.

### Typography

- 기본 서체: `Pretendard`, `Noto Sans KR`, `Apple SD Gothic Neo`, `sans-serif`
- 헤드라인: `font-semibold` 또는 `font-bold`, `tracking-tight`
- 본문: `text-sm` 또는 `text-base`
- 설명/메타: `text-sm text-muted-foreground`
- 숫자/티켓번호: 필요 시 `font-mono`, 일반 본문에는 남용 금지

타이포 규칙:

- 페이지 제목은 `text-2xl` 또는 `text-3xl`
- 섹션 제목은 `text-lg` 또는 `text-xl`
- 카드 내부 주요 수치는 `text-3xl font-bold`
- 라벨은 항상 본문보다 한 단계 작거나 같고, 색상은 `foreground` 또는 `muted-foreground` 체계를 따른다

### Spacing

4px 기반 스케일을 표준으로 삼는다.

- 컴포넌트 내부 간격: `gap-2`, `gap-3`, `space-y-2`, `space-y-4`
- 카드 패딩: 기본 `p-6`, 밀도 높은 폼은 `p-4`, 주요 퍼블릭 패널은 `p-6 md:p-8`
- 페이지 수직 리듬: 주요 섹션 `py-12`, 큰 랜딩 히어로 `py-20` 이상

### Radius

현재 혼용을 정리해 다음 규칙으로 고정한다.

- 입력/버튼/탭/작은 패널: `rounded-md`
- 일반 카드/리스트 행/드롭다운: `rounded-lg`
- 주요 퍼블릭 패널/히어로 카드: `rounded-xl`
- 아바타/상태 점/원형 아이콘: `rounded-full`

금지:

- 같은 화면 안에서 근거 없이 `rounded-md`, `rounded-lg`, `rounded-xl`를 섞는 것
- raw utility로 임의 반경을 계속 추가하는 것

### Elevation

깊이는 절제된 하나의 체계로 간다.

- 기본 카드: `shadow-sm` 또는 거의 무그림자
- 오버레이/다이얼로그: `shadow-lg`
- hover lift는 퍼블릭 CTA나 선택 카드에만 제한적으로 사용
- 관리자 목록/테이블 행은 그림자 대신 경계선과 배경 변화로 상태를 표현

## Component Rules

### Buttons

소스 오브 트루스는 `src/components/ui/button.tsx`다.

- 모든 클릭 액션은 `Button` 사용을 기본값으로 한다.
- 퍼블릭 CTA가 브랜드 색을 써야 하면 raw `<button>` 대신 `Button` variant를 확장한다.
- 텍스트 링크는 실제 링크일 때만 `variant="link"`를 사용한다.
- hover 시 `translate-y`는 퍼블릭 주요 CTA와 선택 카드에만 허용하고, 관리자 백오피스 기본 버튼에는 적용하지 않는다.

### Inputs, Textareas, Selects

소스 오브 트루스는 `Input`, `Textarea`, `Select`다.

- 기능 컴포넌트에서 raw `<input>`, `<textarea>`, `<select>`를 직접 스타일링하지 않는다.
- `Label`과 에러 메시지 구조는 항상 같은 순서를 유지한다.
- 포커스 상태는 `ring-ring` 기반으로 통일한다.
- 퍼블릭 브랜딩이 필요해도 입력 필드 기본 구조는 동일하게 유지한다.

### Cards and Surfaces

- 정보 패널, 폼 래퍼, 요약 통계는 `Card` 또는 `Card`에서 파생된 래퍼를 사용한다.
- 퍼블릭 대형 패널은 `Card`에 `rounded-xl`, `p-8` 등 클래스 확장으로 해결하고, 별도 bespoke 패널을 만들지 않는다.
- `bg-white rounded-2xl shadow-sm border border-slate-200` 패턴은 공용 Surface 규칙으로 흡수한다.

### Badges and Status Chips

- 상태 표현은 `Badge` 기반으로 통일한다.
- `bg-blue-100 text-blue-800` 같은 ad hoc 조합을 개별 화면에 남기지 않는다.
- 티켓 상태와 우선순위는 공통 매핑 함수 또는 공통 variant 집합에서만 결정한다.

권장 상태 체계:

- `OPEN`/`IN_PROGRESS`: `info`
- `WAITING`: `warning`
- `RESOLVED`/`CLOSED`: `success` 또는 neutral
- `URGENT`: `destructive`

### Tables and Lists

- 데이터 밀도가 높은 관리자 화면은 `Table` 프리미티브를 우선 사용한다.
- hover 강조는 배경색 한 단계 변화까지만 허용한다.
- 행 클릭 가능 영역은 패딩, 텍스트 크기, 상태 뱃지를 공통화한다.

### Navigation and Shells

- `AdminShell`과 `PublicShell`은 밀도만 다르고 같은 표면 철학을 사용해야 한다.
- 현재 퍼블릭 셸의 `slate` 기반 네비게이션과 어드민 셸의 `card` 기반 네비게이션은 토큰 관점에서 수렴해야 한다.
- 브랜딩 로고 영역, 섹션 라벨, 사용자 아바타는 공통 surface token을 사용한다.

## shadcn/ui Adoption Rules

1. `src/components/ui/*`가 유일한 기본 프리미티브 레이어다.
2. 기능 컴포넌트는 프리미티브를 조합해야지, raw 태그를 재스타일링하지 않는다.
3. 브랜드/도메인 규칙이 필요하면 `src/components/ui/*`에 variant를 추가하거나 얇은 래퍼를 만든다.
4. 예외는 파일 입력, 이미지, 장문 prose 영역처럼 브라우저 기본 요소가 더 적합한 경우에 한한다.
5. 색상은 semantic token으로만 사용하고 `blue-600`, `gray-500` 같은 직접 색상 지정은 제거 대상으로 본다.

## File-Level Inconsistency Audit

### P0: 고객 핵심 여정

- `src/components/ticket/ticket-form.tsx`
  - raw input/select/textarea/button 사용
  - 인라인 브랜딩 색상 사용
  - `rounded-xl`과 bespoke focus 처리 사용
- `src/components/ticket/ticket-lookup-form.tsx`
  - raw input/button 사용
  - 경고/오류 패턴이 shadcn 상태 체계와 분리
- `src/app/(public)/ticket/submitted/page.tsx`
  - 별도 `gray`/`blue` 팔레트 사용
  - 퍼블릭 플로우 안에서도 다른 컴포넌트 문법 사용

### P1: 퍼블릭 상세 및 코멘트

- `src/components/ticket/public-ticket-detail.tsx`
  - 상태 chip과 첨부 링크 스타일이 별도 정의
- `src/components/ticket/comment-list.tsx`
  - 댓글 카드, 첨부 썸네일, empty state가 bespoke 스타일
- `src/components/ticket/attachment-upload.tsx`
  - 드롭존과 파일 아이템이 독자 스타일을 가짐

### P1: 관리자 목록/상태 표현

- `src/components/admin/ticket-list.tsx`
  - 테이블은 raw `<table>` 위에 status color map을 직접 얹음
- `src/components/admin/comment-section.tsx`
  - shadcn Card/Textarea를 쓰지만 댓글 배경과 첨부 링크는 `gray`/`blue`에 직접 묶임
- `src/components/admin/transfer-dialog.tsx`
  - 다크 슬레이트 전용 스타일이 다른 관리자 화면과 분리됨

### P2: 셸과 랜딩 계층

- `src/components/app/public-shell.tsx`
  - `slate` 중심의 퍼블릭 내비게이션
- `src/app/(public)/page.tsx`
  - CTA와 feature card가 bespoke 컴포넌트
- `src/components/app/admin-shell.tsx`
  - 상대적으로 시스템에 가깝지만, 퍼블릭과 공통 surface 규칙이 없음

## Migration Priorities

### Priority 0: Public Form Unification

목표: 고객이 가장 많이 접하는 문의 작성, 조회, 제출 완료 흐름을 단일 컴포넌트 문법으로 통합한다.

- `ticket-form`
- `ticket-lookup-form`
- `ticket/submitted/page`

완료 기준:

- raw input/select/textarea/button 제거
- `Button`, `Input`, `Textarea`, `Select`, `Card` 조합으로 재구성
- 브랜드 색상은 토큰 또는 variant로만 주입

### Priority 1: Status Semantics and Shared Feedback Patterns

목표: 티켓 상태, 우선순위, 에러, 성공, 비어 있음 상태를 어디서 보든 같은 문법으로 보이게 만든다.

- 공통 badge/status mapping 정의
- 공통 alert/message surface 정의
- empty state와 attachment item 스타일 통합

### Priority 2: Surface and Shell Consolidation

목표: 퍼블릭/어드민이 같은 제품처럼 느껴지도록 surface, panel, header 규칙을 통일한다.

- PublicShell / AdminShell 표면 규칙 정렬
- 랜딩 hero와 주요 카드에 공통 surface grammar 적용
- hover/lift 규칙 축소

### Priority 3: Palette Cleanup

목표: direct color utility를 semantic token 사용으로 교체한다.

- `gray-*`, `slate-*`, `blue-*`, `red-*` 직접 사용 축소
- 상태색과 브랜드색 분리
- 토큰 부재 항목은 globals에 추가

## Acceptance Criteria

- 퍼블릭 핵심 여정에서 shadcn/ui 프리미티브 미사용 raw 폼 요소가 사라진다.
- 상태/우선순위 표현이 한 곳의 매핑 규칙으로 수렴한다.
- 브랜딩 커스터마이징이 인라인 스타일 대신 semantic token/variant 기반으로 적용된다.
- 새 화면 추가 시 `src/components/ui/*` 조합만으로 80% 이상 구성 가능하다.

## Recommended Next Implementation Slice

가장 먼저 구현할 묶음은 다음이다.

1. public form primitives 정리
2. status badge variant 확장
3. surface/card wrapper 정리
4. 퍼블릭 제출 완료 페이지를 공통 surface 규칙으로 재작성

이 순서를 따르면 고객이 바로 체감하는 불일치를 가장 빠르게 줄이면서, 이후 관리자 화면 정리에도 재사용 가능한 기반을 만들 수 있다.
