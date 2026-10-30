// SPDX-License-Identifier: MIT
export type RunStatus = "queued" | "running" | "completed" | "failed" | (string & {});

export interface RunOptions {
  idempotency_key?: string;
  label?: string;
}

export interface RunResult<T = DoseCurveFitterResult> {
  run_id: string;
  status: RunStatus;
  result?: T;
  error?: string | null;
  result_url?: string;
  permalink?: string;
}

export interface ManifestExample {
  name: string;
  description?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface ToolManifest {
  schema_version: string;
  tool_id: string;
  title: string;
  description?: string;
  execution_mode?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  examples?: ManifestExample[];
  input_schema?: Record<string, unknown>;
}

export interface ExampleMeta {
  name: string;
  description?: string;
}

/** Tool result shape from manifest output.properties */
export interface DoseCurveFitterResult {
  has_blocking_errors: boolean;
  errors: string[];
  warnings: string[];
  compounds: DoseCurveCompoundResult[];
  detected_unit?: string;
  audit_log?: string[];
}

export interface DoseCurveCompoundResult {
  compound_id: string;
  metrics?: {
    ic50_nM?: number;
    ec50_nM?: number;
    pic50?: number;
    [key: string]: unknown;
  };
  qc_grade?: "green" | "amber" | "red" | string;
  [key: string]: unknown;
}

export class PepkioAPIError extends Error {
  readonly status: number;
  readonly body?: unknown;
  readonly runId?: string;

  constructor(message: string, opts: { status: number; body?: unknown; runId?: string }) {
    super(message);
    this.name = "PepkioAPIError";
    this.status = opts.status;
    this.body = opts.body;
    this.runId = opts.runId;
  }
}
