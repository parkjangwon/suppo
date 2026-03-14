import { prisma } from "@/lib/db/client";
import { hash } from "bcryptjs";

async function seedAdmin() {
  const email = "admin@crinity.io";
  const password = "admin1234";
  const passwordHash = await hash(password, 10);

  const existingAdmin = await prisma.agent.findUnique({
    where: { email }
  });

  if (existingAdmin) {
    await prisma.agent.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash,
        isActive: true,
        role: "ADMIN"
      }
    });
    console.log(`Admin ${email} updated with new password`);
  } else {
    await prisma.agent.create({
      data: {
        email,
        name: "관리자",
        role: "ADMIN",
        authProvider: "CREDENTIALS",
        isActive: true,
        maxTickets: 50,
        passwordHash
      }
    });
    console.log(`Admin ${email} created successfully`);
  }
}

seedAdmin()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
