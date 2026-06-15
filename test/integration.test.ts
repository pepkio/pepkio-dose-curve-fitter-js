import { describe, expect, it } from "vitest";
import { PepkioClient } from "../src/client.js";
import { DEFAULT_API_BASE_URL } from "../src/config.js";

const LOCAL_BASE_URL = "https://tools.localtest.me";
const PRODUCTION_BASE_URL = "https://tools.pepkio.com";

function envConfig(env: "local" | "production") {
  const baseUrl = process.env.PEPKIO_API_BASE_URL
    ? process.env.PEPKIO_API_BASE_URL.replace(/\/$/, "")
    : env === "local"
      ? LOCAL_BASE_URL
      : PRODUCTION_BASE_URL;

  const isLocal = baseUrl.includes("localtest.me");
  const apiKey = isLocal
    ? process.env.LOCAL_PEPKIO_API_KEY ?? process.env.PEPKIO_API_KEY
    : process.env.PEPKIO_API_KEY;

  return { baseUrl, apiKey, isLocal };
}

describe("integration: local", () => {
  const { baseUrl, apiKey } = envConfig("local");

  it.skipIf(!apiKey)("fetches manifest", async () => {
    const client = new PepkioClient({ baseUrl, apiKey });
    const manifest = await client.getManifest();

    expect(manifest.tool_id).toBe("dose-curve-fitter");
    const names = manifest.examples?.map((e) => e.name) ?? [];
    expect(names).toContain("hts_batch_absolute");
  });

  it.skipIf(!apiKey)("runs hts_batch_absolute example", async () => {
    const client = new PepkioClient({ baseUrl, apiKey });
    const input = await client.getExampleInput("hts_batch_absolute");
    const result = await client.run(input);

    expect(result.status).toBe("completed");
    expect(result.error).toBeFalsy();
    expect(result.result?.has_blocking_errors).toBe(false);
    expect(result.result?.compounds).toHaveLength(3);

    const drugA = result.result?.compounds.find(
      (c) => c.compound_id === "Drug-A",
    );
    expect(drugA).toBeDefined();
    expect(typeof drugA?.metrics?.ic50_nM).toBe("number");
    expect(["green", "amber", "red"]).toContain(drugA?.qc_grade);
  }, 60_000);
});

describe("integration: production", () => {
  const { baseUrl, apiKey } = envConfig("production");

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "fetches manifest",
    async () => {
      const client = new PepkioClient({
        baseUrl: PRODUCTION_BASE_URL,
        apiKey,
      });
      const manifest = await client.getManifest();

      expect(manifest.tool_id).toBe("dose-curve-fitter");
      const names = manifest.examples?.map((e) => e.name) ?? [];
      expect(names).toContain("hts_batch_absolute");
    },
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs hts_batch_absolute example",
    async () => {
      const client = new PepkioClient({
        baseUrl: PRODUCTION_BASE_URL,
        apiKey,
      });
      const input = await client.getExampleInput("hts_batch_absolute");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.result?.has_blocking_errors).toBe(false);
      expect(result.result?.compounds).toHaveLength(3);

      const drugA = result.result?.compounds.find(
        (c) => c.compound_id === "Drug-A",
      );
      expect(drugA).toBeDefined();
      expect(typeof drugA?.metrics?.ic50_nM).toBe("number");
      expect(["green", "amber", "red"]).toContain(drugA?.qc_grade);
    },
    60_000,
  );
});

describe("integration: config defaults", () => {
  it("uses production base URL by default", () => {
    expect(DEFAULT_API_BASE_URL).toBe("https://tools.pepkio.com");
  });
});
