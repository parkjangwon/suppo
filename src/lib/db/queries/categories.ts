import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/client";

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
}

export async function getCategoryById(categoryId: string) {
  return prisma.category.findUnique({
    where: { id: categoryId }
  });
}

export async function createCategory(data: Prisma.CategoryCreateInput) {
  return prisma.category.create({ data });
}
