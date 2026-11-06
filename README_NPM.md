# Pepkio Dose-Response Curve Fitter

Node.js ESM library and CLI that batch-fit 4PL or 5PL dose-response curves for every compound in a screen via the Pepkio Tools API and return per-compound IC50 metrics with QC grades.

# What It Does

Dose-response screens from plate readers or HTS exports need curve fitting, IC50 estimation, and quality checks before SAR tables or hit lists can be reported. Fitting compounds one at a time in desktop software does not scale for multi-compound panels.

This package calls the hosted Pepkio Dose-Response Curve Fitter over REST from Node.js (≥18), bundlers, or CI. Submit a `compounds` array with concentration–response points or `csv_text` with `compound_id`, `concentration`, and `response` columns; receive fitted results per compound, QC grades, warnings, and blocking-error flags.

Programmatic runs require a network connection and a Pepkio API key. Calculations are not bundled for offline use.

# Features

- Models: `four_pl`, `five_pl`, or `auto` (F-test selects best)
- IC50 modes: `relative` (Top=100, Bottom=0) or `absolute` (free Top/Bottom)
- Regression weighting: `none`, `1/y`, or `1/y2`
- Optional plateau `constraints` for absolute IC50 mode
- Input via `compounds` array or `csv_text`
- Output: per-compound metrics (including `ic50_nM`), `qc_grade` (`green`/`amber`/`red`), `has_blocking_errors`, `warnings`, `errors`, `detected_unit`, `audit_log`
- Manifest examples: `hts_batch_absolute`, `relative_ic50`, `flat_line_failure`, `few_points_blocking`
- Manifest helpers: `getManifest`, `listExamples`, `getExampleInput`
- `run`, `getRun`, and `waitForRun` for sync execution
- CLI: `pepkio-dose-curve-fitter manifest` and `run`
- Configurable via `PEPKIO_API_KEY` and `PEPKIO_API_BASE_URL`

# Installation

```bash
npm install pepkio-dose-curve-fitter
```

Requires Node.js 18 or newer.

# Configuration

Set an API key with **tools:run** scope before calling `run()`:

```bash
export PEPKIO_API_KEY="your-key"
```

Create a key at [Pepkio API keys](https://www.pepkio.com/account/api-keys).

Optional overrides:

| Variable | Purpose |
|----------|---------|
| `PEPKIO_API_KEY` | Production API key (required for `run`) |
| `LOCAL_PEPKIO_API_KEY` | Local dev key when `PEPKIO_API_BASE_URL` points to `tools.localtest.me` |
| `PEPKIO_API_BASE_URL` | API host (default `https://tools.pepkio.com`) |

# Quick Example

```typescript
import { PepkioClient } from "pepkio-dose-curve-fitter";

const client = new PepkioClient({ apiKey: process.env.PEPKIO_API_KEY });

const input = await client.getExampleInput("hts_batch_absolute");
const result = await client.run(input);

for (const compound of result.result?.compounds ?? []) {
  console.log(
    compound.compound_id,
    compound.metrics?.ic50_nM,
    compound.qc_grade,
  );
}
```

Manifest inspection does not require an API key.

# CLI

```bash
npx pepkio-dose-curve-fitter manifest --examples
npx pepkio-dose-curve-fitter run --example hts_batch_absolute
```

Pass `--base-url` and `--api-key` to override environment defaults.

# Typical Use Cases

- HTS and dose-response screens from a multi-compound CSV (`hts_batch_absolute`)
- Kinase and receptor inhibitor panels needing batch IC50 values
- Relative IC50 with Top=100 and Bottom=0 (`relative_ic50`)
- SAR tables needing pIC50 and per-compound fit quality
- Detecting unreliable fits when response is flat (`flat_line_failure`)
- Blocking validation when fewer than four points per compound (`few_points_blocking`)
- Automated reanalysis of plate-reader exports in scripts or CI

# Scientific Background

Each compound is fit with 4PL or 5PL dose-response models. In absolute mode, IC50 is at 50% of the fitted range; in relative mode, Top=100 and Bottom=0. When `model` is `auto`, an F-test selects between 4PL and 5PL. QC grades (`green`, `amber`, `red`) include plain-English reasons. Zero concentration is excluded from fitting.

# Web Application

For researchers who prefer a graphical interface, an interactive web version is available.

Web Application: https://www.pepkio.com/tools/dose-curve-fitter

The web interface adds CSV upload or paste, automatic 4PL vs 5PL selection, a summary table (IC50, Hill slope, R², pIC50, EC10, EC90, fit-quality flag), per-compound curve review with outlier exclusion, SVG or PDF figure export, CSV and methods PDF download, shareable links, and browser-local recent runs.

# Documentation and Resources

GitHub Repository: https://github.com/pepkio/pepkio-dose-curve-fitter-js

Web Application: https://www.pepkio.com/tools/dose-curve-fitter

# About Pepkio

Pepkio (https://www.pepkio.com/) develops software tools and bioinformatics solutions for life science researchers, including laboratory calculators and analysis services (https://www.pepkio.com/cro).

A semantic, AI-native version of this document in the K2F format is available at https://k2f.dev (https://k2f.dev/v/03b2a0ad3c50ea3da90bb0e6cf7c5bf1013465ec055a019a8ef07bfe90f1cf52)
