import { describe, expect, it } from "vitest";

import {
  getBootstrapExecutionPlan,
  isBootstrapDatabaseEmpty,
  normalizeAutoBootstrapMode,
  normalizeSeedProfile,
  type BootstrapSentinelCounts,
} from "../../packages/db/src/bootstrap-policy";

const emptyCounts: BootstrapSentinelCounts = {
  agents: 0,
  categories: 0,
  requestTypes: 0,
  businessCalendars: 0,
  branding: 0,
};

describe("bootstrap policy", () => {
  it("treats the database as empty only when all sentinel tables are empty", () => {
    expect(isBootstrapDatabaseEmpty(emptyCounts)).toBe(true);
    expect(
      isBootstrapDatabaseEmpty({
        ...emptyCounts,
        agents: 1,
      }),
    ).toBe(false);
  });

  it("defaults to safe production-friendly modes for unknown env values", () => {
    expect(normalizeAutoBootstrapMode(undefined)).toBe("if-empty");
    expect(normalizeAutoBootstrapMode("unexpected")).toBe("if-empty");
    expect(normalizeSeedProfile(undefined)).toBe("none");
    expect(normalizeSeedProfile("unexpected")).toBe("none");
  });

  it("runs bootstrap automatically on an empty database by default", () => {
    expect(
      getBootstrapExecutionPlan({
        counts: emptyCounts,
        autoBootstrap: "if-empty",
        seedProfile: "none",
      }),
    ).toEqual({
      databaseEmpty: true,
      runBootstrap: true,
      runDemoSeed: false,
    });
  });

  it("skips automatic bootstrap on non-empty databases", () => {
    expect(
      getBootstrapExecutionPlan({
        counts: {
          ...emptyCounts,
          categories: 5,
        },
        autoBootstrap: "if-empty",
        seedProfile: "none",
      }),
    ).toEqual({
      databaseEmpty: false,
      runBootstrap: false,
      runDemoSeed: false,
    });
  });

  it("lets explicit demo mode seed only empty databases", () => {
    expect(
      getBootstrapExecutionPlan({
        counts: emptyCounts,
        autoBootstrap: "never",
        seedProfile: "demo",
      }),
    ).toEqual({
      databaseEmpty: true,
      runBootstrap: false,
      runDemoSeed: true,
    });

    expect(
      getBootstrapExecutionPlan({
        counts: {
          ...emptyCounts,
          requestTypes: 1,
        },
        autoBootstrap: "if-empty",
        seedProfile: "demo",
      }),
    ).toEqual({
      databaseEmpty: false,
      runBootstrap: false,
      runDemoSeed: false,
    });
  });

  it("supports disabling automatic bootstrap entirely", () => {
    expect(
      getBootstrapExecutionPlan({
        counts: emptyCounts,
        autoBootstrap: "never",
        seedProfile: "none",
      }),
    ).toEqual({
      databaseEmpty: true,
      runBootstrap: false,
      runDemoSeed: false,
    });
  });
});
