# Cycle 2: Real RBAC Expansion - 회의록

**회의 일시:** 2026-03-29  
**참석자:** CEO, CTO, PM, 백엔드 개발자, 프론트엔드 개발자, 마케터, 세일즈  
**회의 목적:** Role-Based Access Control (RBAC) 구체화 - ADMIN/TEAM_LEAD/AGENT/VIEWER 권한 실제 적용

---

## 1. Cycle 1 리뷰

### 완료된 항목
- ✅ Loading/Error states 추가
- ✅ OG tags 및 SEO 기초
- ✅ Email enqueue 에러 처리 개선
- ✅ Cycle 1 회의록 작성 및 커밋/푸시

### 개선 성과
- UX 기본 수준 확보 (로딩 상태)
- SEO 검색엔진 노출 가능
- 시스템 안정성 향상

---

## 2. Cycle 2 목표: RBAC Expansion

### 현재 상태
- Schema에는 ADMIN, TEAM_LEAD, AGENT, VIEWER 역할 정의됨
- 실제로는 ADMIN/AGENT만 구분되어 사용 중
- 권한 체계가 일관되지 않음

### 목표
각 역할별 실제 권한 부여 및 UI 적용

### 합의된 권한 매트릭스

| 기능 | ADMIN | TEAM_LEAD | AGENT | VIEWER |
|------|-------|-----------|-------|--------|
| **티켓 관리** |
| 모든 티켓 조회 | ✅ | ✅ | ✅ (할당된 것만) | ✅ (읽기만) |
| 티켓 할당/전달 | ✅ | ✅ | ✅ | ❌ |
| 티켓 삭제 | ✅ | ❌ | ❌ | ❌ |
| **상담원 관리** |
| 상담원 CRUD | ✅ | ✅ (팀내) | ❌ | ❌ |
| 권한 변경 | ✅ | ❌ | ❌ | ❌ |
| **지식베이스** |
| 문서 작성/수정 | ✅ | ✅ | ✅ | ❌ |
| 문서 삭제 | ✅ | ✅ | ❌ | ❌ |
| **설정** |
| 시스템 설정 | ✅ | ❌ | ❌ | ❌ |
| 브랜딩 설정 | ✅ | ❌ | ❌ | ❌ |
| **분석** |
| 전체 통계 | ✅ | ✅ (팀내) | ❌ | ✅ (읽기만) |

---

## 3. 개발 범위 합의

### 백엔드 (CTO/백엔드 주도)
- [ ] 권한 검사 유틸리티 함수 생성
- [ ] API route별 권한 체크 추가
- [ ] Middleware 권한 검사 강화

### 프론트엔드 (프론트엔드 주도)
- [ ] 역할별 네비게이션 메뉴 필터링
- [ ] 버튼/액션 권한 체크
- [ ] 접근 제한 페이지 (403)

### 테스트 (백엔드 주도)
- [ ] 권한 테스트 케이스 작성
- [ ] E2E 권한 흐름 테스트

---

## 4. 구현 계획

### Phase 1: 권한 유틸리티
```typescript
// packages/shared/src/auth/permissions.ts
export const Permissions = {
  TICKET: {
    READ: 'ticket:read',
    WRITE: 'ticket:write',
    DELETE: 'ticket:delete',
    ASSIGN: 'ticket:assign'
  },
  AGENT: {
    READ: 'agent:read',
    WRITE: 'agent:write',
    DELETE: 'agent:delete'
  }
};

export function hasPermission(role: Role, permission: string): boolean;
```

### Phase 2: API 보호
- Route handler wrapper에 권한 체크 추가
- Unauthorized 응답 표준화

### Phase 3: UI 적용
- Sidebar 메뉴 역할별 필터링
- 버튼 disabled/visible 조건 추가

---

## 5. 합의사항

모든 역할이 Cycle 2 범위에 동의함:
- [x] CEO
- [x] CTO
- [x] PM
- [x] 백엔드 개발자
- [x] 프론트엔드 개발자
- [x] 마케터
- [x] 세일즈

**다음 회의:** Cycle 2 개발 완료 후

---

## 6. 산출물

1. 권한 매트릭스 문서
2. 권한 체크 유틸리티 코드
3. 역할별 UI 적용
4. 테스트 케이스
5. 본 회의록
