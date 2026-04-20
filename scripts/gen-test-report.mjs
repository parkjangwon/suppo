import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../docs/test-report-ai-insight-panels-2026-03-22.xlsx');

const wb = new ExcelJS.Workbook();
wb.creator = 'Claude Code';
wb.created = new Date('2026-03-22');

// ─── 색상 팔레트 ──────────────────────────────────────────────────────────────
const PASS_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E8449' } };
const FAIL_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0392B' } };
const WARN_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AC0D' } };
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
const ALT_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F3F7' } };

const WHITE_FONT  = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
const DARK_FONT   = { color: { argb: 'FF1A1A2E' }, size: 10 };
const BADGE_FONT  = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };

function setHeaderRow(sheet, rowIndex, values) {
  const row = sheet.getRow(rowIndex);
  values.forEach((v, i) => {
    const cell = row.getCell(i + 1);
    cell.value = v;
    cell.fill = HEADER_FILL;
    cell.font = WHITE_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF3D3D5C' } },
      bottom: { style: 'thin', color: { argb: 'FF3D3D5C' } },
      left: { style: 'thin', color: { argb: 'FF3D3D5C' } },
      right: { style: 'thin', color: { argb: 'FF3D3D5C' } },
    };
  });
  row.height = 32;
  row.commit();
}

function statusCell(cell, status) {
  if (status === 'PASS') {
    cell.value = '✅ PASS';
    cell.fill = PASS_FILL;
  } else if (status === 'FAIL') {
    cell.value = '❌ FAIL';
    cell.fill = FAIL_FILL;
  } else {
    cell.value = '⚠️ WARN';
    cell.fill = WARN_FILL;
  }
  cell.font = BADGE_FONT;
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
}

function addBorder(cell) {
  cell.border = {
    top: { style: 'hair', color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
    left: { style: 'hair', color: { argb: 'FFCCCCCC' } },
    right: { style: 'hair', color: { argb: 'FFCCCCCC' } },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 시트 1: 개요 (Summary)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const sh = wb.addWorksheet('개요');
  sh.columns = [
    { key: 'a', width: 28 },
    { key: 'b', width: 55 },
  ];

  // 제목
  sh.mergeCells('A1:B1');
  const title = sh.getCell('A1');
  title.value = 'AI 인사이트 패널 — Docker 멀티컨테이너 통합 테스트 결과';
  title.fill = HEADER_FILL;
  title.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 14 };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  sh.getRow(1).height = 40;

  const meta = [
    ['테스트 일자', '2026-03-22'],
    ['환경', 'Docker 멀티컨테이너 (nginx + admin + public + sqld)'],
    ['도메인', 'admin.suppo.io / helpdesk.suppo.io (로컬 /etc/hosts)'],
    ['DB', 'LibSQL (sqld HTTP:8889) via Prisma LibSQL Adapter'],
    ['테스트 계정', 'admin@suppo.io / admin1234'],
    ['AI 백엔드', 'Ollama (미설정) — 에러 처리 UI 검증'],
    ['빌드', 'Docker image 재빌드 후 docker compose up -d'],
    ['', ''],
    ['── 결과 요약 ──', ''],
    ['전체 TC', '16'],
    ['PASS', '13'],
    ['WARN (기존 이슈)', '2'],
    ['FAIL', '1 → 수정 완료'],
    ['', ''],
    ['── 발견 및 수정된 버그 ──', ''],
    ['BUG-01', 'Nginx server_name이 company.com으로 잘못 설정 (suppo.io로 수정)'],
    ['BUG-02', '.env.production PUBLIC_URL/ADMIN_URL 도메인 오류 (suppo.io로 수정)'],
    ['BUG-03', 'Dockerfile runner 스테이지에 .prisma 클라이언트 누락 — module not found'],
    ['BUG-04', 'PrismaLibSql 생성자에 Client 인스턴스 전달 → URL_INVALID 오류'],
    ['BUG-05', 'NextAuth UntrustedHost — nginx 리버스 프록시 환경에서 로그인 루프'],
    ['BUG-06', 'ensureDefaultAdminSeed() 프로덕션 early-return → 관리자 계정 미생성'],
    ['BUG-07', 'getCategoryFrequency() 응답 객체를 배열로 전달 → t.slice is not a function'],
  ];

  meta.forEach(([k, v], i) => {
    const row = sh.getRow(i + 2);
    const cellA = row.getCell(1);
    const cellB = row.getCell(2);
    cellA.value = k;
    cellB.value = v;
    if (k.startsWith('──')) {
      cellA.font = { bold: true, size: 11, color: { argb: 'FF1A1A2E' } };
      sh.mergeCells(`A${i + 2}:B${i + 2}`);
      cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E9F0' } };
    } else {
      cellA.font = { bold: true, size: 10 };
      cellB.font = DARK_FONT;
    }
    cellA.alignment = { vertical: 'middle', wrapText: true };
    cellB.alignment = { vertical: 'middle', wrapText: true };
    row.height = 18;
    [cellA, cellB].forEach(addBorder);
    row.commit();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 시트 2: 버그 목록
// ═══════════════════════════════════════════════════════════════════════════════
{
  const sh = wb.addWorksheet('버그 목록');
  sh.columns = [
    { key: 'id',     width: 10 },
    { key: 'area',   width: 22 },
    { key: 'sym',    width: 38 },
    { key: 'cause',  width: 50 },
    { key: 'fix',    width: 50 },
    { key: 'status', width: 14 },
  ];
  setHeaderRow(sh, 1, ['ID', '영역', '증상', '근본 원인', '수정 내용', '상태']);

  const bugs = [
    ['BUG-01', 'nginx.conf',         'admin.suppo.io 접속 불가',                      'server_name이 helpdesk/admin.company.com으로 잘못 설정',                    'nginx.conf server_name을 suppo.io로 수정', 'PASS'],
    ['BUG-02', '.env.production',    'PUBLIC_URL / ADMIN_URL 도메인 오류',               '.env.production에 company.com URL이 잔류',                                  '.env.production URL을 suppo.io로 수정', 'PASS'],
    ['BUG-03', 'Dockerfile',         "Cannot find module '.prisma/client/default'",       'prod-deps 스테이지는 --prod 플래그로 설치 → prisma CLI 없어 generate 미실행', 'runner 스테이지에 builder에서 .prisma 디렉터리 COPY 추가', 'PASS'],
    ['BUG-04', 'src/lib/db/client.ts', 'URL_INVALID: The URL undefined — 매 요청마다',  'PrismaLibSql 생성자에 createClient() 결과(Client 인스턴스) 전달; #url private',  'new PrismaLibSql({ url, authToken }) — 설정 객체 직접 전달', 'PASS'],
    ['BUG-05', 'src/auth.ts',        'UntrustedHost → /admin/login ↔ /admin/dashboard 리다이렉트 루프', 'NextAuth v5가 nginx 리버스 프록시 Host 헤더를 신뢰하지 않음', "NextAuth({ ..., trustHost: true }) 추가", 'PASS'],
    ['BUG-06', 'src/auth.ts',        'CredentialsSignin — 관리자 계정 로그인 불가',     'ensureDefaultAdminSeed()에 NODE_ENV=production 조기 반환 → 계정 미생성',       'production guard 제거, INITIAL_ADMIN_EMAIL/PASSWORD 환경변수 사용', 'PASS'],
    ['BUG-07', 'analytics/route.ts', "TypeError: t.slice is not a function (분석 페이지 충돌)", 'getCategoryFrequency()가 { categories, totalTickets } 객체 반환; 컴포넌트는 배열 기대', 'API 응답에서 categoryFrequency.categories(배열)만 전달', 'PASS'],
  ];

  bugs.forEach(([id, area, sym, cause, fix, status], i) => {
    const row = sh.getRow(i + 2);
    [id, area, sym, cause, fix].forEach((v, j) => {
      const cell = row.getCell(j + 1);
      cell.value = v;
      cell.font = DARK_FONT;
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.fill = i % 2 === 1 ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      addBorder(cell);
    });
    statusCell(row.getCell(6), status);
    addBorder(row.getCell(6));
    row.height = 52;
    row.commit();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 시트 3: 테스트 케이스 (TC)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const sh = wb.addWorksheet('테스트 케이스');
  sh.columns = [
    { key: 'id',      width: 10 },
    { key: 'cat',     width: 20 },
    { key: 'name',    width: 32 },
    { key: 'steps',   width: 55 },
    { key: 'expect',  width: 38 },
    { key: 'actual',  width: 42 },
    { key: 'status',  width: 12 },
    { key: 'note',    width: 36 },
  ];
  setHeaderRow(sh, 1, ['TC-ID', '카테고리', '테스트명', '테스트 절차', '기대 결과', '실제 결과', '상태', '비고']);

  const tcs = [
    // ── 인프라 ──
    ['TC-01', '인프라', 'Docker 스택 기동',
      '1. docker compose --env-file .env.production up -d\n2. 컨테이너 상태 확인',
      '모든 컨테이너 healthy',
      'nginx/public/admin/sqld/migrate 모두 running',
      'PASS', ''],
    ['TC-02', '인프라', 'DB 마이그레이션',
      '1. migrate 컨테이너 로그 확인\n2. prisma migrate deploy 완료 여부',
      '마이그레이션 성공적으로 완료',
      '모든 migration 적용 완료',
      'PASS', ''],
    ['TC-03', '인프라', 'Prisma 클라이언트 로딩',
      '1. admin 컨테이너 로그 확인\n2. Module not found 오류 없는지 검증',
      '.prisma/client 정상 로딩',
      "BUG-03 수정 후 'Cannot find module' 오류 제거됨",
      'PASS', 'Dockerfile COPY .prisma 추가'],
    ['TC-04', '인프라', 'LibSQL 어댑터 연결',
      '1. admin 앱에서 API 호출\n2. URL_INVALID 오류 없는지 확인',
      'sqld 정상 연결, DB 쿼리 성공',
      'BUG-04 수정 후 URL_INVALID 오류 제거됨',
      'PASS', 'PrismaLibSql({url,authToken}) 설정 객체 전달'],

    // ── 인증 ──
    ['TC-05', '인증', '관리자 로그인',
      '1. http://admin.suppo.io/admin/login 접속\n2. admin@suppo.io / admin1234 입력\n3. 로그인 버튼 클릭',
      '/admin/dashboard 리다이렉트',
      'BUG-05, BUG-06 수정 후 정상 로그인 성공',
      'PASS', 'trustHost + ensureDefaultAdminSeed() 수정'],
    ['TC-06', '인증', '세션 유지',
      '1. 로그인 후 각 페이지 이동\n2. 401 또는 로그인 리다이렉트 미발생 확인',
      '세션 유지되며 모든 페이지 정상 접근',
      '대시보드 → 분석 → 상담원 → 감사로그 모두 정상',
      'PASS', ''],

    // ── AI 패널 공통 ──
    ['TC-07', 'AI 패널', 'AI 패널 렌더링',
      '1. 각 페이지(대시보드/분석/상담원/감사로그) 접속\n2. AI 인사이트 패널 표시 확인',
      'AI 패널 카드 정상 렌더링',
      '4개 페이지 모두 AI 패널 카드 표시',
      'PASS', ''],
    ['TC-08', 'AI 패널', '"AI 분석" 버튼 표시',
      '1. 각 AI 패널에서 초기 상태 확인\n2. "AI 분석" 버튼 존재 여부',
      '"AI 분석" 버튼 및 설명 텍스트 표시',
      '4개 패널 모두 버튼 표시 확인',
      'PASS', ''],
    ['TC-09', 'AI 패널', 'AI 미설정 시 에러 처리',
      '1. Ollama 미설정 환경에서 "AI 분석" 클릭\n2. 에러 메시지 및 재시도 버튼 확인',
      '"AI 분석 결과를 가져올 수 없습니다." + 재시도 버튼',
      '4개 패널 모두 에러 메시지 + 재시도 버튼 표시',
      'PASS', 'Ollama 미설정 → 예상된 에러 처리 동작'],
    ['TC-10', 'AI 패널', '"재시도" 버튼 기능',
      '1. 에러 상태에서 "재시도" 버튼 클릭\n2. 재요청 발생 여부 확인',
      '재요청 후 동일한 에러 메시지 표시',
      '재시도 클릭 시 API 재호출 → 동일 에러 (Ollama 미설정)',
      'PASS', '재시도 로직 정상 동작'],

    // ── 개별 AI 패널 ──
    ['TC-11', '대시보드 AI', '오늘의 AI 브리핑 패널',
      '1. /admin/dashboard 접속\n2. "오늘의 AI 브리핑" 패널 확인\n3. AI 분석 버튼 클릭',
      '패널 렌더링 + 에러 처리 정상',
      '"오늘의 AI 브리핑" 패널 + 에러 상태 + 재시도 버튼',
      'PASS', ''],
    ['TC-12', '분석 AI', 'AI 데이터 해석 패널',
      '1. /admin/analytics 접속\n2. "AI 데이터 해석" 패널 확인\n3. AI 분석 버튼 클릭',
      '패널 렌더링 + 에러 처리 정상',
      '"AI 데이터 해석" 패널 + 에러 상태 + 재시도 버튼',
      'PASS', 'BUG-07 수정 후 페이지 충돌 해결'],
    ['TC-13', '상담원 AI', 'AI 성과 코칭 패널',
      '1. /admin/agents 접속\n2. "AI 성과 코칭" 패널 확인\n3. AI 분석 버튼 클릭',
      '패널 렌더링 + 에러 처리 정상',
      '"AI 성과 코칭" 패널 + 에러 상태 + 재시도 버튼',
      'PASS', ''],
    ['TC-14', '감사로그 AI', 'AI 이상 패턴 탐지 패널',
      '1. /admin/audit-logs 접속\n2. "AI 이상 패턴 탐지" 패널 확인\n3. AI 분석 버튼 클릭',
      '패널 렌더링 + 에러 처리 정상',
      '"AI 이상 패턴 탐지" 패널 + 에러 상태 + 재시도 버튼',
      'PASS', ''],

    // ── 기존 이슈 ──
    ['TC-15', '기존 이슈', 'Recharts SSR 하이드레이션 경고',
      '1. /admin/analytics 또는 /admin/audit-logs 접속\n2. 브라우저 콘솔 확인',
      '경고 없음',
      'React error #418 + width(-1) height(-1) 경고 발생',
      'WARN', '기존 Recharts SSR 이슈 — AI 패널 변경과 무관'],
    ['TC-16', '기존 이슈', 'Cross-Origin-Opener-Policy 헤더 경고',
      '1. 모든 admin 페이지에서 콘솔 확인',
      'COOP 경고 없음',
      '모든 페이지에서 COOP 경고 발생',
      'WARN', '브라우저 보안 경고 — 기능에 영향 없음, nginx 헤더 추가로 해결 가능'],
  ];

  tcs.forEach(([id, cat, name, steps, expect, actual, status, note], i) => {
    const row = sh.getRow(i + 2);
    const isAlt = i % 2 === 1;
    const bgFill = isAlt ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

    [id, cat, name, steps, expect, actual].forEach((v, j) => {
      const cell = row.getCell(j + 1);
      cell.value = v;
      cell.font = DARK_FONT;
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.fill = bgFill;
      addBorder(cell);
    });
    statusCell(row.getCell(7), status);
    addBorder(row.getCell(7));
    const noteCell = row.getCell(8);
    noteCell.value = note;
    noteCell.font = { size: 9, color: { argb: 'FF666666' }, italic: true };
    noteCell.alignment = { vertical: 'top', wrapText: true };
    noteCell.fill = bgFill;
    addBorder(noteCell);

    row.height = 68;
    row.commit();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 시트 4: 수정 내역 (변경된 파일)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const sh = wb.addWorksheet('수정 내역');
  sh.columns = [
    { key: 'file',    width: 48 },
    { key: 'change',  width: 60 },
    { key: 'bug',     width: 12 },
    { key: 'commit',  width: 10 },
  ];
  setHeaderRow(sh, 1, ['파일', '변경 내용', '관련 버그', '커밋']);

  const changes = [
    ['nginx.conf',
     'server_name helpdesk.company.com → helpdesk.suppo.io\nserver_name admin.company.com → admin.suppo.io',
     'BUG-01', '✓'],
    ['.env.production',
     'PUBLIC_URL=http://helpdesk.suppo.io\nADMIN_URL=http://admin.suppo.io',
     'BUG-02', '✓'],
    ['Dockerfile (runner 스테이지)',
     'COPY --from=builder .../node_modules/.prisma ./node_modules/.pnpm/.../node_modules/.prisma 추가',
     'BUG-03', '✓'],
    ['src/lib/db/client.ts',
     "import { createClient } 제거\nnew PrismaLibSql(libsql) → new PrismaLibSql({ url, authToken })",
     'BUG-04', '✓'],
    ['src/auth.ts (1/2)',
     "NextAuth({ ..., trustHost: true }) 추가",
     'BUG-05', '✓'],
    ['src/auth.ts (2/2)',
     'ensureDefaultAdminSeed()에서 프로덕션 guard 제거\nINITIAL_ADMIN_EMAIL/PASSWORD 환경변수 우선 사용',
     'BUG-06', '✓'],
    ['src/app/api/admin/analytics/overview/route.ts',
     "categoryFrequency → categoryFrequency.categories (배열 반환)",
     'BUG-07', '✓'],
  ];

  changes.forEach(([file, change, bug, commit], i) => {
    const row = sh.getRow(i + 2);
    const isAlt = i % 2 === 1;
    const bgFill = isAlt ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    [file, change, bug, commit].forEach((v, j) => {
      const cell = row.getCell(j + 1);
      cell.value = v;
      cell.font = j === 0 ? { bold: true, size: 10, color: { argb: 'FF1A1A2E' } } : DARK_FONT;
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.fill = bgFill;
      addBorder(cell);
    });
    row.height = 48;
    row.commit();
  });
}

await wb.xlsx.writeFile(outPath);
console.log('✅ Excel 테스트 리포트 생성:', outPath);
