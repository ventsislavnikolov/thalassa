import { neon } from "@neondatabase/serverless";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@neondatabase/serverless", () => ({ neon: vi.fn(() => vi.fn()) }));

beforeEach(() => {
  vi.resetModules();
  vi.mocked(neon).mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSql", () => {
  it("refuses to connect without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getSql } = await import("../db");

    expect(() => getSql()).toThrow("DATABASE_URL is not set");
    expect(neon).not.toHaveBeenCalled();
  });

  it("creates one client on first use and reuses it", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://user@db.example/thalassa");
    const { getSql } = await import("../db");

    const first = getSql();
    const second = getSql();

    expect(second).toBe(first);
    expect(neon).toHaveBeenCalledTimes(1);
    expect(neon).toHaveBeenCalledWith("postgres://user@db.example/thalassa");
  });
});
