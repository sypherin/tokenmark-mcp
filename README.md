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

Cline in VS Code: add the `tokenmark` entry from the JSON below to `cline_mcp_settings.json`. Step-by-step notes for agents are in [llms-install.md](llms-install.md).

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

A speed someone measured themselves, or hardware missing from the catalogue, goes through the signed-in form at https://tokenmark.app/submit.

Data is pulled live from `https://tokenmark.app` (override with `TOKENMARK_URL`). Zero runtime dependencies.

## The same data in your terminal

The CLI lives in [`cli/`](https://github.com/sypherin/tokenmark-mcp/tree/main/cli) of this repo:

```sh
npx @altronis/tokenmark-cli recommend --hardware "Strix Halo" --tasks coding
```

The files in `bin/` are the published builds, made from the TokenMark tracker that runs https://tokenmark.app.

MIT licensed. Data aggregated from public community benchmarks with attribution.
