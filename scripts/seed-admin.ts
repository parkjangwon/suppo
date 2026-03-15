import { PrismaClient, AgentRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedInitialAdmin() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("⚠️  INITIAL_ADMIN_EMAIL 또는 INITIAL_ADMIN_PASSWORD가 설정되지 않았습니다.");
    console.log("   .env 파일에 다음을 추가하세요:");
    console.log("   INITIAL_ADMIN_EMAIL=admin@crinity.io");
    console.log("   INITIAL_ADMIN_PASSWORD=your-secure-password");
    process.exit(1);
  }

  // 이미 존재하는지 확인
  const existingAdmin = await prisma.agent.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.agent.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash,
        isInitialPassword: true,
        passwordChangedAt: null,
        isActive: true,
        role: AgentRole.ADMIN,
      },
    });
    console.log(`✅ 관리자 계정 비밀번호가 재설정되었습니다: ${email}`);
    console.log(`   ※ 최초 로그인 시 비밀번호 변경이 필요합니다.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.agent.create({
    data: {
      name: "관리자",
      email,
      passwordHash,
      role: AgentRole.ADMIN,
      isActive: true,
      maxTickets: 50,
      isInitialPassword: true,
    },
  });

  console.log(`✅ 최초 관리자 계정이 생성되었습니다:`);
  console.log(`   이메일: ${admin.email}`);
  console.log(`   역할: ${admin.role}`);
  console.log(`   ※ 최초 로그인 시 비밀번호 변경이 필요합니다.`);
}

seedInitialAdmin()
  .catch((e) => {
    console.error("❌ 관리자 계정 생성 중 오류:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
