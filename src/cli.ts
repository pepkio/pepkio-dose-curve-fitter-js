#!/usr/bin/env node
import { Command } from "commander";
import { PepkioClient } from "./client.js";
import { PepkioAPIError } from "./types.js";

const program = new Command();

program
  .name("pepkio-dose-curve-fitter")
  .description("CLI for the Pepkio Dose-Response Curve Fitter tool")
  .option("--base-url <url>", "API base URL (default: PEPKIO_API_BASE_URL or production)")
  .option("--api-key <key>", "API key (default: PEPKIO_API_KEY or LOCAL_PEPKIO_API_KEY)");

program
  .command("manifest")
  .description("Fetch and print the tool manifest")
  .option("--examples", "List example names and descriptions only")
  .action(async (_opts, cmd) => {
    const globalOpts = cmd.parent?.opts() ?? {};
    try {
      const client = new PepkioClient({
        baseUrl: globalOpts.baseUrl,
        apiKey: globalOpts.apiKey,
      });
      const manifest = await client.getManifest();
      if (_opts.examples) {
        const examples = client.listExamples(manifest);
        for (const ex of examples) {
          console.log(`${ex.name}\t${ex.description ?? ""}`);
        }
      } else {
        console.log(JSON.stringify(manifest, null, 2));
      }
    } catch (err) {
      printError(err);
    }
  });

program
  .command("run")
  .description("Run the tool with example input or custom JSON")
  .option("--example <name>", "Run a named manifest example")
  .option("--input-json <json>", "Run with custom input JSON")
  .option("--label <label>", "Optional run label")
  .action(async (opts, cmd) => {
    const globalOpts = cmd.parent?.opts() ?? {};
    const hasExample = Boolean(opts.example);
    const hasInputJson = Boolean(opts.inputJson);

    if (hasExample === hasInputJson) {
      console.error("Provide exactly one of --example or --input-json");
      process.exit(1);
    }

    try {
      const client = new PepkioClient({
        baseUrl: globalOpts.baseUrl,
        apiKey: globalOpts.apiKey,
      });

      let input;
      if (opts.example) {
        input = await client.getExampleInput(opts.example);
      } else {
        input = JSON.parse(opts.inputJson);
      }

      const result = await client.run(
        input,
        opts.label ? { label: opts.label } : undefined,
      );
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      printError(err);
    }
  });

function printError(err: unknown): void {
  if (err instanceof PepkioAPIError) {
    console.error(`Error (${err.status}): ${err.message}`);
  } else if (err instanceof Error) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error("Error:", err);
  }
  process.exit(1);
}

program.parse();
