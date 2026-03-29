import { prisma } from "@crinity/db";
import type { Macro, CreateMacroInput, UpdateMacroInput } from "./types";

export async function listMacros(agentId: string, isAdmin: boolean): Promise<Macro[]> {
  const macros = await prisma.macro.findMany({
    where: {
      OR: [
        { isPersonal: false },
        { createdById: agentId },
      ],
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });

  return macros.map((m) => ({
    id: m.id,
    title: m.title,
    shortcut: m.shortcut,
    content: m.content,
    variables: (m.variables as string[]) || [],
    category: m.category,
    isPersonal: m.isPersonal,
    createdById: m.createdById,
    createdByName: m.createdBy.name,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));
}

export async function getMacroByShortcut(
  shortcut: string,
  agentId: string
): Promise<Macro | null> {
  const macro = await prisma.macro.findFirst({
    where: {
      shortcut,
      OR: [
        { isPersonal: false },
        { createdById: agentId },
      ],
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });

  if (!macro) return null;

  return {
    id: macro.id,
    title: macro.title,
    shortcut: macro.shortcut,
    content: macro.content,
    variables: (macro.variables as string[]) || [],
    category: macro.category,
    isPersonal: macro.isPersonal,
    createdById: macro.createdById,
    createdByName: macro.createdBy.name,
    createdAt: macro.createdAt,
    updatedAt: macro.updatedAt,
  };
}

export async function createMacro(
  input: CreateMacroInput,
  agentId: string
): Promise<Macro> {
  const macro = await prisma.macro.create({
    data: {
      title: input.title,
      shortcut: input.shortcut,
      content: input.content,
      variables: input.variables || [],
      category: input.category,
      isPersonal: input.isPersonal,
      createdById: agentId,
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });

  return {
    id: macro.id,
    title: macro.title,
    shortcut: macro.shortcut,
    content: macro.content,
    variables: (macro.variables as string[]) || [],
    category: macro.category,
    isPersonal: macro.isPersonal,
    createdById: macro.createdById,
    createdByName: macro.createdBy.name,
    createdAt: macro.createdAt,
    updatedAt: macro.updatedAt,
  };
}

export async function updateMacro(
  id: string,
  input: UpdateMacroInput,
  agentId: string,
  isAdmin: boolean
): Promise<Macro | null> {
  const existing = await prisma.macro.findUnique({
    where: { id },
  });

  if (!existing) return null;
  if (existing.createdById !== agentId && !isAdmin) {
    throw new Error("Unauthorized");
  }

  const macro = await prisma.macro.update({
    where: { id },
    data: {
      title: input.title,
      shortcut: input.shortcut,
      content: input.content,
      variables: input.variables,
      category: input.category,
      isPersonal: input.isPersonal,
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });

  return {
    id: macro.id,
    title: macro.title,
    shortcut: macro.shortcut,
    content: macro.content,
    variables: (macro.variables as string[]) || [],
    category: macro.category,
    isPersonal: macro.isPersonal,
    createdById: macro.createdById,
    createdByName: macro.createdBy.name,
    createdAt: macro.createdAt,
    updatedAt: macro.updatedAt,
  };
}

export async function deleteMacro(
  id: string,
  agentId: string,
  isAdmin: boolean
): Promise<boolean> {
  const existing = await prisma.macro.findUnique({
    where: { id },
  });

  if (!existing) return false;
  if (existing.createdById !== agentId && !isAdmin) {
    throw new Error("Unauthorized");
  }

  await prisma.macro.delete({
    where: { id },
  });

  return true;
}

export function applyMacroVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}
