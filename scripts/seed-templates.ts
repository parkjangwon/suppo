// Response Template Seed Data
// 자주 사용되는 응답 템플릿 데이터

import { prisma } from "@/lib/db/client";

const templates = [
  // 일반 응대
  {
    title: "첫 인사 및 접수 확인",
    content: `안녕하세요, {{customerName}}님.

문의해 주셔서 감사합니다. 접수하신 내용 확인했습니다.

티켓 번호: {{ticketNumber}}
문의 제목: {{subject}}

빠른 시일 내에 답변 드리겠습니다. 추가로 필요하신 정보가 있으시면 말씀해 주세요.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "ticketNumber", description: "티켓 번호" },
      { name: "subject", description: "문의 제목" },
    ],
    isShared: true,
    isRecommended: true,
    sortOrder: 1,
  },
  {
    title: "추가 정보 요청",
    content: `안녕하세요, {{customerName}}님.

문의하신 내용을 더 정확하게 파악하기 위해 몇 가지 추가 정보가 필요합니다:

1. 문제 발생 일시:
2. 사용 중인 브라우저/OS:
3. 오류 메시지 (있는 경우):
4. 문제를 재현하는 방법:

위 정보를 제공해 주시면 빠르게 도움드리겠습니다.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
    ],
    isShared: true,
    isRecommended: true,
    sortOrder: 2,
  },
  {
    title: "해결 완료 안내",
    content: `안녕하세요, {{customerName}}님.

문의하신 사항이 해결되었습니다.

[해결 내용]
{{resolution}}

문제가 재발하거나 추가 도움이 필요하시면 언제든지 문의해 주세요.

좋은 하루 복 내세요!`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "resolution", description: "해결 내용" },
    ],
    isShared: true,
    isRecommended: true,
    sortOrder: 3,
  },
  {
    title: "작업 진행 중",
    content: `안녕하세요, {{customerName}}님.

현재 문의하신 사항을 확인하고 작업 중입니다.

예상 완료 시간: {{estimatedTime}}

진행 상황이 있으면 다시 연락드리겠습니다. 조금만 기다려 주세요.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "estimatedTime", description: "예상 완료 시간" },
    ],
    isShared: true,
    isRecommended: false,
    sortOrder: 4,
  },
  {
    title: "보류 및 추가 확인 필요",
    content: `안녕하세요, {{customerName}}님.

문의하신 사항은 남부 검토가 필요하여 확인 중입니다.

보류 사유: {{reason}}

확인이 완료되는 대로 다시 연락드리겠습니다. 양해 부탁드립니다.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "reason", description: "보류 사유" },
    ],
    isShared: true,
    isRecommended: false,
    sortOrder: 5,
  },
  
  // 기술 지원 관련
  {
    title: "재시작 안내",
    content: `안녕하세요, {{customerName}}님.

문의하신 문제는 일시적인 오류일 수 있습니다. 다음 단계를 시도해 주세요:

1. 브라우저/앱을 완전히 종료
2. 잠시 대기 (10초)
3. 다시 실행

문제가 지속되면 다시 문의해 주세요.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
    ],
    isShared: true,
    isRecommended: true,
    sortOrder: 10,
  },
  {
    title: "캐시 삭제 안내",
    content: `안녕하세요, {{customerName}}님.

문제 해결을 위해 브라우저 캐시 삭제를 권장드립니다:

[Chrome]
1. Ctrl + Shift + Delete (Windows) / Cmd + Shift + Delete (Mac)
2. "캐시된 이미지 및 파일" 선택
3. "데이터 삭제" 클릭

[Internet Explorer/Edge]
1. Ctrl + Shift + Delete
2. "임시 인터넷 파일" 선택
3. "삭제" 클릭

삭제 후 다시 시도해 주세요.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
    ],
    isShared: true,
    isRecommended: true,
    sortOrder: 11,
  },
  {
    title: "기능 사용법 안내",
    content: `안녕하세요, {{customerName}}님.

문의하신 기능 사용법을 안내드립니다:

[기능명: {{feature}}]

1. {{step1}}
2. {{step2}}
3. {{step3}}

자세한 내용은 사용자 매뉴얼을 참고해 주세요.
추가 질문이 있으시면 말씀해 주세요.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "feature", description: "기능명" },
      { name: "step1", description: "단계 1" },
      { name: "step2", description: "단계 2" },
      { name: "step3", description: "단계 3" },
    ],
    isShared: true,
    isRecommended: true,
    sortOrder: 12,
  },
  {
    title: "버그 리포트 확인",
    content: `안녕하세요, {{customerName}}님.

보고해 주신 버그를 확인했습니다.

[버그 내용]
{{bugDescription}}

개발팀에 전달하여 수정하도록 하겠습니다. 수정 완료 후 다시 안내드리겠습니다.

불편을 드려 죄송합니다.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "bugDescription", description: "버그 설명" },
    ],
    isShared: true,
    isRecommended: true,
    sortOrder: 13,
  },

  // 정책 및 안내
  {
    title: "환불 정책 안내",
    content: `안녕하세요, {{customerName}}님.

환불 정책에 대해 안내드립니다.

[환불 가능 기간]
- 구매 후 7일 이내 (미사용 시)
- 서비스 불가 시 즉시

[환불 불가 경우]
- 사용 이력이 있는 경우
- 고객 과실로 인한 문제

자세한 내용은 이용약관을 참고해 주세요.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
    ],
    isShared: true,
    isRecommended: true,
    sortOrder: 20,
  },
  {
    title: "서비스 이용약관 위반",
    content: `안녕하세요, {{customerName}}님.

확인 결과 고객님의 계정에서 이용약관 위반 사항이 발견되었습니다.

[위반 내용]
{{violation}}

[조치 사항]
{{action}}

자세한 내용은 약관을 확인해 주시기 바랍니다.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "violation", description: "위반 내용" },
      { name: "action", description: "조치 사항" },
    ],
    isShared: true,
    isRecommended: false,
    sortOrder: 21,
  },
  {
    title: "업그레이드 안내",
    content: `안녕하세요, {{customerName}}님.

현재 사용 중인 플랜에서 더 많은 기능이 필요하신 것 같습니다.

[권장 플랜: {{plan}}]
- 추가 기능: {{features}}
- 가격: {{price}}

업그레이드를 원하시면 답변으로 알려주세요.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "plan", description: "권장 플랜" },
      { name: "features", description: "추가 기능" },
      { name: "price", description: "가격" },
    ],
    isShared: true,
    isRecommended: false,
    sortOrder: 22,
  },

  // 만족도 조사
  {
    title: "만족도 조사 안내",
    content: `안녕하세요, {{customerName}}님.

최근 문의하신 내용이 해결되었는지 확인차 연락드립니다.

문제가 해결되었다면 아래 링크에서 만족도 조사에 참여해 주세요:
{{surveyLink}}

고객님의 소중한 의견은 서비스 개선에 큰 도움이 됩니다.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "surveyLink", description: "설문 링크" },
    ],
    isShared: true,
    isRecommended: true,
    sortOrder: 30,
  },
  {
    title: "긍정적 피드백 감사",
    content: `안녕하세요, {{customerName}}님.

좋은 피드백을 보내주셔서 감사합니다!

고객님의 격려는 저에게 큰 힘이 됩니다. 앞으로도 더 나은 서비스를 제공하기 위해 노력하겠습니다.

추가로 필요하신 사항이 있으시면 언제든지 문의해 주세요.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
    ],
    isShared: true,
    isRecommended: false,
    sortOrder: 31,
  },
  {
    title: "부정적 피드백 대응",
    content: `안녕하세요, {{customerName}}님.

보내주신 피드백을 진심으로 감사드립니다.

불편을 드린 점에 대해 사과드리며, 개선을 위해 다음과 같이 조치하겠습니다:

[개선 조치]
{{improvement}}

고객님의 소중한 의견이 서비스 발전에 큰 도움이 됩니다.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "improvement", description: "개선 조치" },
    ],
    isShared: true,
    isRecommended: false,
    sortOrder: 32,
  },

  // 장애/긴급
  {
    title: "서비스 장애 안내",
    content: `안녕하세요, {{customerName}}님.

현재 일부 서비스에서 장애가 발생하여 복구 작업 중입니다.

[장애 내용]
{{issue}}

[예상 복구 시간]
{{estimatedTime}}

불편을 드려 대단히 죄송합니다. 빠른 시일 내에 복구하도록 하겠습니다.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "issue", description: "장애 내용" },
      { name: "estimatedTime", description: "예상 복구 시간" },
    ],
    isShared: true,
    isRecommended: false,
    sortOrder: 40,
  },
  {
    title: "긴급 대응 완료",
    content: `안녕하세요, {{customerName}}님.

긴급으로 문의주신 사항을 조치 완료했습니다.

[조치 내용]
{{action}}

추가 문제가 발생하면 즉시 연락주세요.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "action", description: "조치 내용" },
    ],
    isShared: true,
    isRecommended: false,
    sortOrder: 41,
  },
  {
    title: "예정된 점검 안내",
    content: `안녕하세요, {{customerName}}님.

서비스 개선을 위해 정기 점검이 예정되어 있습니다.

[점검 일시]
{{date}} {{time}}

[점검 내용]
{{maintenance}}

[영향 범위]
{{impact}}

점검 시간 동안 일부 서비스 이용이 제한될 수 있습니다.
양해 부탁드립니다.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "date", description: "점검 일자" },
      { name: "time", description: "점검 시간" },
      { name: "maintenance", description: "점검 내용" },
      { name: "impact", description: "영향 범위" },
    ],
    isShared: true,
    isRecommended: false,
    sortOrder: 42,
  },

  // 계정 관련
  {
    title: "비밀번호 재설정 안내",
    content: `안녕하세요, {{customerName}}님.

비밀번호 재설정 요청을 받았습니다.

아래 링크를 클릭하여 비밀번호를 재설정해 주세요:
{{resetLink}}

링크는 24시간 동안 유효합니다.

본인이 요청하지 않았다면 이 메일을 무시해 주세요.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "resetLink", description: "재설정 링크" },
    ],
    isShared: true,
    isRecommended: true,
    sortOrder: 50,
  },
  {
    title: "계정 활성화 안내",
    content: `안녕하세요, {{customerName}}님.

계정 활성화를 위한 인증이 필요합니다.

아래 링크를 클릭하여 계정을 활성화해 주세요:
{{activationLink}}

링크는 48시간 동안 유효합니다.

문의사항이 있으시면 연락주세요.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
      { name: "activationLink", description: "활성화 링크" },
    ],
    isShared: true,
    isRecommended: true,
    sortOrder: 51,
  },
  {
    title: "로그인 문제 해결",
    content: `안녕하세요, {{customerName}}님.

로그인 문제 해결을 위해 다음을 확인해 주세요:

1. 아이디/비밀번호가 정확한지 확인
2. Caps Lock이 켜져 있지 않은지 확인
3. 브라우저 캐시 삭제 후 재시도
4. 다른 브라우저로 시도

계속 문제가 발생하면 계정 잠금 여부를 확인해 드리겠습니다.

감사합니다.`,
    variables: [
      { name: "customerName", description: "고객 이름" },
    ],
    isShared: true,
    isRecommended: true,
    sortOrder: 52,
  },
];

export async function seedResponseTemplates() {
  const admin = await prisma.agent.findFirst({
    where: { role: "ADMIN" },
  });

  if (!admin) {
    throw new Error("No admin user found");
  }

  for (const template of templates) {
    await prisma.responseTemplate.upsert({
      where: {
        id: `template-${template.sortOrder}`,
      },
      update: {},
      create: {
        id: `template-${template.sortOrder}`,
        title: template.title,
        content: template.content,
        variables: template.variables,
        createdById: admin.id,
        isShared: template.isShared,
        isRecommended: template.isRecommended,
        sortOrder: template.sortOrder,
      },
    });
  }

  console.log(`✅ Seeded ${templates.length} response templates`);
}

// CLI 실행용
if (require.main === module) {
  seedResponseTemplates()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
