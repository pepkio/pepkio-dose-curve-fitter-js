import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PepkioClient } from "../src/client.js";
import { PepkioAPIError } from "../src/types.js";

const MOCK_MANIFEST = {
  schema_version: "1.0",
  tool_id: "dose-curve-fitter",
  title: "Dose-Response Curve Fitter",
  execution_mode: "sync",
  examples: [
    {
      name: "hts_batch_absolute",
      description: "Three-compound HTS panel",
      input: {
        model: "auto",
        ic50_mode: "absolute",
        weighting: "none",
        compounds: [
          {
            compound_id: "Drug-A",
            points: [
              { concentration_nM: 0.1, response: 6 },
              { concentration_nM: 1, response: 8 },
              { concentration_nM: 10, response: 15 },
              { concentration_nM: 100, response: 45 },
            ],
          },
        ],
      },
    },
  ],
};

const MOCK_RUN_RESULT = {
  run_id: "run-123",
  status: "completed",
  result: {
    has_blocking_errors: false,
    errors: [],
    warnings: [],
    compounds: [
      {
        compound_id: "Drug-A",
        metrics: { ic50_nM: 500 },
        qc_grade: "green",
      },
    ],
  },
  error: null,
  result_url: "https://tools.pepkio.com/api/tools/v1/runs/run-123",
  permalink: "https://tools.pepkio.com/r/run-123",
};

describe("PepkioClient", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("getManifest() fetches and returns tool_id", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify(MOCK_MANIFEST),
    });

    const client = new PepkioClient({ apiKey: "test-key" });
    const manifest = await client.getManifest();

    expect(manifest.tool_id).toBe("dose-curve-fitter");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://tools.pepkio.com/api/tools/v1/tools/dose-curve-fitter/manifest",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("getExampleInput returns compounds from manifest example", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify(MOCK_MANIFEST),
    });

    const client = new PepkioClient({ apiKey: "test-key" });
    const input = await client.getExampleInput("hts_batch_absolute");

    expect(input.compounds).toHaveLength(1);
    expect(input.compounds?.[0].compound_id).toBe("Drug-A");
  });

  it("getExampleInput throws for unknown example", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify(MOCK_MANIFEST),
    });

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(client.getExampleInput("missing")).rejects.toThrow(
      'Example "missing" not found',
    );
  });

  it("run() sends correct URL, headers, and body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify(MOCK_RUN_RESULT),
    });

    const client = new PepkioClient({ apiKey: "secret-key" });
    const input = {
      model: "four_pl" as const,
      ic50_mode: "absolute" as const,
      weighting: "none" as const,
      compounds: [
        {
          compound_id: "Test",
          points: [
            { concentration_nM: 10, response: 20 },
            { concentration_nM: 100, response: 50 },
            { concentration_nM: 1000, response: 80 },
            { concentration_nM: 10000, response: 95 },
          ],
        },
      ],
    };

    const result = await client.run(input, { label: "unit-test" });

    expect(result.status).toBe("completed");
    expect(result.result?.compounds).toHaveLength(1);

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(
      "https://tools.pepkio.com/api/tools/v1/tools/dose-curve-fitter/run",
    );
    expect(init?.method).toBe("POST");
    expect(init?.headers?.Authorization).toBe("Bearer secret-key");

    const body = JSON.parse(init?.body as string);
    expect(body.input.compounds[0].compound_id).toBe("Test");
    expect(body.options.label).toBe("unit-test");
  });

  it("run() throws PepkioAPIError without API key", async () => {
    const client = new PepkioClient({ apiKey: "" });
    await expect(
      client.run({
        model: "four_pl",
        ic50_mode: "absolute",
        weighting: "none",
        compounds: [
          {
            compound_id: "Test",
            points: [
              { concentration_nM: 10, response: 20 },
              { concentration_nM: 100, response: 50 },
              { concentration_nM: 1000, response: 80 },
              { concentration_nM: 10000, response: 95 },
            ],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(PepkioAPIError);
  });

  it("throws PepkioAPIError on HTTP 401", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => JSON.stringify({ error: "Invalid API key" }),
    });

    const client = new PepkioClient({ apiKey: "bad-key" });
    await expect(
      client.run({
        model: "four_pl",
        ic50_mode: "absolute",
        weighting: "none",
        compounds: [
          {
            compound_id: "Test",
            points: [
              { concentration_nM: 10, response: 20 },
              { concentration_nM: 100, response: 50 },
              { concentration_nM: 1000, response: 80 },
              { concentration_nM: 10000, response: 95 },
            ],
          },
        ],
      }),
    ).rejects.toMatchObject({ status: 401, message: "Invalid API key" });
  });

  it("throws when response body error is set", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () =>
        JSON.stringify({
          run_id: "run-err",
          status: "failed",
          error: "Validation failed",
          result: null,
        }),
    });

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(
      client.run({
        model: "four_pl",
        ic50_mode: "absolute",
        weighting: "none",
        compounds: [
          {
            compound_id: "Test",
            points: [
              { concentration_nM: 10, response: 20 },
              { concentration_nM: 100, response: 50 },
              { concentration_nM: 1000, response: 80 },
              { concentration_nM: 10000, response: 95 },
            ],
          },
        ],
      }),
    ).rejects.toMatchObject({ message: "Validation failed", runId: "run-err" });
  });

  it("waitForRun() polls until completed", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/manifest")) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () => JSON.stringify(MOCK_MANIFEST),
        };
      }
      callCount += 1;
      const status = callCount < 2 ? "running" : "completed";
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            ...MOCK_RUN_RESULT,
            status,
          }),
      };
    });

    const client = new PepkioClient({ apiKey: "test-key" });
    const result = await client.waitForRun("run-123", {
      intervalMs: 10,
      timeoutMs: 5000,
    });

    expect(result.status).toBe("completed");
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it("listExamples returns manifest examples", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify(MOCK_MANIFEST),
    });

    const client = new PepkioClient({ apiKey: "test-key" });
    await client.getManifest();
    const examples = client.listExamples();

    expect(examples).toEqual([
      { name: "hts_batch_absolute", description: "Three-compound HTS panel" },
    ]);
  });
});
