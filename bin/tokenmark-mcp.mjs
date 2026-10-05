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
function recommend(configs, { hardware = null, tasks = [], prefer = "balanced", limit = 5 } = {}) {
  const wanted = (tasks || []).map((t) => String(t).toLowerCase()).filter((t) => TASK_TAGS.includes(t));
  const cands = bestConfigs(configs, hardware);
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

// tracker/mcp/tokenmark-mcp.mjs
var BASE = (process.env.TOKENMARK_URL || "https://tokenmark.app").replace(/\/$/, "");
var PROTOCOL = "2024-11-05";
var VERSION = true ? "0.2.1" : "dev";
var SUBMIT_URL = `${BASE}/submit`;
var cache = null;
var cacheAt = 0;
async function summary() {
  if (cache && Date.now() - cacheAt < 3e5) return cache;
  const res = await fetch(`${BASE}/tracker-summary.json`);
  if (!res.ok) throw new Error(`tracker-summary ${res.status}`);
  cache = await res.json();
  cacheAt = Date.now();
  return cache;
}
var hwCache = null;
var hwAt = 0;
async function hardwareDoc() {
  if (hwCache && Date.now() - hwAt < 3e5) return hwCache;
  const res = await fetch(`${BASE}/hardware.json`);
  if (!res.ok) throw new Error(`hardware.json ${res.status}`);
  hwCache = await res.json();
  hwAt = Date.now();
  return hwCache;
}
var TOOLS = [
  {
    name: "tokenmark_recommend",
    description: "Recommend the best local-LLM model + config for given hardware and tasks, from real tracked benchmarks. Returns ranked picks with measured tok/s and a source link. Never invents numbers. config.speculative=true means the tok/s came from speculative decoding (MTP, DFlash, a draft model), not a plain run of the same quant; say so when quoting it.",
    inputSchema: {
      type: "object",
      properties: {
        hardware: { type: "string", description: 'e.g. "Strix Halo", "Gorgon Halo", "DGX Spark", "Mac Ultra", "RTX 5090"' },
        tasks: { type: "array", items: { type: "string", enum: ["coding", "reasoning", "long-context", "vision", "agentic", "general"] }, description: "what the user wants to do" },
        prefer: { type: "string", enum: ["speed", "quality", "balanced"], description: "default balanced" },
        limit: { type: "number", description: "how many picks (default 5, max 10)" }
      },
      required: ["hardware"]
    }
  },
  {
    name: "tokenmark_configs",
    description: "List tracked benchmark configs, optionally filtered by model and/or hardware. Returns measured decode tok/s, quant, backend, run mode (speculative=true for MTP/DFlash/draft-model runs), author, and source.",
    inputSchema: { type: "object", properties: { model: { type: "string" }, hardware: { type: "string" }, limit: { type: "number", description: "rows to return, fastest first (default 25, max 50); `matched` gives the full count" } } }
  },
  {
    name: "tokenmark_submit",
    description: "Submit a GitHub or Hugging Face repo whose README/model card contains local-LLM benchmark numbers (tok/s on Strix Halo, DGX Spark, Mac, etc.) to TokenMark. Configs are extracted on the tracker, then a human reviews before anything goes live. Returns a submission id to poll with tokenmark_submission_status. A speed the user measured themselves (no repo), or hardware the catalogue is missing, goes through the signed-in form at https://tokenmark.app/submit instead.",
    inputSchema: { type: "object", properties: { repo: { type: "string", description: "https://github.com/owner/name, https://huggingface.co/owner/name, or owner/name" }, source: { type: "string", enum: ["gh", "hf"], description: "only needed for a bare owner/name that is on Hugging Face" }, note: { type: "string", description: "optional context for the reviewer (hardware, backend build, how it was measured)" } }, required: ["repo"] }
  },
  {
    name: "tokenmark_submission_status",
    description: "Check a TokenMark submission: queued, extracting, extracted (awaiting review), no_configs, failed, approved or rejected \u2014 with the extracted configs and reviewer flags.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
  },
  {
    name: "tokenmark_hardware",
    description: "The TokenMark hardware catalogue: unified-memory platforms for local LLMs (AMD Strix Halo, AMD Gorgon Halo, NVIDIA DGX Spark, Apple M Max / M Ultra). Without platform: one row per platform (memory, bandwidth, box count, tracked configs). With platform: chip specs with a source link per value, the boxes that ship it, Singapore prices, and what no source states. Specs only, no speed numbers; use tokenmark_recommend or tokenmark_configs for tok/s.",
    inputSchema: { type: "object", properties: { platform: { type: "string", description: 'id or name, e.g. "gorgon-halo", "Gorgon Halo", "Ryzen AI Max+ 395", "GMKtec EVO-X5 Pro", "Mac Ultra"' } } }
  },
  {
    name: "tokenmark_search",
    description: "Search the tracker for models/configs matching a term (model name, quant, backend, author).",
    inputSchema: { type: "object", properties: { term: { type: "string" } }, required: ["term"] }
  }
];
async function callTool(name, args = {}) {
  if (name === "tokenmark_submit") {
    const res = await fetch(`${BASE}/api/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo: args.repo, source: args.source, note: args.note, via: "mcp" }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || `submit failed (${res.status})`);
    return JSON.stringify({ ...j, next: `poll tokenmark_submission_status with id ${j.id}; a human reviews extracted configs before they go live` }, null, 2);
  }
  if (name === "tokenmark_submission_status") {
    const res = await fetch(`${BASE}/api/submit/${encodeURIComponent(String(args.id || ""))}`);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || `status failed (${res.status})`);
    return JSON.stringify(j, null, 2);
  }
  if (name === "tokenmark_hardware") {
    const [doc, snap] = await Promise.all([hardwareDoc(), summary().catch(() => ({ configs: [] }))]);
    if (!args.platform) return JSON.stringify({ catalogue_generated: doc.generated || null, platforms: platformList(doc, snap.configs, BASE), details: "call again with platform" }, null, 2);
    const p = findPlatform(doc, args.platform);
    if (!p) throw new Error(`no platform matches "${args.platform}"; catalogue: ${Object.keys(doc.platforms || {}).join(", ")}. Missing hardware can be suggested (signed in) at ${SUBMIT_URL}`);
    return JSON.stringify(platformDetail(doc, p, snap.configs, BASE), null, 2);
  }
  const s = await summary();
  if (name === "tokenmark_recommend") {
    const recs = recommend(s.configs, {
      hardware: args.hardware,
      tasks: Array.isArray(args.tasks) ? args.tasks : [],
      prefer: args.prefer || "balanced",
      limit: Math.min(10, args.limit || 5)
    });
    if (!recs.length) {
      const p = args.hardware && findPlatform(await hardwareDoc().catch(() => null), args.hardware);
      return `No tracked configs match "${args.hardware}" yet.${p ? ` ${p.silicon} is in the catalogue (tokenmark_hardware with platform "${p.slug}"); a measured run can be submitted at ${SUBMIT_URL}.` : ""}`;
    }
    return JSON.stringify({ query: args, generated: s.generated, recommendations: recs }, null, 2);
  }
  if (name === "tokenmark_configs") {
    let rows = s.configs;
    if (args.model) rows = rows.filter((c) => (c.model || "").toLowerCase().includes(args.model.toLowerCase()));
    if (args.hardware) rows = rows.filter((c) => matchesHardware(c, args.hardware));
    const matched = rows.length;
    rows = rows.sort((a, b) => (b.decode_tps || 0) - (a.decode_tps || 0)).slice(0, Math.min(50, args.limit || 25));
    return JSON.stringify({ matched, shown: rows.length, order: "fastest decode first", configs: rows.map((c) => ({ model: c.model, quant: c.quant, backend: c.backend, variant: c.variant, mode: c.mode || null, speculative: isSpeculative(c.mode), hardware: c.hardwareLabel || c.hardware, decode_tps: c.decode_tps, throughput_kind: c.throughput_kind, trust: c.trust, author: c.author, source: c.doc_url || c.url })) }, null, 2);
  }
  if (name === "tokenmark_search") {
    const t = String(args.term || "").toLowerCase();
    const rows = s.configs.filter((c) => JSON.stringify(c).toLowerCase().includes(t));
    return JSON.stringify({ term: t, models: [...new Set(rows.map((c) => c.model))].slice(0, 40), matches: rows.length }, null, 2);
  }
  throw new Error(`unknown tool: ${name}`);
}
var send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
var reply = (id, result) => send({ jsonrpc: "2.0", id, result });
var fail = (id, code, message) => send({ jsonrpc: "2.0", id, error: { code, message } });
async function handle(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    return reply(id, { protocolVersion: PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: "tokenmark", version: VERSION } });
  }
  if (method === "tools/list") return reply(id, { tools: TOOLS });
  if (method === "tools/call") {
    try {
      const text = await callTool(params?.name, params?.arguments || {});
      return reply(id, { content: [{ type: "text", text }] });
    } catch (e) {
      return reply(id, { content: [{ type: "text", text: `error: ${e.message}` }], isError: true });
    }
  }
  if (method === "ping") return reply(id, {});
  if (id != null) fail(id, -32601, `method not found: ${method}`);
}
var buf = "";
var pending = 0;
var ended = false;
var track = (p) => {
  pending++;
  return p.finally(() => {
    pending--;
    if (ended && pending === 0) process.exit(0);
  });
};
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    track(handle(msg).catch((e) => {
      if (msg?.id != null) fail(msg.id, -32603, e.message);
    }));
  }
});
process.stdin.on("end", () => {
  ended = true;
  if (pending === 0) process.exit(0);
});
