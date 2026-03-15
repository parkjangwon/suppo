import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { renderTemplate, extractTemplateVariables } from "@/lib/templates/renderer";
import { Prisma } from "@prisma/client";

interface TemplateContext {
  ticket: {
    ticketNumber: string;
    subject: string;
    status: string;
    priority: string;
  };
  customer: {
    name: string;
    email: string;
  };
  category: {
    name: string;
  };
  agent: {
    name: string;
  };
}

function buildTemplateContext(
  ticket: Prisma.TicketGetPayload<{
    include: { customer: true; category: true; assignee: true };
  }>
): TemplateContext {
  return {
    ticket: {
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
    },
    customer: {
      name: ticket.customerName,
      email: ticket.customerEmail,
    },
    category: {
      name: ticket.category?.name || "미지정",
    },
    agent: {
      name: ticket.assignee?.name || "미할당",
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { templateId, ticketId } = body;

    if (!templateId || !ticketId) {
      return NextResponse.json(
        { error: "templateId와 ticketId는 필수입니다." },
        { status: 400 }
      );
    }

    const template = await prisma.responseTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        title: true,
        content: true,
        isShared: true,
        createdById: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const hasAccess = template.isShared || template.createdById === session.user.id;
    if (!hasAccess) {
      return NextResponse.json(
        { error: "이 템플릿을 사용할 권한이 없습니다." },
        { status: 403 }
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: true,
        category: true,
        assignee: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "티켓을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const context = buildTemplateContext(ticket);
    const usedVariables = extractTemplateVariables(template.content);
    const rendered = renderTemplate(template.content, context);

    const unresolvedVariables: string[] = [];
    const variableStatus = usedVariables.map((variable) => {
      const parts = variable.split(".");
      const [obj, prop] = parts;
      let value: string | undefined;

      switch (obj) {
        case "ticket":
          value = (context.ticket as Record<string, string>)[prop];
          break;
        case "customer":
          value = (context.customer as Record<string, string>)[prop];
          break;
        case "category":
          value = (context.category as Record<string, string>)[prop];
          break;
        case "agent":
          value = (context.agent as Record<string, string>)[prop];
          break;
      }

      const isResolved = value !== undefined && value !== null && value !== "";
      if (!isResolved) {
        unresolvedVariables.push(variable);
      }

      return {
        name: variable,
        value: isResolved ? value : undefined,
        isResolved,
      };
    });

    return NextResponse.json({
      isValid: unresolvedVariables.length === 0,
      template: {
        id: template.id,
        title: template.title,
      },
      variables: variableStatus,
      unresolvedVariables,
      renderedPreview: rendered,
      warnings: unresolvedVariables.map((v) => `${v} 변수가 누락되었습니다.`),
    });
  } catch (error) {
    console.error("Template validation error:", error);
    return NextResponse.json(
      { error: "템플릿 검증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
