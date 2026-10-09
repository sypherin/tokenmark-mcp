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
tokenmark login     [--no-browser]
tokenmark whoami
tokenmark logout    [--env] [--force]
tokenmark submit-result [--from <file>] [--hardware <hw>] [--pick N] [--dry-run] [...]
tokenmark version
```

- `--tasks`: any of `coding`, `reasoning`, `long-context`, `vision`, `agentic`, `general`
- `--prefer`: `speed` (fastest), `quality` (most capable), `balanced` (default)
- Flags take `--flag value` or `--flag=value`. A misspelt flag is an error, so `--dryrun` never sends for real.

Point it at a different source with `TOKENMARK_URL` (default `https://tokenmark.app`). A sign-in is only ever sent over https, or plain http to this machine.

## Hardware catalogue

```sh
tokenmark hardware              # every platform: memory, bandwidth, boxes, tracked configs
tokenmark hardware gorgon       # one platform: chip specs with sources, the boxes that ship it, SG prices
tokenmark hardware "Mac Ultra"
```

Covers AMD Strix Halo, AMD Gorgon Halo, NVIDIA DGX Spark and Apple M Max / M Ultra. Names are forgiving: an id (`gorgon-halo`), a chip (`Ryzen AI Max+ 395`) or a box (`GMKtec EVO-X5 Pro`) all work.

## Adding numbers

Two ways in, and a person reviews both before anything goes live:

- `tokenmark submit <repo>` sends a GitHub or Hugging Face repo whose README has benchmark numbers.
- `tokenmark submit-result` sends a speed you measured yourself.

`tokenmark status <id>` shows where either one is.

### Sending a speed you measured

Sign in once:

```sh
tokenmark login
```

It prints a short code and opens https://tokenmark.app/cli. Sign in on that page if you aren't already. The page shows which program asked and how long ago: check the code matches your terminal, then approve. If the request came from a different network than your browser, as it does over SSH, the page asks you to type the code yourself. The terminal then holds a sign-in that can only send results for review, and it lasts 90 days. It is saved in `~/.config/tokenmark/credentials.json`, readable only by you. On a box with no browser, run `tokenmark login --no-browser` and open the printed link on another device.

`tokenmark whoami` shows who the terminal is signed in as. `tokenmark logout` revokes the saved sign-in on the server and deletes the local copy. If the server can't be reached it keeps the sign-in and says so: run it again, or add `--force` to delete the local copy anyway (it then stays valid until it expires). `--env` also revokes a token set in `TOKENMARK_TOKEN`.

https://tokenmark.app/cli lists every terminal signed in to your account, with a Revoke button on each, so you can end one without the machine it is on.

Then pipe llama-bench straight in:

```sh
llama-bench -m Qwen3-8B-Q4_K_M.gguf -o json | tokenmark submit-result --hardware "Strix Halo"
```

Or send a saved file, or type the numbers in:

```sh
tokenmark submit-result --from bench.json --hardware dgx-spark
tokenmark submit-result --model Qwen3.8-27B --quant Q4_K_M --hardware strix-halo --backend llama.cpp --decode 72.4
```

It reads llama-bench output (json, jsonl, csv or the default table) and `vllm bench serve` output. Model, quant, backend and speeds come from the output, and any flag you type wins over what it read. If the output holds more than one setup, it lists them and you choose one with `--pick N`. `--dry-run` prints the request it would send and sends nothing.

More fields: `--prefill --ctx --concurrency --variant --backend-version --mode --device --ram --proof <url> --note --credit <handle> --command "<how you ran it>"`.

In CI, set `TOKENMARK_TOKEN` to the token that `tokenmark login` saved, instead of keeping the credentials file.

No terminal? The signed-in form at https://tokenmark.app/submit takes the same result.

## What it shows

Each pick is a real measured config: decode tok/s, quant, backend, the hardware it ran on, why it was picked, who benchmarked it, and a link to the source. Aggregate/multi-GPU numbers are labeled so they aren't read as single-stream speed, and runs that used speculative decoding (MTP, DFlash, a draft model) say so, so they aren't read as a plain run of the same quant.

MIT licensed. Data aggregated from public community benchmarks with attribution.
