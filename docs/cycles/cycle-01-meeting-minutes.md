# Cycle 1: Delivery Baseline and Quality Gates - 회의록

**회의 일시:** 2026-03-29  
**참석자:** CEO, CTO, PM, 백엔드 개발자, 프론트엔드 개발자, 마케터, 세일즈  
**회의 목적:** 현재 헬프데스크 시스템의 부족한 부분 도출 및 개선 방향 협의

---

## 1. 각 역할별 주요 발견사항

### CEO (비즈니스 관점)
**Top 5 Business Gaps:**
1. **Customer Portal Missing** - 30-40% 중시장 거래 차단
2. **Limited Collaboration** - @mentions, followers, ticket merge UI 없음
3. **No Analytics Dashboard** - 매니저가 팀 성과 모니터링 불가
4. **No Automation Engine** - 15명 이상 확장 불가
5. **Underutilized AI** - AI가 감성 분석에만 사용됨

**12개월 전략적 로드맵:**
- Q2: Customer Portal → Analytics Dashboard → Collaboration
- Q3: AI Response Suggestions → Basic Automation
- Q4: i18n → Regional Channels

### CTO (기술 관점)
**Top 5 Technical Risks:**
1. **CRITICAL - Edge Runtime Prisma**: middleware에서 Prisma 호출 시 실패
2. **HIGH - Incomplete S3 Storage**: 파일 업로드 미구현
3. **HIGH - Rate Limiting**: 메모리 기반으로 분산 환경 미지원
4. **MEDIUM - Assignment Logic**: categoryId 파라미터 무시됨
5. **MEDIUM - Hardcoded Credentials**: 소스코드에 기본 비밀번호 존재

**즉시 조치 필요:**
- Edge Runtime 수정 (프로덕션 장애 방지)
- S3 파일 업로드 구현
- Redis 기반 rate limiting 도입

### PM (제품 관점)
**Top 5 User Journey Pain Points:**
1. **Public Ticket Creation** - Save Draft / Progress Indicator 없음
2. **Ticket Lookup** - Signed cookie 접근 제어 UX 불편
3. **Admin Ticket Detail** - 정보 과잉, 시각적 계층 구조 부족
4. **Knowledge Base** - 검색 결과 피드백 부족
5. **No Customer Portal** - 고객이 모든 티켓을 한 곳에서 볼 수 없음

**우선순위 매트릭스:**
- **DO NOW**: Draft saving, Lookup feedback, Loading skeletons
- **STRATEGIC**: Customer Portal, Bulk Actions, Ticket Dependencies
- **QUICK WINS**: Breadcrumbs, Keyboard shortcuts

### 백엔드 개발자 (코드 품질)
**Critical Code Quality Issues:**
1. **Dead code** - pickAssignee의 unused categoryId 파라미터
2. **Duplicate code** - pick-assignee가 2곳에 존재
3. **N+1 queries** - Scheduled automation에서 모든 티켓 로드 후 JS로 필터링
4. **Sequential processing** - Email outbox 순차 처리
5. **Silent failures** - Email enqueue 에러 무시

**API Design Issues:**
- 일관성 없는 에러 응답 형식
- Public API에 cursor-based pagination 부재
- 인증 로직 중복

### 프론트엔드 개발자 (UI/UX)
**Critical Issues:**
1. **Missing loading.tsx/error.tsx** - Next.js App Router best practices 미적용
2. **Over-client components** - 93개 파일에 "use client" 과다 사용
3. **TypeScript any usage** - 30개 이상 any 타입
4. **Missing keyboard navigation** - 키보드 핸들러가 5개 파일에만 존재
5. **Missing accessibility** - role= 속성 0개 사용

**성능 최적화:**
- Dashboard 쿼리 캐싱 필요
- Client-side pagination → Server-side로 변경
- Component memoization 추가

### 마케터 (GTM 관점)
**핵심 발견:**
1. **No pricing, demo, or signup flow** - 고객이 self-serve로 평가/구매 불가
2. **Missing SEO fundamentals** - OG tags, sitemap, structured data 없음
3. **Generic homepage messaging** - "Suppo Helpdesk"만 표시
4. **Email templates are Korean-only** - 영어 변형 없음
5. **Knowledge base is empty** - 게시된 기사 없음

**즉시 조치:**
- OG tags 및 sitemap 추가
- Pricing page 생성 (placeholder라도)
- Demo request flow 구축

### 세일즈 (영업 관점)
**Top 5 Customer-Requested Features:**
1. SAML/SSO Integration
2. Multi-Tenant Branding
3. Knowledge Base + AI Suggestions
4. Ticket Access via Email
5. Automated Ticket Assignment

**주요 Objections:**
- "We need something more enterprise-scale"
- "What about SLA management?"
- "Can we integrate with our CRM?"
- "Is there a mobile app?"
- "What about reporting?"

---

## 2. 종합 우선순위 합의

### HIGH PRIORITY (Cycle 1-2에서 구현)

| 우선순위 | 개선사항 | 담당 역할 | 비즈니스 영향 |
|---------|---------|-----------|--------------|
| 1 | Customer Portal 기초 구현 | PM + 백엔드 + 프론트엔드 | 매출 차단 해결 |
| 2 | Edge Runtime Prisma 문제 수정 | CTO + 백엔드 | 프로덕션 안정성 |
| 3 | Loading/Error states 추가 | 프론트엔드 | UX 기본 수준 확보 |
| 4 | OG tags 및 SEO 기초 | 마케터 + 프론트엔드 | 유입 확보 |
| 5 | TypeScript any 타입 정리 | 프론트엔드 | 코드 품질 |
| 6 | Email enqueue 에러 처리 개선 | 백엔드 | 신뢰성 |

### MEDIUM PRIORITY (Cycle 3-5에서 구현)

- Analytics Dashboard 시각화
- Draft saving 기능
- S3 파일 업로드 완성
- Rate limiting Redis 전환
- Pricing/Demo 페이지

### LOWER PRIORITY (Cycle 6-10에서 구현)

- AI Response Suggestions
- Automation Engine
- Mobile App/PWA
- Advanced Analytics

---

## 3. Cycle 1 개발 범위 합의

**목표:** Delivery Baseline 수립 - 품질 게이트 및 기초 인프라 개선

**구현 항목:**

### 3.1 백엔드 개선 (CTO/백엔드 주도)
- [ ] Edge Runtime Prisma 문제 수정
- [ ] Email enqueue 에러 처리 개선 (silent failure 제거)
- [ ] pick-assignee 중복 코드 통합
- [ ] API 응답 형식 표준화

### 3.2 프론트엔드 개선 (프론트엔드 주도)
- [ ] Loading states (loading.tsx) 추가
- [ ] Error boundaries (error.tsx) 추가
- [ ] TypeScript any 타입 제거
- [ ] OG tags 및 메타데이터 추가

### 3.3 마케팅 자산 (마케터 주도)
- [ ] SEO 기초 (sitemap, robots.txt)
- [ ] Homepage 메시지 개선
- [ ] Pricing page placeholder

### 3.4 문서화 (PM 주도)
- [ ] Definition of Done 템플릿
- [ ] Test gate 체크리스트
- [ ] Cycle workflow template

---

## 4. 합의된 개발 접근법

### 4.1 TDD 방식
- 모든 기능 변경 전 실패하는 테스트 작성
- Red → Green → Refactor 순환
- 영향받는 단위 테스트 통과 확인

### 4.2 Atomic Commit 전략
```
test: add failing test for email error handling
feat: improve email enqueue error propagation  
fix: resolve Edge Runtime Prisma issue
refactor: consolidate pick-assignee implementations
docs: add Cycle 1 meeting minutes
```

### 4.3 품질 게이트
- [ ] 영향받는 단위 테스트 통과
- [ ] 빌드 오류 없음
- [ ] LSP diagnostics 깨끗함
- [ ] 수동 QA 완료

---

## 5. 다음 단계

**즉시 실행:**
1. Cycle 1 개발 브랜치 생성: `cycle-01-delivery-baseline`
2. 개발 작업 분배 및 병렬 실행
3. 테스트 및 검증
4. 회의록 커밋 및 푸시

**산출물:**
- 코드 개선사항 (PR)
- 본 회의록 문서
- Cycle 1 완료 리포트

---

## 6. 합의사항 서명

모든 역할이 본 회의록을 검토하고 Cycle 1 범위에 동의함:

- [x] CEO  
- [x] CTO  
- [x] PM  
- [x] 백엔드 개발자  
- [x] 프론트엔드 개발자  
- [x] 마케터  
- [x] 세일즈  

**다음 회의:** Cycle 1 개발 완료 후 리뷰 및 Cycle 2 계획
