import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./resolve-database-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

type PrismaClientOptions = NonNullable<ConstructorParameters<typeof PrismaClient>[0]>;
type PrismaAdapter = NonNullable<PrismaClientOptions["adapter"]>;
type LibsqlAdapterConfig = {
  url: string;
  authToken?: string;
};
type PrismaLibsqlAdapterCtor = new (config: LibsqlAdapterConfig) => PrismaAdapter;
type PrismaLibsqlModule = {
  PrismaLibSql?: PrismaLibsqlAdapterCtor;
  PrismaLibSQL?: PrismaLibsqlAdapterCtor;
};

function createPrismaClient(): PrismaClient {
  const url = resolveDatabaseUrl();
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  const dynamicRequire = eval("require") as NodeRequire;

  const prismaOptions: ConstructorParameters<typeof PrismaClient>[0] = {
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"]
  };

  const isLibsql = url.startsWith("http://") || url.startsWith("https://");
  if (isLibsql && !isBuildPhase) {
    const libsqlModule = dynamicRequire("@prisma/adapter-libsql") as PrismaLibsqlModule;
    const PrismaLibsql = libsqlModule.PrismaLibSql ?? libsqlModule.PrismaLibSQL;
    if (!PrismaLibsql) {
      throw new Error("Unsupported @prisma/adapter-libsql export shape");
    }
    prismaOptions.adapter = new PrismaLibsql({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN
    });
  } else {
    prismaOptions.datasources = {
      db: {
        url
      }
    };
  }

  return new PrismaClient(prismaOptions);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
