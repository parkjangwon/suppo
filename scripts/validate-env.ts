#!/usr/bin/env tsx
/**
 * Environment Variable Validation Script
 * 
 * This script validates that all required environment variables are set
 * before the application starts. Run this in CI/CD pipelines and at startup.
 */

import { config } from "dotenv";
import { join } from "path";

// Load environment variables from .env files
config({ path: join(process.cwd(), ".env") });
config({ path: join(process.cwd(), ".env.local") });

type EnvVar = {
  name: string;
  required: boolean;
  minLength?: number;
  pattern?: RegExp;
  description: string;
};

const requiredEnvVars: EnvVar[] = [
  {
    name: "DATABASE_URL",
    required: true,
    pattern: /^postgres(ql)?:\/\/.+/,
    description: "PostgreSQL connection URL",
  },
  {
    name: "AUTH_SECRET",
    required: true,
    minLength: 32,
    description: "NextAuth secret for session encryption (minimum 32 characters)",
  },
  {
    name: "TICKET_ACCESS_SECRET",
    required: true,
    minLength: 32,
    description: "Secret for ticket access token signing (minimum 32 characters)",
  },
  {
    name: "GIT_TOKEN_ENCRYPTION_KEY",
    required: true,
    minLength: 32,
    description: "AES-256 encryption key for Git tokens (exactly 32 bytes)",
  },
  {
    name: "AUTH_URL",
    required: true,
    pattern: /^https?:\/\/.+/,
    description: "Base URL for authentication callbacks",
  },
];

const optionalEnvVars: EnvVar[] = [
  {
    name: "INITIAL_ADMIN_EMAIL",
    required: false,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    description: "Email for initial admin account creation",
  },
  {
    name: "INITIAL_ADMIN_PASSWORD",
    required: false,
    minLength: 8,
    description: "Password for initial admin account (minimum 8 characters)",
  },
  {
    name: "AUTH_GOOGLE_ID",
    required: false,
    description: "Google OAuth Client ID",
  },
  {
    name: "AUTH_GOOGLE_SECRET",
    required: false,
    description: "Google OAuth Client Secret",
  },
  {
    name: "AUTH_GITHUB_ID",
    required: false,
    description: "GitHub OAuth Client ID",
  },
  {
    name: "AUTH_GITHUB_SECRET",
    required: false,
    description: "GitHub OAuth Client Secret",
  },
  {
    name: "AUTH_BOXYHQ_SAML_ID",
    required: false,
    description: "BoxyHQ SAML Client ID",
  },
  {
    name: "AUTH_BOXYHQ_SAML_SECRET",
    required: false,
    description: "BoxyHQ SAML Client Secret",
  },
  {
    name: "AUTH_BOXYHQ_SAML_ISSUER",
    required: false,
    description: "BoxyHQ SAML Issuer URL",
  },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateEnvVar(envVar: EnvVar): string | null {
  const value = process.env[envVar.name];

  if (envVar.required && !value) {
    return `Missing required environment variable: ${envVar.name}`;
  }

  if (!value) {
    return null;
  }

  if (envVar.minLength && value.length < envVar.minLength) {
    return `${envVar.name} must be at least ${envVar.minLength} characters (current: ${value.length})`;
  }

  if (envVar.pattern && !envVar.pattern.test(value)) {
    return `${envVar.name} does not match required pattern: ${envVar.pattern}`;
  }

  return null;
}

function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const envVar of requiredEnvVars) {
    const error = validateEnvVar(envVar);
    if (error) {
      errors.push(error);
    }
  }

  for (const envVar of optionalEnvVars) {
    const error = validateEnvVar(envVar);
    if (error) {
      warnings.push(error);
    }
  }

  // Additional validation: INITIAL_ADMIN variables should both be set or both unset
  const hasAdminEmail = Boolean(process.env.INITIAL_ADMIN_EMAIL);
  const hasAdminPassword = Boolean(process.env.INITIAL_ADMIN_PASSWORD);
  
  if (hasAdminEmail !== hasAdminPassword) {
    errors.push("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must both be set or both unset");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function printResults(result: ValidationResult): void {
  console.log("\n" + "=".repeat(60));
  console.log("Environment Variable Validation");
  console.log("=".repeat(60) + "\n");

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log("✅ All environment variables are valid!");
  } else {
    if (result.errors.length > 0) {
      console.log("❌ ERRORS:");
      for (const error of result.errors) {
        console.log(`   • ${error}`);
      }
      console.log("");
    }

    if (result.warnings.length > 0) {
      console.log("⚠️  WARNINGS:");
      for (const warning of result.warnings) {
        console.log(`   • ${warning}`);
      }
      console.log("");
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Result: ${result.valid ? "✅ PASSED" : "❌ FAILED"}`);
  console.log("=".repeat(60) + "\n");
}

function printHelp(): void {
  console.log("\nRequired Environment Variables:");
  console.log("-".repeat(60));
  for (const envVar of requiredEnvVars) {
    console.log(`${envVar.name}`);
    console.log(`  ${envVar.description}`);
    if (envVar.minLength) {
      console.log(`  Min length: ${envVar.minLength}`);
    }
    if (envVar.pattern) {
      console.log(`  Pattern: ${envVar.pattern}`);
    }
    console.log("");
  }

  console.log("\nOptional Environment Variables:");
  console.log("-".repeat(60));
  for (const envVar of optionalEnvVars) {
    console.log(`${envVar.name}`);
    console.log(`  ${envVar.description}`);
    if (envVar.minLength) {
      console.log(`  Min length: ${envVar.minLength}`);
    }
    if (envVar.pattern) {
      console.log(`  Pattern: ${envVar.pattern}`);
    }
    console.log("");
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const result = validateEnvironment();
  printResults(result);

  if (!result.valid) {
    process.exit(1);
  }
}

export { validateEnvironment, requiredEnvVars, optionalEnvVars };
export type { EnvVar, ValidationResult };
