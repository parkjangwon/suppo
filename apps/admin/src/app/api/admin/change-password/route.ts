import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hash, compare } from "bcryptjs";
import { prisma } from "@crinity/db";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요."),
  newPassword: z.string().min(8, "새 비밀번호는 최소 8자 이상이어야 합니다."),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증되지 않은 요청입니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = changePasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

    const agent = await prisma.agent.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        passwordHash: true,
        isInitialPassword: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!agent.passwordHash) {
      return NextResponse.json(
        { error: "비밀번호가 설정되지 않은 계정입니다." },
        { status: 400 }
      );
    }

    const isValidPassword = await compare(currentPassword, agent.passwordHash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "현재 비밀번호가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const newPasswordHash = await hash(newPassword, 10);

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        passwordHash: newPasswordHash,
        isInitialPassword: false,
        passwordChangedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "비밀번호가 성공적으로 변경되었습니다.",
    });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "비밀번호 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
