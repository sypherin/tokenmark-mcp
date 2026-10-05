#!/usr/bin/env node

// tracker/lib/dictionaries.js
var HARDWARE = {
  // Gorgon Halo (Ryzen AI Max+ PRO 495, 192 GB, 273 GB/s) sits BEFORE strix-halo:
  // normalizeHardware returns the first alias hit and strix-halo owns the generic
  // "ryzen ai max". Aliases here are 495-specific only; bare "gorgon" is avoided
  // because Gorgon Point is a different (laptop) AMD chip.
  "gorgon-halo": {
    label: "AMD Gorgon Halo (Ryzen AI Max+ PRO 495)",
    vendor: "AMD",
    unified_ram_gb: 192,
    aliases: [
      "gorgon halo",
      "gorgon-halo",
      "ryzen ai max+ pro 495",
      "ryzen ai max pro 495",
      "ai max+ pro 495",
      "ai max pro 495",
      "ai max+ 495",
      "ai max 495",
      "max+ pro 495",
      "radeon 8065s",
      "evo-x5",
      "evo x5",
      "thinkcentre x ultra"
    ]
  },
  "strix-halo": {
    label: "AMD Strix Halo (Ryzen AI Max+ 395)",
    vendor: "AMD",
    unified_ram_gb: 128,
    // most common config; overridable per-result
    // aliases are lowercased substrings matched against source text
    aliases: [
      "strix halo",
      "strix-halo",
      "ryzen ai max+ 395",
      "ryzen ai max 395",
      "ryzen ai max",
      "ai max+ 395",
      "ai max 395",
      "gfx1151",
      "radeon 8060s",
      "gmktec evo-x2",
      "evo-x2",
      "framework desktop",
      "ryzen ai max plus 395"
    ]
  },
  "dgx-spark": {
    label: "NVIDIA DGX Spark (GB10)",
    vendor: "NVIDIA",
    unified_ram_gb: 128,
    aliases: [
      "dgx spark",
      "dgx-spark",
      "gb10",
      "grace blackwell",
      "grace-blackwell",
      "project digits",
      "nvidia digits"
    ]
  },
  // Apple is TWO buckets (Zach 2026-09-02, "pls split"): Max chips (MacBook Pro,
  // Mac Studio Max; ~546 GB/s) vs Ultra (Mac Studio Ultra; ~819 GB/s). Order
  // matters: normalizeHardware returns the first alias hit, so the specific
  // "mN max" bucket sits before the one that also owns the generic "mac studio".
  "mac-max": {
    label: "Apple M-series Max (MacBook Pro / Mac Studio Max)",
    vendor: "Apple",
    unified_ram_gb: null,
    scouted: false,
    aliases: [
      "m5 max",
      "m4 max",
      "m3 max",
      "m2 max",
      "m1 max",
      "apple m5 max",
      "apple m4 max",
      "apple m3 max"
    ]
  },
  "mac-ultra": {
    label: "Apple Mac Studio (M-series Ultra)",
    vendor: "Apple",
    unified_ram_gb: null,
    scouted: false,
    // phase 3
    aliases: [
      "m5 ultra",
      "m4 ultra",
      "m3 ultra",
      "m2 ultra",
      "m1 ultra",
      "apple m3 ultra",
      "apple m2 ultra",
      "mac studio"
      // bare "Mac Studio" with no chip named: Ultra is the benchmark-poster default
    ]
  },
  // Discrete-GPU builds (Zach 2026-08-30: expand beyond unified-RAM to capable
  // dGPU rigs). Dedicated VRAM, not unified; multi-card handled via settings.num_gpus.
  "rtx-5090": {
    label: "NVIDIA RTX 5090 (32GB)",
    vendor: "NVIDIA",
    vram_gb: 32,
    aliases: ["rtx 5090", "rtx5090", "geforce rtx 5090", "rtx-5090"]
  },
  "rtx-pro-6000": {
    label: "NVIDIA RTX PRO 6000 Blackwell (96GB)",
    vendor: "NVIDIA",
    vram_gb: 96,
    aliases: ["rtx pro 6000", "rtx 6000 pro", "rtx pro 6000 blackwell", "pro 6000 blackwell", "rtx6000 pro"]
  },
  "rtx-4090": {
    label: "NVIDIA RTX 4090 (24GB)",
    vendor: "NVIDIA",
    vram_gb: 24,
    aliases: ["rtx 4090", "rtx4090", "geforce rtx 4090", "rtx-4090"]
  },
  "rtx-6000-ada": {
    label: "NVIDIA RTX 6000 Ada (48GB)",
    vendor: "NVIDIA",
    vram_gb: 48,
    aliases: ["rtx 6000 ada", "rtx6000 ada", "a6000 ada", "6000 ada"]
  },
  // Datacenter AMD + Intel Arc (2026-09-23): both show up in real benchmark posts and
  // the Deneb hardware catalog carries them, so results must land on a canonical row.
  "mi300x": {
    label: "AMD Instinct MI300X (192GB)",
    vendor: "AMD",
    vram_gb: 192,
    aliases: ["mi300x", "instinct mi300x", "mi-300x"]
  },
  "arc-b580": {
    label: "Intel Arc B580 (12GB)",
    vendor: "Intel",
    vram_gb: 12,
    aliases: ["arc b580", "arc-b580", "intel b580"]
  },
  "arc-pro-b60": {
    label: "Intel Arc Pro B60 (24GB)",
    vendor: "Intel",
    vram_gb: 24,
    aliases: ["arc pro b60", "arc-pro-b60", "intel pro b60"]
  }
};
var QUANT_FAMILIES = {
  gguf: [
    "Q2_K",
    "Q3_K_S",
    "Q3_K_M",
    "Q3_K_L",
    "Q4_0",
    "Q4_1",
    "Q4_K_S",
    "Q4_K_M",
    "Q4_K_L",
    "Q5_K_S",
    "Q5_K_M",
    "Q6_K",
    "Q8_0",
    // unsloth dynamic + i-quants
    "UD-Q2_K_XL",
    "UD-Q3_K_XL",
    "UD-Q4_K_XL",
    "UD-Q5_K_XL",
    "UD-Q6_K_XL",
    "UD-Q8_K_XL",
    "Q4_K_XL",
    "IQ1_S",
    "IQ2_XXS",
    "IQ2_XS",
    "IQ2_M",
    "IQ3_XXS",
    "IQ3_M",
    "IQ4_XS",
    "IQ4_NL"
  ],
  mlx: ["MLX-3BIT", "MLX-4BIT", "MLX-6BIT", "MLX-8BIT"],
  other: ["FP8", "FP16", "BF16", "AWQ", "GPTQ", "INT4", "INT8", "NVFP4", "MXFP4", "FP4"]
};

// tracker/lib/normalize.js
var lc = (s) => (s || "").toString().toLowerCase();
function normalizeHardware(text) {
  const t = lc(text);
  for (const [id, hw] of Object.entries(HARDWARE)) {
    if (hw.aliases.some((a) => t.includes(a))) return id;
  }
  return null;
}
var QUANT_LOOKUP = (() => {
  const m = /* @__PURE__ */ new Map();
  for (const [family, list] of Object.entries(QUANT_FAMILIES)) {
    for (const q of list) m.set(q.toUpperCase(), { canonical: q, family });
  }
  return m;
})();

// tracker/lib/schema.js
var TRUST_TIERS = {
  "zach-verified": { rank: 5, label: "Verified (ran it)", denebEligible: true },
  "structured-table": { rank: 4, label: "Structured table", denebEligible: true },
  "owner-submitted": { rank: 3, label: "Owner-submitted", denebEligible: true },
  "linked-extract": { rank: 2, label: "Extracted, source-linked", denebEligible: true },
  "reddit-unlinked": { rank: 1, label: "Unverified (no GH/HF link)", denebEligible: false },
  // Typed in on /submit by a signed-in user (2026-09-25). Human-reviewed before it
  // goes live, but the number itself has no source the tracker can re-read, so it
  // ranks with the unlinked tier and never feeds Deneb as source of truth.
  "user-reported": { rank: 1, label: "User-reported", denebEligible: false }
};

// tracker/lib/ingest.js
var KNOWN_PARAMS_B = [
  [(n) => /flash-?next/i.test(n) && !/reap/i.test(n), 177]
];
function paramsB(name = "") {
  const s = String(name);
  for (const [match, b] of KNOWN_PARAMS_B) if (match(s)) return b;
  const ms = s.match(/(\d+(?:\.\d+)?)\s*b\b/gi);
  if (!ms) return null;
  return Math.max(...ms.map((m) => parseFloat(m)));
}
var SPEC_MODE_RE = /mtp|dflash|dspark|eagle|spec|draft|medusa|lookahead|ngram/i;
var isSpeculative = (mode) => SPEC_MODE_RE.test(String(mode || ""));
function backendText(c) {
  const be = [c.backend, c.variant].filter(Boolean).join("/");
  if (!c.mode) return be;
  const mode = isSpeculative(c.mode) ? `speculative decode, ${c.mode}` : c.mode;
  return be ? `${be} (${mode})` : `(${mode})`;
}

// tracker/lib/recommend.js
var TASK_TAGS = ["coding", "reasoning", "long-context", "vision", "agentic", "general"];
function taskFit(model, cfg, task) {
  const n = (model || "").toLowerCase();
  const p = paramsB(model) || 0;
  switch (task) {
    case "coding":
      return /coder|codestral|devstral|code-?llama|starcoder/.test(n) ? 1 : /deepseek|qwen3|glm|gpt-?oss/.test(n) && p >= 20 ? 0.5 : 0.2;
    case "reasoning":
      return /think|reason|r1|qwq|magistral|nemotron|deepseek|gpt-?oss/.test(n) ? 1 : p >= 27 ? 0.6 : 0.3;
    case "vision":
      return /omni|vl\b|vision|multimodal|gemma|-mm\b/.test(n) ? 1 : 0;
    case "long-context":
      return cfg.ctx ? Math.min(1, cfg.ctx / 131072) : 0.3;
    case "agentic":
      return /nemotron|agent|qwen3|glm|kimi|minimax/.test(n) ? 0.8 : 0.4;
    case "general":
    default:
      return 0.5;
  }
}
function matchesHardware(cfg, hw) {
  if (!hw) return true;
  const q = hw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const hay = `${cfg.hardware || ""} ${cfg.hardwareLabel || ""} ${cfg.oemLabel || ""}`.toLowerCase();
  return hay.includes(q) || q.split(" ").filter((w) => w.length > 2).every((w) => hay.includes(w));
}
var TRUST_RANK = Object.fromEntries(Object.entries(TRUST_TIERS).map(([k, t]) => [k, t.rank]));
var singleStream = (c) => (c.throughput_kind ?? "single-stream") === "single-stream";
function bestConfigs(configs, hw) {
  const pool = configs.filter((c) => matchesHardware(c, hw));
  const byModel = /* @__PURE__ */ new Map();
  for (const c of pool) {
    const k = c.model || ", ";
    const prev = byModel.get(k);
    const better = !prev || (TRUST_RANK[c.trust] ?? 0) > (TRUST_RANK[prev.trust] ?? 0) || (TRUST_RANK[c.trust] ?? 0) === (TRUST_RANK[prev.trust] ?? 0) && (c.decode_tps ?? 0) > (prev.decode_tps ?? 0);
    if (better) byModel.set(k, c);
  }
  return [...byModel.values()];
}
function recommend(configs, { hardware: hardware2 = null, tasks = [], prefer = "balanced", limit = 5 } = {}) {
  const wanted = (tasks || []).map((t) => String(t).toLowerCase()).filter((t) => TASK_TAGS.includes(t));
  const cands = bestConfigs(configs, hardware2);
  if (!cands.length) return [];
  const maxTps = Math.max(...cands.filter(singleStream).map((c) => c.decode_tps || 0), 1);
  const maxParams = Math.max(...cands.map((c) => paramsB(c.model) || 0), 1);
  const w = prefer === "speed" ? { speed: 0.6, quality: 0.1 } : prefer === "quality" ? { speed: 0.15, quality: 0.55 } : { speed: 0.35, quality: 0.35 };
  const scored = cands.map((c) => {
    const speed = singleStream(c) ? (c.decode_tps || 0) / maxTps : 0;
    const quality = (paramsB(c.model) || 0) / maxParams;
    const fit = wanted.length ? wanted.reduce((s, t) => s + taskFit(c.model, c, t), 0) / wanted.length : 0.5;
    const trust = (TRUST_RANK[c.trust] ?? 1) / 5;
    const cred = c.credibility ?? 0;
    const base = w.speed * speed + w.quality * quality + 0.1 * trust + 0.05 * cred;
    const fitFactor = wanted.length ? 0.3 + 0.7 * fit : 1;
    const score = base * fitFactor;
    return { c, score, speed, quality, fit };
  }).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ c, fit }) => ({
    model: c.model,
    vendor: c.vendor || null,
    config: {
      quant: c.quant,
      backend: c.backend,
      variant: c.variant,
      hardware: c.hardware,
      hardwareLabel: c.hardwareLabel,
      ctx: c.ctx,
      decode_tps: c.decode_tps,
      prefill_tps: c.prefill_tps,
      throughput_kind: c.throughput_kind,
      mode: c.mode || null,
      speculative: isSpeculative(c.mode),
      trust: c.trust,
      trustLabel: c.trustLabel,
      author: c.author,
      url: c.doc_url || c.url
    },
    why: buildWhy(c, wanted, prefer, fit)
  }));
}
function buildWhy(c, wanted, prefer, fit) {
  const why = [];
  const how = [singleStream(c) ? null : c.throughput_kind, c.mode ? isSpeculative(c.mode) ? `speculative decode, ${c.mode}` : c.mode : null].filter(Boolean);
  if (c.decode_tps) why.push(`${c.decode_tps} tok/s decode on ${c.hardwareLabel || c.hardware}${how.length ? ` (${how.join("; ")})` : ""}`);
  const p = paramsB(c.model);
  if (p) why.push(`${p}B-class model`);
  if (wanted.includes("long-context") && c.ctx) why.push(`${c.ctx >= 1024 ? Math.round(c.ctx / 1024) + "k" : c.ctx} context`);
  if (wanted.includes("vision") && fit >= 0.9) why.push("multimodal (handles vision)");
  if (wanted.includes("coding") && fit >= 0.8) why.push("coding-focused");
  if (c.trust === "zach-verified") why.push("verified (ran it)");
  else if (c.trust === "structured-table") why.push("from a structured benchmark table");
  return why;
}

// tracker/lib/hardware-view.js
var val = (s) => s && typeof s === "object" && "value" in s ? s.value : s ?? null;
var words = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function findPlatform(doc, query) {
  const plats = doc?.platforms || {};
  const q = words(query);
  if (!q) return null;
  const id = q.replace(/ /g, "-");
  if (plats[id]) return plats[id];
  const alias = normalizeHardware(query);
  if (alias && plats[alias]) return plats[alias];
  const hay = (p) => words(`${p.slug} ${p.silicon} ${(p.devices || []).map((d) => `${d.oem} ${d.name}`).join(" ")}`);
  const all = Object.values(plats);
  const whole = all.find((p) => hay(p).includes(q));
  if (whole) return whole;
  const ws = q.split(" ").filter((w) => w.length > 2);
  return ws.length && all.find((p) => ws.every((w) => hay(p).includes(w))) || null;
}
var trackedCount = (configs, slug) => (configs || []).filter((c) => c.hardware === slug).length;
var pageUrl = (base, slug) => `${base}/hardware/${slug}`;
function platformList(doc, configs = [], base = "https://tokenmark.app") {
  return Object.values(doc?.platforms || {}).map((p) => ({
    id: p.slug,
    silicon: p.silicon,
    max_memory_gb: val(p.specs?.max_unified_memory_gb) ?? val(p.specs?.memory_gb),
    memory_bandwidth_gbps: val(p.specs?.memory_bandwidth_gbps),
    boxes: (p.devices || []).length,
    tracked_configs: trackedCount(configs, p.slug),
    page: pageUrl(base, p.slug)
  }));
}
function platformDetail(doc, p, configs = [], base = "https://tokenmark.app") {
  const specs = Object.fromEntries(Object.entries(p.specs || {}).map(([k, s]) => [k, { value: val(s), source: s?.source || null }]));
  const boxes = (p.devices || []).map((d) => ({
    name: d.name,
    oem: d.oem || null,
    form_factor: d.form_factor || null,
    memory_gb: val(d.specs?.memory_gb),
    memory_bandwidth_gbps: val(d.specs?.memory_bandwidth_gbps),
    price_usd: val(d.specs?.price_usd),
    release_date: val(d.specs?.release_date),
    url: d.official_url || null
  }));
  const buy = (doc?.buy?.platforms?.[p.slug] || []).map((b) => ({
    label: b.label,
    from_sgd: b.from_sgd ?? null,
    to_sgd: b.to_sgd ?? null,
    sellers: (b.sellers || []).filter((s) => s.status === "priced").length,
    last_read: b.last_read || null,
    stale: !!b.stale
  }));
  return {
    id: p.slug,
    silicon: p.silicon,
    page: pageUrl(base, p.slug),
    official_url: p.official_url || null,
    tracked_configs: trackedCount(configs, p.slug),
    specs,
    boxes,
    where_to_buy_sg: buy,
    not_stated: p.ungrounded || [],
    catalogue_generated: doc?.generated || null
  };
}

// tracker/cli/tokenmark.mjs
var VERSION = true ? "0.2.1" : "dev";
var BASE = (process.env.TOKENMARK_URL || "https://tokenmark.app").replace(/\/$/, "");
var argv = process.argv.slice(2);
var cmd = argv[0];
var flag = (name, def = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
var positional = argv.slice(1).filter((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1]?.startsWith("--") === false);
var C = { dim: (s) => `\x1B[2m${s}\x1B[0m`, g: (s) => `\x1B[32m${s}\x1B[0m`, b: (s) => `\x1B[1m${s}\x1B[0m`, y: (s) => `\x1B[33m${s}\x1B[0m` };
async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`fetch ${BASE}${path} -> ${res.status}`);
  return res.json();
}
var load = () => getJson("/tracker-summary.json");
var SUBMIT_URL = `${BASE}/submit`;
function usage() {
  console.log(`tokenmark ${VERSION} \u2014 local-LLM config tracker CLI

  recommend  --hardware <hw> [--tasks a,b] [--prefer speed|quality|balanced] [--limit N]
  configs    [--model <name>] [--hardware <hw>]
  search     <term>
  models
  hardware   [<name>]   the catalogue: Strix Halo, Gorgon Halo, DGX Spark, Mac Max/Ultra, their boxes and SG prices
  submit     <github-or-hf-repo> [--note "\u2026"] [--source hf]   (human-reviewed before going live)
  status     <submission-id>
  version

Measured a speed yourself, or missing a box? Sign in at ${SUBMIT_URL}
source: ${BASE}  (override with $TOKENMARK_URL)`);
}
function printRec(r, i) {
  const c = r.config;
  console.log(`${C.b(`${i + 1}. ${r.model}`)} ${C.dim(`[${r.vendor || "?"}]`)}`);
  console.log(`   ${C.g(`${c.decode_tps ?? "?"} tok/s`)} \xB7 ${c.quant || "?"} \xB7 ${backendText(c) || "?"} \xB7 ${c.hardwareLabel || c.hardware}`);
  console.log(`   ${C.dim(r.why.join(" \xB7 "))}`);
  if (c.url) console.log(`   ${C.dim(c.url)}`);
}
var fmt = (v, unit = "") => v == null || v === "" ? "?" : `${Array.isArray(v) ? v.join("/") : v}${unit}`;
var plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
async function hardware(query) {
  const [doc, snap] = await Promise.all([getJson("/hardware.json"), load().catch(() => ({ configs: [] }))]);
  if (!query) {
    const rows = platformList(doc, snap.configs, BASE);
    console.log(C.dim(`
${rows.length} platforms (catalogue ${String(doc.generated || "?").slice(0, 10)}):
`));
    rows.forEach((r) => console.log(`  ${C.b(r.id.padEnd(12))} ${r.silicon.padEnd(50)} ${fmt(r.max_memory_gb, " GB").padStart(7)}  ${plural(r.boxes, "box  ", "boxes").padStart(8)}  ${plural(r.tracked_configs, "config", "configs").padStart(11)}  ${fmt(r.memory_bandwidth_gbps, " GB/s")}`));
    console.log(C.dim(`
details: tokenmark hardware <name>   e.g. tokenmark hardware gorgon`));
    return;
  }
  const p = findPlatform(doc, query);
  if (!p) {
    console.error(C.y(`No platform matches "${query}". Catalogue: ${Object.keys(doc.platforms || {}).join(", ")}`));
    console.error(C.dim(`Missing hardware? Suggest it (sign in): ${SUBMIT_URL}`));
    process.exit(1);
  }
  const d = platformDetail(doc, p, snap.configs, BASE);
  console.log(`
${C.b(d.silicon)}  ${C.dim(d.page)}`);
  console.log(`  ${d.tracked_configs ? C.g(plural(d.tracked_configs, "tracked config", "tracked configs")) + C.dim(`  (tokenmark recommend --hardware ${d.id})`) : C.y("0 tracked configs yet")}`);
  console.log(C.dim("\n  specs"));
  Object.entries(d.specs).forEach(([k, s]) => console.log(`    ${k.replace(/_/g, " ").padEnd(24)} ${fmt(s.value)}`));
  console.log(C.dim(`
  ${plural(d.boxes.length, "box", "boxes")}`));
  d.boxes.forEach((b) => console.log(`    ${b.name}${b.form_factor ? C.dim(` (${b.form_factor})`) : ""}  ${fmt(b.memory_gb, " GB")} \xB7 ${fmt(b.memory_bandwidth_gbps, " GB/s")} \xB7 ${b.price_usd != null ? `US$${b.price_usd}` : "price ?"}${b.release_date ? ` \xB7 ${b.release_date}` : ""}`));
  if (d.where_to_buy_sg.length) {
    console.log(C.dim("\n  Singapore prices"));
    d.where_to_buy_sg.forEach((b) => console.log(`    ${b.label}  ${b.from_sgd != null ? `S$${Math.round(b.from_sgd)}${b.to_sgd && b.to_sgd !== b.from_sgd ? `-${Math.round(b.to_sgd)}` : ""}` : "no price"}  ${C.dim(`${b.sellers} seller(s), read ${String(b.last_read || "?").slice(0, 10)}${b.stale ? ", STALE" : ""}`)}`));
  }
  if (d.not_stated.length) {
    console.log(C.dim("\n  not stated by any source"));
    d.not_stated.forEach((n) => console.log(C.dim(`    - ${n}`)));
  }
}
(async () => {
  try {
    if (!cmd || cmd === "help" || cmd === "--help") return usage();
    if (cmd === "version" || cmd === "--version" || cmd === "-v") return console.log(VERSION);
    if (cmd === "hardware") return hardware(positional.join(" "));
    if (cmd === "submit") {
      const repo = positional[0] || argv[1];
      if (!repo) return console.log(C.y('usage: tokenmark submit <repo> [--note "\u2026"] [--source hf]'));
      const res = await fetch(`${BASE}/api/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo, source: flag("source"), note: flag("note"), via: "cli" }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(C.y(`error: ${j.error || res.status}`));
        process.exit(1);
      }
      console.log(`${C.g(j.already_open ? "already open" : "queued")} ${j.id}  ${j.url}`);
      console.log(C.dim(`status: tokenmark status ${j.id}   (configs are extracted, then a human reviews before they go live)`));
      return;
    }
    if (cmd === "status") {
      const id = positional[0] || argv[1];
      if (!id) return console.log(C.y("usage: tokenmark status <submission-id>"));
      const res = await fetch(`${BASE}/api/submit/${encodeURIComponent(id)}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(C.y(`error: ${j.error || res.status}`));
        process.exit(1);
      }
      console.log(`${C.b(j.id)}  ${j.url}
  status: ${C.g(j.status)}${j.decision ? ` (${j.decision})` : ""}${j.error ? `  ${C.y(j.error)}` : ""}`);
      (j.configs || []).forEach((c, i) => console.log(`  ${i + 1}. ${c.model} \xB7 ${c.quant || "?"} \xB7 ${c.hardware} \xB7 ${c.backend || "?"} \u2192 ${c.decode_tps} tok/s${c.flags?.length ? C.y(`  \u26A0 ${c.flags.join("; ")}`) : ""}`));
      return;
    }
    const s = await load();
    if (cmd === "recommend") {
      const tasks = (flag("tasks") || "").split(",").map((t) => t.trim()).filter(Boolean);
      const recs = recommend(s.configs, { hardware: flag("hardware"), tasks, prefer: flag("prefer", "balanced"), limit: parseInt(flag("limit", "5"), 10) });
      if (!recs.length) {
        console.log(C.y(`No tracked configs match "${flag("hardware") || "any hardware"}" yet.`));
        const p = flag("hardware") && findPlatform(await getJson("/hardware.json").catch(() => null), flag("hardware"));
        if (p) console.log(C.dim(`${p.silicon} is in the catalogue: tokenmark hardware ${p.slug}
Measured it yourself? ${SUBMIT_URL}`));
        return;
      }
      console.log(C.dim(`
${recs.length} picks for ${flag("hardware") || "any hardware"}${tasks.length ? ` \xB7 ${tasks.join(", ")}` : ""} \xB7 prefer ${flag("prefer", "balanced")}
`));
      recs.forEach(printRec);
      return;
    }
    if (cmd === "configs") {
      const model = flag("model"), hw = flag("hardware");
      let rows = s.configs;
      if (model) rows = rows.filter((c) => (c.model || "").toLowerCase().includes(model.toLowerCase()));
      if (hw) rows = rows.filter((c) => matchesHardware(c, hw));
      rows.sort((a, b) => (b.decode_tps || 0) - (a.decode_tps || 0));
      console.log(C.dim(`
${rows.length} config(s):
`));
      rows.slice(0, 40).forEach((c) => console.log(`  ${C.g(String(c.decode_tps ?? "?").padStart(6))} t/s  ${(c.model || "").padEnd(34)} ${(c.quant || "").padEnd(12)} ${c.hardwareLabel || c.hardware}  ${c.mode ? C.y(`[${backendText(c)}] `) : ""}${C.dim(c.author || "")}`));
      if (rows.length > 40) console.log(C.dim(`  \u2026 ${rows.length - 40} more, narrow with --model / --hardware`));
      return;
    }
    if (cmd === "search") {
      const term = (positional[0] || argv[1] || "").toLowerCase();
      if (!term) return console.log(C.y("usage: tokenmark search <term>"));
      const rows = s.configs.filter((c) => JSON.stringify(c).toLowerCase().includes(term));
      console.log(C.dim(`
${rows.length} match(es) for "${term}":
`));
      [...new Set(rows.map((c) => c.model))].slice(0, 30).forEach((m) => console.log(`  ${m}`));
      return;
    }
    if (cmd === "models") {
      const models = [...new Set(s.configs.map((c) => c.model))].sort();
      console.log(C.dim(`
${models.length} models (${s.counts?.configs} configs):
`));
      models.forEach((m) => console.log(`  ${m}`));
      return;
    }
    usage();
  } catch (e) {
    console.error(C.y(`error: ${e.message}`));
    process.exit(1);
  }
})();
