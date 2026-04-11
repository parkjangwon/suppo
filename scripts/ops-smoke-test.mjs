#!/usr/bin/env node

import { config } from "dotenv";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    envFile: undefined,
    allowHttp: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--env-file") {
      args.envFile = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--allow-http") {
      args.allowHttp = true;
    }
  }

  return args;
}

function loadEnvironment(envFile) {
  const defaultFiles = [".env", ".env.local", "docker/env/.env.production"];
  const files = envFile ? [envFile] : defaultFiles;
  for (const file of files) {
    config({ path: path.resolve(process.cwd(), file), override: false });
  }
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15000),
  });
  return response;
}

async function check(label, fn) {
  try {
    const detail = await fn();
    console.log(`PASS ${label}${detail ? ` - ${detail}` : ""}`);
    return true;
  } catch (error) {
    console.log(`FAIL ${label} - ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

const args = parseArgs(process.argv.slice(2));
loadEnvironment(args.envFile);

const publicUrl = required("PUBLIC_URL").replace(/\/$/, "");
const adminUrl = required("ADMIN_URL").replace(/\/$/, "");
const smokeApiKey = process.env.SMOKE_PUBLIC_API_KEY;
const smokeRequestTypeId = process.env.SMOKE_REQUEST_TYPE_ID;

const results = [];

results.push(
  await check("public homepage", async () => {
    const response = await request(publicUrl);
    if (!response.ok) {
      throw new Error(`expected 2xx, got ${response.status}`);
    }
    return response.status.toString();
  })
);

results.push(
  await check("admin login page", async () => {
    const response = await request(`${adminUrl}/admin/login`);
    if (!response.ok) {
      throw new Error(`expected 2xx, got ${response.status}`);
    }
    return response.status.toString();
  })
);

results.push(
  await check("admin health endpoint", async () => {
    const response = await request(`${adminUrl}/api/health`);
    if (!response.ok) {
      throw new Error(`expected 2xx, got ${response.status}`);
    }

    const body = await response.json();
    if (!["healthy", "degraded"].includes(body.status)) {
      throw new Error(`unexpected health status: ${body.status}`);
    }
    return body.status;
  })
);

results.push(
  await check("public locale cookie", async () => {
    const response = await request(`${publicUrl}/api/locale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ locale: "en" }),
    });

    if (!response.ok) {
      throw new Error(`expected 2xx, got ${response.status}`);
    }

    const cookie = response.headers.get("set-cookie") || "";
    if (!cookie.includes("crinity-locale=en")) {
      throw new Error("crinity-locale cookie not set");
    }

    return "crinity-locale=en";
  })
);

if (smokeApiKey && smokeRequestTypeId) {
  let createdTicketId = "";
  let createdTicketNumber = "";

  results.push(
    await check("public API ticket create", async () => {
      const response = await request(`${adminUrl}/api/public/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": smokeApiKey,
        },
        body: JSON.stringify({
          customerName: "Smoke Test",
          customerEmail: `smoke-${Date.now()}@example.com`,
          requestTypeId: smokeRequestTypeId,
          priority: "MEDIUM",
          subject: `[SMOKE] ${new Date().toISOString()}`,
          description: "Automated smoke test ticket creation",
        }),
      });

      if (!response.ok) {
        throw new Error(`expected 2xx, got ${response.status}`);
      }

      const body = await response.json();
      createdTicketId = body.id;
      createdTicketNumber = body.ticketNumber;
      if (!createdTicketId || !createdTicketNumber) {
        throw new Error("ticket id/number missing in response");
      }

      return createdTicketNumber;
    })
  );

  results.push(
    await check("public API ticket detail", async () => {
      if (!createdTicketId) {
        throw new Error("ticket create was skipped or failed");
      }

      const response = await request(`${adminUrl}/api/public/tickets/${createdTicketId}`, {
        headers: {
          "x-api-key": smokeApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`expected 2xx, got ${response.status}`);
      }

      const body = await response.json();
      if (body.ticketNumber !== createdTicketNumber) {
        throw new Error("ticket number mismatch");
      }

      return body.ticketNumber;
    })
  );
} else {
  console.log("SKIP public API create/detail - set SMOKE_PUBLIC_API_KEY and SMOKE_REQUEST_TYPE_ID");
}

if (results.every(Boolean)) {
  console.log("\nSmoke test completed successfully.");
  process.exit(0);
}

console.log("\nSmoke test failed.");
process.exit(1);
