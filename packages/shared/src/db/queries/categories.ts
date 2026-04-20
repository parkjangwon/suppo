import type { Prisma } from "@prisma/client";

import { prisma } from "@suppo/db";
import { getCache, setCache } from "../../cache/redis";

const CATEGORIES_CACHE_KEY = "categories:all";
const CATEGORIES_CACHE_TTL = 3600;

export async function listCategories() {
  const cached = await getCache<ReturnType<typeof prisma.category.findMany>>(CATEGORIES_CACHE_KEY);
  if (cached) return cached;

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  await setCache(CATEGORIES_CACHE_KEY, categories, { ttl: CATEGORIES_CACHE_TTL });
  return categories;
}

export async function getCategoryById(categoryId: string) {
  return prisma.category.findUnique({
    where: { id: categoryId }
  });
}

export async function createCategory(data: Prisma.CategoryCreateInput) {
  return prisma.category.create({ data });
}
