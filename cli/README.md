# @altronis/tokenmark-cli

Recommend the best local-LLM **model + config** for your hardware, from real community benchmarks: [TokenMark](https://tokenmark.app) in your terminal.

It pulls the live benchmark snapshot from tokenmark.app and ranks **measured** configs (Strix Halo, DGX Spark, RTX, Mac). It never invents numbers: every pick is a real config with a source link.

## Use

```sh
npx @altronis/tokenmark-cli recommend --hardware "Strix Halo" --tasks coding,reasoning --prefer balanced
```

Or install it:

```sh
npm i -g @altronis/tokenmark-cli
tokenmark recommend --hardware "DGX Spark" --tasks vision --prefer quality
```

## Commands

```
tokenmark recommend --hardware <hw> [--tasks a,b] [--prefer speed|quality|balanced] [--limit N]
tokenmark configs   [--model <name>] [--hardware <hw>]
tokenmark search    <term>
tokenmark models
tokenmark hardware  [<name>]
tokenmark submit    <github-or-hf-repo> [--note "..."] [--source hf]
tokenmark status    <submission-id>
tokenmark version
```

- `--tasks`: any of `coding`, `reasoning`, `long-context`, `vision`, `agentic`, `general`
- `--prefer`: `speed` (fastest), `quality` (most capable), `balanced` (default)

Point it at a different source with `TOKENMARK_URL` (default `https://tokenmark.app`).

## Hardware catalogue

```sh
tokenmark hardware              # every platform: memory, bandwidth, boxes, tracked configs
tokenmark hardware gorgon       # one platform: chip specs with sources, the boxes that ship it, SG prices
tokenmark hardware "Mac Ultra"
```

Covers AMD Strix Halo, AMD Gorgon Halo, NVIDIA DGX Spark and Apple M Max / M Ultra. Names are forgiving: an id (`gorgon-halo`), a chip (`Ryzen AI Max+ 395`) or a box (`GMKtec EVO-X5 Pro`) all work.

## Adding numbers

`tokenmark submit <repo>` sends a GitHub or Hugging Face repo whose README has benchmark numbers. A person reviews it before anything goes live; `tokenmark status <id>` shows where it is.

Measured a speed yourself, or your box isn't in the catalogue? Sign in and use the form at https://tokenmark.app/submit.

## What it shows

Each pick is a real measured config: decode tok/s, quant, backend, the hardware it ran on, why it was picked, who benchmarked it, and a link to the source. Aggregate/multi-GPU numbers are labeled so they aren't read as single-stream speed, and runs that used speculative decoding (MTP, DFlash, a draft model) say so, so they aren't read as a plain run of the same quant.

MIT licensed. Data aggregated from public community benchmarks with attribution.
