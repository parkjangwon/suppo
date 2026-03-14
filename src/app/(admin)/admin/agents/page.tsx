import { AgentList } from "@/components/admin/agent-list";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-50">상담원 관리</h1>
        <p className="text-sm text-slate-400">DATABASE_URL이 설정되지 않아 목록을 불러올 수 없습니다.</p>
        <AgentList initialAgents={[]} categories={[]} />
      </div>
    );
  }

  const [agents, categories] = await Promise.all([
    prisma.agent.findMany({
      include: {
        categories: {
          include: {
            category: true
          }
        },
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: {
                  in: ["OPEN", "IN_PROGRESS", "WAITING"]
                }
              }
            }
          }
        }
      },
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }]
    }),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
  ]);

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-slate-50">상담원 관리</h1>
      <p className="text-sm text-slate-400">상담원 추가, 수정, 비활성화 및 권한 관리를 수행합니다.</p>
      <AgentList initialAgents={agents} categories={categories} />
    </div>
  );
}
