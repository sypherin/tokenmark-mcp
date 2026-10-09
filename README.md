# @altronis/tokenmark-mcp
[![M8ven Score](https://m8ven.ai/badge/mcp/sypherin-tokenmark-mcp-wurjy2?v=2f3ca516b976eef15b4df1eb2262188b)](https://m8ven.ai/mcp/sypherin-tokenmark-mcp-wurjy2?s=readme)

An [MCP](https://modelcontextprotocol.io) server that gives Claude (and other agents) real local-LLM benchmark data + hardware-aware model recommendations from [TokenMark](https://tokenmark.app).

Ask *"what should I run on a Strix Halo for coding?"* and the agent answers from **measured** configs (decode tok/s, quant, backend), each with a source link. It never invents numbers.

## Add to Claude Code

```sh
claude mcp add tokenmark -- npx -y @altronis/tokenmark-mcp
```

## Add to Cline

Cline CLI:

```sh
cline mcp add tokenmark --yes -- npx -y @altronis/tokenmark-mcp
```

Cline in VS Code: add the `tokenmark` entry from the JSON below to `cline_mcp_settings.json`. Step-by-step notes for agents are in [llms-install.md](https://github.com/sypherin/tokenmark-mcp/blob/main/llms-install.md).

## Add to any MCP client

Run the server over stdio:

```sh
npx -y @altronis/tokenmark-mcp
```

Or in a client config:

```json
{
  "mcpServers": {
    "tokenmark": {
      "command": "npx",
      "args": ["-y", "@altronis/tokenmark-mcp"]
    }
  }
}
```

## Tools

- **`tokenmark_recommend`**: `{ hardware, tasks?, prefer?, limit? }` → ranked model + best-config picks (5 by default, 10 max) with measured tok/s + why.
- **`tokenmark_configs`**: `{ model?, hardware?, limit? }` → tracked benchmark configs, fastest first (25 by default, 50 max; `matched` gives the full count), with the run mode (`speculative: true` for MTP/DFlash/draft-model runs).
- **`tokenmark_hardware`**: `{ platform? }` → the hardware catalogue (Strix Halo, Gorgon Halo, DGX Spark, Mac Max/Ultra). With a platform: chip specs with a source per value, the boxes that ship it, Singapore prices.
- **`tokenmark_search`**: `{ term }` → matching models/configs.
- **`tokenmark_submit`**: `{ repo, source?, note? }` → queues a GitHub/Hugging Face repo with benchmark numbers for human review.
- **`tokenmark_submission_status`**: `{ id }` → where a submission is.
- **`tokenmark_submit_result`**: `{ bench_output?, pick?, model?, quant?, hardware?, backend?, decode_tps?, prefill_tps?, ctx?, concurrency?, ..., dry_run? }` → sends a speed the user measured, for human review. Pass raw llama-bench or `vllm bench serve` output as `bench_output`, or the fields by hand; fields you pass win over what it read. Sending takes two calls: `dry_run: true` returns a one-line summary and a `confirm` code; show the user the summary, and once they agree, call again with the same fields and `confirm` set to that code. A send without the code, or with fields changed since the dry run, is refused.

### Sending measured speeds

`tokenmark_submit_result` needs a one-time sign-in on the same machine, in a terminal:

```sh
npx @altronis/tokenmark-cli login
```

Approve the short code at https://tokenmark.app/cli. The sign-in can only send results for review and lasts 90 days; the server reads it on every call, so no restart is needed. Where there is no home directory, set `TOKENMARK_TOKEN` in the server's environment instead. A sign-in is only sent over https (or plain http to this machine), and every sign-in on the account can be revoked at https://tokenmark.app/cli.

Hardware missing from the catalogue, or a result typed in by hand, can also go through the signed-in form at https://tokenmark.app/submit.

Data is pulled live from `https://tokenmark.app` (override with `TOKENMARK_URL`). Zero runtime dependencies.

## The same data in your terminal

The CLI lives in [`cli/`](https://github.com/sypherin/tokenmark-mcp/tree/main/cli) of this repo:

```sh
npx @altronis/tokenmark-cli recommend --hardware "Strix Halo" --tasks coding
```

The files in `bin/` are the published builds, made from the TokenMark tracker that runs https://tokenmark.app.

MIT licensed. Data aggregated from public community benchmarks with attribution.
