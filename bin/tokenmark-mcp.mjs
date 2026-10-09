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
var BACKENDS = {
  // ik_llama.cpp BEFORE llama.cpp: normalizeBackend takes the first alias hit and
  // "ik_llama.cpp" contains "llama.cpp".
  "ik_llama.cpp": { label: "ik_llama.cpp", aliases: ["ik_llama.cpp", "ik_llama", "ik-llama", "ikllama"] },
  "llama.cpp": { label: "llama.cpp", aliases: ["llama.cpp", "llamacpp", "llama-server", "llama server", "llama-bench", "ggml"] },
  "vllm": { label: "vLLM", aliases: ["vllm"] },
  "mlx": { label: "MLX", aliases: ["mlx", "mlx-lm", "mlx_lm"] },
  "ollama": { label: "Ollama", aliases: ["ollama"] },
  "sglang": { label: "SGLang", aliases: ["sglang"] },
  "ktransformers": { label: "KTransformers", aliases: ["ktransformers"] },
  "exllamav2": { label: "ExLlamaV2", aliases: ["exllamav2", "exllama2", "exl2"] },
  "exllamav3": { label: "ExLlamaV3", aliases: ["exllamav3", "exllama3", "exl3"] },
  "tensorrt-llm": { label: "TensorRT-LLM", aliases: ["tensorrt-llm", "trt-llm", "tensorrt llm"] }
};
var BACKEND_VARIANTS = ["vulkan", "rocm", "hip", "cuda", "cpu", "metal", "sycl", "turboquant"];
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
function quantFromFilename(name) {
  if (!name) return null;
  const upper = name.toUpperCase();
  let best = null;
  for (const [key, val2] of QUANT_LOOKUP) {
    if (upper.includes(key) && (!best || key.length > best.key.length)) {
      best = { key, val: val2 };
    }
  }
  return best ? best.val : null;
}
function cleanModelName(name = "") {
  let n = String(name).trim();
  if (!n) return name;
  if (n.includes("/")) n = n.split("/").pop();
  n = n.replace(/\.(gguf|safetensors|bin)$/i, "");
  n = n.replace(/[-_.]?\d{5}-of-\d{5}$/i, "");
  n = n.replace(/[-_.](GGUF|MLX|GPTQ|AWQ|NVFP4)$/i, "");
  const TAIL = /[-_.](dgx[-_ ]?spark|strix[-_ ]?halo|dual|2x|4x|1m[-_]recipe|recipe|ubuntu|vulkan|rocm|metal|cuda|mlx[-_]?\d?bit|\d[-_]?bit|fp8|bf16|fp16|fp4|nvfp4|mxfp4|int4|int8|awq|gptq|gguf|mlx|q\d(?:_k(?:_[smlx]{1,2})?|_\d)?|iq\d_[a-z]+|ud)$/i;
  for (let guard = 0; guard < 8 && TAIL.test(n); guard++) n = n.replace(TAIL, "");
  n = n.replace(/[-_.\s]+$/, "").trim();
  return n || String(name).trim();
}

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

// tracker/lib/model-match.js
function modelKey(name) {
  return String(name ?? "").toLowerCase().replace(/(\d)\.(?=\d)/g, "$1").replace(/[^a-z0-9\u0001]/g, "").replace(/\u0001/g, ".");
}
function modelMatches(name, query) {
  const q = modelKey(query);
  return q.length > 0 && modelKey(name).includes(q);
}
function configMatches(config, term) {
  const t = String(term ?? "").trim().toLowerCase();
  if (!t) return false;
  return modelMatches(config?.model, t) || JSON.stringify(config ?? {}).toLowerCase().includes(t);
}

// tracker/lib/cli-client.js
import { mkdirSync, readFileSync, writeFileSync, renameSync, chmodSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

// tracker/lib/submit.js
var str = (body, k, max) => String(body?.[k] ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max);
var numIn = (x, lo, hi, { int = false } = {}) => {
  if (x == null || String(x).trim() === "") return { none: true };
  const n = Number(String(x).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < lo || n > hi || int && !Number.isInteger(n)) return { bad: true };
  return { n };
};
var URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i;
var SPEC_MODES = ["mtp", "draft", "eagle", "dflash"];
function normalizeResultSubmission(body = {}) {
  if (String(body?.website || "").trim()) return { error: "spam" };
  const model = str(body, "model", 120);
  if (model.length < 2) return { error: "the model is required (e.g. Qwen3.8-35B-A3B)" };
  const quant = str(body, "quant", 40);
  if (!quant) return { error: "the quant is required (e.g. Q4_K_M, MLX-4bit, NVFP4)" };
  const hardware = str(body, "hardware", 40).toLowerCase();
  const hardware_other = str(body, "hardware_other", 120);
  if (hardware === "other") {
    if (hardware_other.length < 2) return { error: "name the hardware you ran it on" };
  } else if (!HARDWARE[hardware]) return { error: "pick the hardware you ran it on" };
  const backend = str(body, "backend", 40).toLowerCase();
  const backend_other = str(body, "backend_other", 60);
  if (backend === "other") {
    if (backend_other.length < 2) return { error: "name the backend / runtime" };
  } else if (!BACKENDS[backend]) return { error: "pick the backend / runtime" };
  const variant = str(body, "variant", 20).toLowerCase();
  if (variant && !BACKEND_VARIANTS.includes(variant)) return { error: "unknown backend variant" };
  const mode = str(body, "mode", 20).toLowerCase();
  if (mode && !SPEC_MODES.includes(mode)) return { error: "unknown speculative-decoding mode" };
  const decode = numIn(body?.decode_tps, 0.1, 5e3);
  if (decode.none || decode.bad) return { error: "decode tok/s is required, a number between 0.1 and 5000" };
  const prefill = numIn(body?.prefill_tps, 0.1, 2e5);
  if (prefill.bad) return { error: "prefill tok/s must be a number between 0.1 and 200000" };
  const ctx = numIn(body?.ctx, 128, 4194304, { int: true });
  if (ctx.bad) return { error: "context length must be a whole number of tokens (128 to 4194304)" };
  const conc = numIn(body?.concurrency, 1, 512, { int: true });
  if (conc.bad) return { error: "concurrent requests must be a whole number from 1 to 512" };
  const ram = numIn(body?.ram_gb, 4, 4096);
  if (ram.bad) return { error: "memory must be a number of GB (4 to 4096)" };
  const proof_url = str(body, "proof_url", 500);
  if (proof_url && !URL_RE.test(proof_url)) return { error: "the proof link must be a full http(s) URL" };
  const credit = str(body, "credit", 40).replace(/^@/, "");
  if (credit && !/^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,38})$/.test(credit)) return { error: "the credit handle can use letters, digits, - _ . only" };
  const command = String(body?.command ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, 2e3);
  return {
    value: {
      model,
      quant,
      hardware,
      hardware_other: hardware === "other" ? hardware_other : null,
      device: str(body, "device", 120) || null,
      ram_gb: ram.n ?? null,
      backend,
      backend_other: backend === "other" ? backend_other : null,
      variant: variant || null,
      backend_version: str(body, "backend_version", 60) || null,
      mode: mode || null,
      decode_tps: decode.n,
      prefill_tps: prefill.n ?? null,
      ctx: ctx.n ?? null,
      concurrency: conc.n ?? 1,
      command: command || null,
      proof_url: proof_url || null,
      note: str(body, "note", 500) || null,
      credit: credit || null
    }
  };
}

// tracker/lib/bench-parse.js
var round2 = (n) => Math.round(n * 100) / 100;
var SIZE_SUFFIX = { Small: "S", Medium: "M", Large: "L" };
function quantFromFtype(modelType) {
  const t = String(modelType || "").replace(/\(guessed\)\s*/i, "").replace(/\bmostly\s+/i, "");
  let m = t.match(/\b(Q\d)_K - (Small|Medium|Large)\b/);
  if (m) return m[1] === "Q2" && m[2] === "Medium" ? "Q2_K" : `${m[1]}_K_${SIZE_SUFFIX[m[2]]}`;
  if (/\bIQ3_S mix\b/.test(t)) return "IQ3_M";
  m = t.match(/\b(IQ\d_(?:XXS|XS|NL|S|M)|TQ\d_0|Q\d_K|Q\d_\d|NVFP4|BF16|F16)\b/);
  if (m) return m[1];
  if (/\bMXFP4\b/.test(t)) return "MXFP4";
  if (/\ball F32\b/.test(t)) return "F32";
  return null;
}
var RESULT_KEYS = /* @__PURE__ */ new Set(["n_prompt", "n_gen", "n_depth", "test_time", "avg_ns", "stddev_ns", "avg_ts", "stddev_ts", "samples_ns", "samples_ts", "test", "t/s"]);
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
function llamaBenchRecords(text) {
  const s = text.trim();
  let open = s.search(/^\[\s*$/m);
  if (open < 0) open = s.search(/^\[\s*\{/m);
  if (open >= 0) {
    try {
      const a = JSON.parse(s.slice(open, s.lastIndexOf("]") + 1));
      if (Array.isArray(a) && a.some((r) => r && "avg_ts" in r)) return { format: "json", rows: a };
    } catch {
    }
  }
  const lines = s.split(/\r?\n/);
  const jsonl = lines.filter((l) => l.trim().startsWith("{")).map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter((r) => r && "avg_ts" in r);
  if (jsonl.length) return { format: "jsonl", rows: jsonl };
  const hi = lines.findIndex((l) => /(^|,)"?build_commit"?(,|$)/.test(l) && l.includes("avg_ts"));
  if (hi >= 0) {
    const head = splitCsvLine(lines[hi].trim());
    const rows = lines.slice(hi + 1).filter((l) => l.trim()).map((l) => {
      const v = splitCsvLine(l.trim());
      const o = {};
      head.forEach((h, i) => {
        o[h] = v[i];
      });
      return o;
    }).filter((o) => o.avg_ts != null && o.avg_ts !== "");
    if (rows.length) return { format: "csv", rows };
  }
  const th = lines.findIndex((l) => /^\s*\|.*\btest\b.*\|\s*t\/s\s*\|\s*$/.test(l));
  if (th >= 0) {
    const cells = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    const head = cells(lines[th]);
    const rows = [];
    for (let i = th + 1; i < lines.length; i++) {
      const l = lines[i];
      if (!/^\s*\|/.test(l)) break;
      if (/^\s*\|[\s:|-]+\|\s*$/.test(l)) continue;
      const v = cells(l);
      const o = {};
      head.forEach((h, j) => {
        o[h] = v[j];
      });
      const tm = String(o.test || "").match(/^(pp|tg)\s*(\d+)(?:\+tg(\d+))?(?:\s*@\s*d(\d+))?$/);
      if (!tm) continue;
      const ts = parseFloat(String(o["t/s"] || "").replace(/,/g, ""));
      if (!Number.isFinite(ts)) continue;
      const combined = tm[3] != null;
      o.n_prompt = tm[1] === "pp" ? Number(tm[2]) : 0;
      o.n_gen = tm[1] === "tg" ? Number(tm[2]) : combined ? Number(tm[3]) : 0;
      o.n_depth = tm[4] != null ? Number(tm[4]) : 0;
      o.avg_ts = ts;
      o.model_type = o.model;
      o.backends = o.backend;
      rows.push(o);
    }
    const foot = s.match(/^build:\s*([0-9a-f]{6,40})\s*\((\d+)\)\s*$/m);
    if (rows.length) {
      if (foot) rows.forEach((r) => {
        r.build_commit = foot[1];
        r.build_number = foot[2];
      });
      return { format: "markdown", rows };
    }
  }
  return null;
}
function setupKey(r) {
  return Object.keys(r).filter((k) => !RESULT_KEYS.has(k) && k !== "model" && k !== "backend").sort().map((k) => `${k}=${typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k]}`).join("|");
}
function parseLlamaBench(text, { pick } = {}) {
  const rec = llamaBenchRecords(text);
  if (!rec) return null;
  const rows = rec.rows.map((r) => ({ ...r, n_prompt: Number(r.n_prompt || 0), n_gen: Number(r.n_gen || 0), n_depth: Number(r.n_depth || 0), avg_ts: Number(r.avg_ts) })).filter((r) => Number.isFinite(r.avg_ts) && r.avg_ts > 0);
  const flat = rows.filter((r) => r.n_depth === 0);
  const groups = /* @__PURE__ */ new Map();
  for (const r of flat) {
    const k = setupKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const setups = [...groups.values()].filter((g2) => g2.some((r) => r.n_gen > 0 && r.n_prompt === 0));
  if (!setups.length) return { error: "no text-generation (tg) test found in the llama-bench output. Run it with -n 128 (the default) so there is a decode speed to submit", tool: "llama-bench" };
  const keysOf = (g2) => Object.fromEntries(setupKey(g2[0]).split("|").map((kv) => {
    const i = kv.indexOf("=");
    return [kv.slice(0, i), kv.slice(i + 1)];
  }));
  const all = setups.map(keysOf);
  const differs = Object.keys(all[0]).filter((k) => all.some((o) => o[k] !== all[0][k]));
  const describe = setups.map((g2, i) => {
    const tg2 = g2.find((r) => r.n_gen > 0 && r.n_prompt === 0);
    return `${i + 1}. ${g2[0].model_type || g2[0].model_filename || "model ?"}${differs.length ? ` (${differs.map((k) => `${k}=${all[i][k]}`).join(", ")})` : ""}: tg${tg2.n_gen} ${round2(tg2.avg_ts)} tok/s`;
  });
  let g;
  if (pick != null) {
    const n = Number(pick);
    if (!Number.isInteger(n) || n < 1 || n > setups.length) return { error: `--pick must be 1 to ${setups.length}`, setups: describe, tool: "llama-bench" };
    g = setups[n - 1];
  } else if (setups.length > 1) {
    return { error: `the llama-bench output has ${setups.length} different setups; choose one with --pick N`, setups: describe, tool: "llama-bench" };
  } else g = setups[0];
  const notes = [];
  const tgs = g.filter((r) => r.n_gen > 0 && r.n_prompt === 0);
  const tg = tgs.find((r) => r.n_gen === 128) || tgs[0];
  if (tgs.length > 1) notes.push(`decode from tg${tg.n_gen} (the output also has ${tgs.filter((r) => r !== tg).map((r) => `tg${r.n_gen}`).join(", ")})`);
  const pps = g.filter((r) => r.n_prompt > 0 && r.n_gen === 0);
  const pp = pps.find((r) => r.n_prompt === 512) || pps[0];
  if (pp && pps.length > 1) notes.push(`prefill from pp${pp.n_prompt}`);
  if (rows.length > flat.length) notes.push("rows run at a filled context (@ dN) were left out");
  const r0 = g[0];
  const file = r0.model_filename ? String(r0.model_filename).split(/[\\/]/).pop() : "";
  const model = file ? cleanModelName(file) : null;
  let quant = file ? quantFromFilename(file)?.canonical || null : null;
  if (!quant) {
    quant = quantFromFtype(r0.model_type);
    if (quant) notes.push(`quant read from the GGUF type (${quant}); an Unsloth UD or mixed file reports its base type, pass --quant if yours differs`);
  }
  if (!model) notes.push("llama-bench's table does not name the model file; pass --model (or use llama-bench -o json, which does)");
  const backends = String(r0.backends || r0.backend || "").toLowerCase();
  const variant = BACKEND_VARIANTS.find((v) => backends.split(/[,\s]+/).includes(v)) || null;
  const hint = normalizeHardware(`${r0.gpu_info || ""} ${r0.cpu_info || ""}`);
  return {
    tool: "llama-bench",
    format: rec.format,
    fields: {
      model,
      quant,
      backend: "llama.cpp",
      variant,
      backend_version: r0.build_number ? `b${r0.build_number}${r0.build_commit ? ` (${r0.build_commit})` : ""}` : r0.build_commit || null,
      decode_tps: round2(tg.avg_ts),
      prefill_tps: pp ? round2(pp.avg_ts) : null,
      concurrency: 1,
      hardware_hint: hint
    },
    notes,
    setups: describe
  };
}
function parseVllm(text) {
  if (!/Serving Benchmark Result/i.test(text)) return null;
  const num = (re) => {
    const m2 = text.match(re);
    return m2 ? parseFloat(m2[1]) : null;
  };
  const conc = num(/Maximum request concurrency:\s*(\d+)/i);
  const tpot = num(/Mean TPOT \(ms\):\s*([\d.]+)/i);
  const out = num(/Output token throughput \(tok\/s\):\s*([\d.]+)/i);
  const m = text.match(/\bmodel\s*=\s*['"]([^'"]+)['"]/) || text.match(/--model[= ]+([^\s'"]+)/);
  const model = m ? cleanModelName(m[1]) : null;
  const quant = m ? quantFromFilename(m[1])?.canonical || null : null;
  const notes = [];
  if (!model) notes.push("the output does not name the model; pass --model");
  if (!quant) notes.push("vllm does not print the quant; pass --quant");
  if (conc == null) {
    return { error: "this vllm run had no --max-concurrency, so every request ran at once and the speed is an aggregate. Re-run with --max-concurrency 1 for single-stream decode, or pass --concurrency N with --decode", tool: "vllm" };
  }
  let decode;
  if (conc === 1) {
    if (!(tpot > 0)) return { error: "no Mean TPOT in the vllm output, so there is no decode speed to read", tool: "vllm" };
    decode = round2(1e3 / tpot);
    notes.push(`single-stream decode = 1000 / mean TPOT (${tpot} ms)`);
  } else {
    if (!(out > 0)) return { error: "no output token throughput in the vllm output", tool: "vllm" };
    decode = round2(out);
    notes.push(`aggregate output throughput across ${conc} concurrent requests, not a single-stream speed`);
  }
  return {
    tool: "vllm",
    format: "serve",
    fields: { model, quant, backend: "vllm", variant: null, backend_version: null, decode_tps: decode, prefill_tps: null, concurrency: conc, hardware_hint: null },
    notes,
    setups: []
  };
}
function parseBench(text, opts = {}) {
  const s = String(text ?? "");
  if (!s.trim()) return { error: "the benchmark output is empty" };
  return parseLlamaBench(s, opts) || parseVllm(s) || { error: "could not read this as llama-bench or vllm bench serve output; pass the numbers as flags instead (--decode, --model, --quant)" };
}

// tracker/lib/cli-client.js
var LOGIN_HINT = "run: npx @altronis/tokenmark-cli login";
function configDir(env = process.env, home = homedir()) {
  if (env.TOKENMARK_CONFIG_DIR) return env.TOKENMARK_CONFIG_DIR;
  return join(env.XDG_CONFIG_HOME || join(home, ".config"), "tokenmark");
}
var credentialsPath = (env, home) => join(configDir(env, home), "credentials.json");
var BadCredentialsFile = class extends Error {
  constructor(path, cause) {
    super(`cannot read ${path} (${cause.code || cause.message}). Fix or move it, then run tokenmark login`);
    this.path = path;
  }
};
function loadCredentials(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return {};
    throw new BadCredentialsFile(path, e);
  }
  let j;
  try {
    j = JSON.parse(text);
  } catch (e) {
    throw new BadCredentialsFile(path, { message: "not valid JSON" });
  }
  if (!j || typeof j !== "object" || Array.isArray(j)) throw new BadCredentialsFile(path, { message: "not a JSON object" });
  return j;
}
function tokenSafeBase(base) {
  let u;
  try {
    u = new URL(base);
  } catch {
    return false;
  }
  return u.protocol === "https:" || u.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname);
}
var REQUEST_TIMEOUT_MS = 3e4;
function tokenFor({ env = process.env, all = {}, base, now = Date.now() }) {
  if (env.TOKENMARK_TOKEN) return { token: env.TOKENMARK_TOKEN.trim(), from: "env" };
  const rec = (typeof all === "function" ? all() : all)[base];
  if (!rec?.token) return { token: null, from: null };
  if (rec.expires_at && now >= Date.parse(rec.expires_at)) return { token: null, from: "expired", rec };
  return { token: rec.token, from: "saved", rec };
}
function resolveHardware(text) {
  const t = String(text ?? "").trim();
  if (!t) return null;
  if (HARDWARE[t.toLowerCase()]) return { hardware: t.toLowerCase(), hardware_other: null };
  const slug = normalizeHardware(t);
  return slug ? { hardware: slug, hardware_other: null } : { hardware: "other", hardware_other: t };
}
function resolveBackend(text) {
  const t = String(text ?? "").trim();
  if (!t) return null;
  const k = t.toLowerCase();
  if (BACKENDS[k]) return { backend: k, backend_other: null };
  const hit = Object.entries(BACKENDS).find(([, b]) => String(b.label || "").toLowerCase() === k);
  return hit ? { backend: hit[0], backend_other: null } : { backend: "other", backend_other: t };
}
function buildResult({ fields = {}, benchText = null, pick = null, via = "cli" } = {}) {
  const notes = [];
  let parsed = null;
  if (benchText != null) {
    parsed = parseBench(benchText, { pick });
    if (parsed.error) {
      const typed = buildResult({ fields, pick, via });
      if (typed.error) return { error: parsed.error, setups: parsed.setups };
      typed.notes.unshift(`the benchmark output was not used (${parsed.error.split("\n")[0]}); sending the fields you typed`);
      return typed;
    }
    notes.push(...parsed.notes);
  }
  const p = parsed?.fields || {};
  const pickv = (k, pk = k) => fields[k] != null && fields[k] !== "" ? fields[k] : p[pk] ?? null;
  let hw = resolveHardware(fields.hardware);
  if (!hw && p.hardware_hint) {
    hw = { hardware: p.hardware_hint, hardware_other: null };
    notes.push(`hardware read from the benchmark's GPU/CPU name (${p.hardware_hint}); pass --hardware if that is wrong`);
  }
  const be = resolveBackend(fields.backend) || resolveBackend(p.backend);
  const body = {
    model: pickv("model"),
    quant: pickv("quant"),
    hardware: hw?.hardware ?? null,
    hardware_other: hw?.hardware_other ?? null,
    device: fields.device ?? null,
    ram_gb: fields.ram_gb ?? null,
    backend: be?.backend ?? null,
    backend_other: be?.backend_other ?? null,
    variant: pickv("variant"),
    backend_version: pickv("backend_version"),
    mode: fields.mode ?? null,
    decode_tps: pickv("decode_tps"),
    prefill_tps: pickv("prefill_tps"),
    ctx: fields.ctx ?? null,
    concurrency: pickv("concurrency"),
    command: fields.command ?? null,
    proof_url: fields.proof_url ?? null,
    note: fields.note ?? null,
    credit: fields.credit ?? null,
    via
  };
  for (const k of Object.keys(body)) if (body[k] == null || body[k] === "") delete body[k];
  if (!body.hardware) return { error: 'which hardware did you run it on? pass --hardware (e.g. "Strix Halo", "DGX Spark", or any device name)' };
  const v = normalizeResultSubmission(body);
  if (v.error) return { error: v.error };
  return { body, notes, parsed, value: v.value };
}
function describeResult(v) {
  const hw = v.hardware === "other" ? v.hardware_other : v.hardware;
  const be = v.backend === "other" ? v.backend_other : v.backend;
  const extra = [
    v.prefill_tps != null ? `prefill ${v.prefill_tps} tok/s` : null,
    v.ctx ? `ctx ${v.ctx}` : null,
    v.concurrency > 1 ? `${v.concurrency} concurrent` : null,
    v.mode ? `spec ${v.mode}` : null
  ].filter(Boolean);
  return `${v.model} \xB7 ${v.quant} \xB7 ${hw}${v.device ? ` (${v.device})` : ""} \xB7 ${be}${v.variant ? ` ${v.variant}` : ""} \u2192 ${v.decode_tps} tok/s${extra.length ? ` \xB7 ${extra.join(" \xB7 ")}` : ""}`;
}
var confirmCode = (body) => createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 10);
async function sendResult({ base, token, body, fetchFn = fetch, userAgent, timeoutMs = REQUEST_TIMEOUT_MS }) {
  if (!tokenSafeBase(base)) throw new Error(`not sending a sign-in to ${base}: it must be https (or http on this machine)`);
  const r = await fetchFn(`${base}/api/submit-result`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...userAgent ? { "User-Agent": userAgent } : {} },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

// tracker/mcp/tokenmark-mcp.mjs
var BASE = (process.env.TOKENMARK_URL || "https://tokenmark.app").replace(/\/$/, "");
var PROTOCOL = "2024-11-05";
var VERSION = true ? "0.3.0" : "dev";
var SUBMIT_URL = `${BASE}/submit`;
var get = (path) => fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
var cache = null;
var cacheAt = 0;
async function summary() {
  if (cache && Date.now() - cacheAt < 3e5) return cache;
  const res = await get("/tracker-summary.json");
  if (!res.ok) throw new Error(`tracker-summary ${res.status}`);
  cache = await res.json();
  cacheAt = Date.now();
  return cache;
}
var hwCache = null;
var hwAt = 0;
async function hardwareDoc() {
  if (hwCache && Date.now() - hwAt < 3e5) return hwCache;
  const res = await get("/hardware.json");
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
    description: "Submit a GitHub or Hugging Face repo whose README/model card contains local-LLM benchmark numbers (tok/s on Strix Halo, DGX Spark, Mac, etc.) to TokenMark. Configs are extracted on the tracker, then a human reviews before anything goes live. Returns a submission id to poll with tokenmark_submission_status. A speed the user measured themselves (no repo) goes through tokenmark_submit_result; hardware the catalogue is missing goes through the signed-in form at https://tokenmark.app/submit.",
    inputSchema: { type: "object", properties: { repo: { type: "string", description: "https://github.com/owner/name, https://huggingface.co/owner/name, or owner/name" }, source: { type: "string", enum: ["gh", "hf"], description: "only needed for a bare owner/name that is on Hugging Face" }, note: { type: "string", description: "optional context for the reviewer (hardware, backend build, how it was measured)" } }, required: ["repo"] }
  },
  {
    name: "tokenmark_submit_result",
    description: "Send a local-LLM speed the user measured themselves to TokenMark's review queue, under their account. Pass raw llama-bench output (-o json, jsonl, csv or the markdown table) or vllm bench serve output as bench_output and it is read directly; typed fields override what it says. Needs a one-time sign-in on this machine: the user runs `npx @altronis/tokenmark-cli login` in a terminal and approves the code in their browser (or TOKENMARK_TOKEN is set). Call it with dry_run=true first: that returns a one-line summary and a confirm code. Show the user the summary and get their ok, then call again with the same fields and confirm set to that code; sending without it is refused. Never send a number the user did not measure. A person reviews every result before it goes live. Returns a submission id for tokenmark_submission_status.",
    inputSchema: {
      type: "object",
      properties: {
        bench_output: { type: "string", description: "raw stdout of llama-bench or vllm bench serve" },
        pick: { type: "number", description: "which setup to send when bench_output has more than one (1-based; the error lists them)" },
        model: { type: "string", description: "e.g. Qwen3.8-27B" },
        quant: { type: "string", description: "e.g. Q4_K_M, UD-Q4_K_XL" },
        hardware: { type: "string", description: 'e.g. "Strix Halo", "DGX Spark", "strix-halo", or any device name (kept as other)' },
        backend: { type: "string", description: "e.g. llama.cpp, vllm, mlx, ollama" },
        variant: { type: "string", description: "e.g. vulkan, rocm, cuda" },
        backend_version: { type: "string" },
        mode: { type: "string", description: "speculative-decoding mode, if used" },
        decode_tps: { type: "number", description: "decode tokens/s (0.1-5000)" },
        prefill_tps: { type: "number" },
        ctx: { type: "number", description: "context length in tokens" },
        concurrency: { type: "number" },
        device: { type: "string", description: "the exact box, e.g. an OEM model" },
        ram_gb: { type: "number" },
        command: { type: "string", description: "the exact command that was run" },
        proof_url: { type: "string" },
        note: { type: "string" },
        credit: { type: "string", description: "handle to credit" },
        dry_run: { type: "boolean", description: "true: check and summarise without sending; returns the confirm code" },
        confirm: { type: "string", description: "the confirm code from the dry run, once the user has said the summary is right" }
      }
    }
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
    const res = await fetch(`${BASE}/api/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo: args.repo, source: args.source, note: args.note, via: "mcp" }), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || `submit failed (${res.status})`);
    return JSON.stringify({ ...j, next: `poll tokenmark_submission_status with id ${j.id}; a human reviews extracted configs before they go live` }, null, 2);
  }
  if (name === "tokenmark_submit_result") {
    const FIELDS = ["model", "quant", "hardware", "backend", "variant", "backend_version", "mode", "decode_tps", "prefill_tps", "ctx", "concurrency", "device", "ram_gb", "command", "proof_url", "note", "credit"];
    const fields = Object.fromEntries(FIELDS.filter((k) => args[k] != null && args[k] !== "").map((k) => [k, args[k]]));
    const benchText = typeof args.bench_output === "string" && args.bench_output.trim() ? args.bench_output : null;
    const b = buildResult({ fields, benchText, pick: args.pick ?? null, via: "mcp" });
    if (b.error) throw new Error(`${b.error}${b.setups?.length ? `
${b.setups.join("\n")}` : ""}`);
    const summary2 = describeResult(b.value);
    const code = confirmCode(b.body);
    if (args.dry_run) return JSON.stringify({ sent: false, summary: summary2, notes: b.notes, body: b.body, confirm: code, next: `show the summary to the user; once they say it is right, call again with the same fields, no dry_run, and confirm: "${code}"` }, null, 2);
    if (!args.confirm) throw new Error("call with dry_run: true first, show the user the summary, then send with the confirm code it returns");
    if (String(args.confirm) !== code) throw new Error("confirm does not match these fields (they changed since the dry run). Run the dry run again and show the user the new summary");
    const t = tokenFor({ all: () => loadCredentials(credentialsPath()), base: BASE });
    if (!t.token) throw new Error(`${t.from === "expired" ? "the TokenMark sign-in on this machine has expired" : "not signed in to TokenMark on this machine"}. Ask the user to ${LOGIN_HINT} in a terminal and approve the code in their browser, then try again`);
    const r = await sendResult({ base: BASE, token: t.token, body: b.body, userAgent: `tokenmark-mcp/${VERSION}` });
    if (!r.ok) throw new Error(r.j.error || `submit failed (${r.status})`);
    return JSON.stringify({ sent: true, summary: summary2, notes: b.notes, id: r.j.id, status: r.j.status, already_open: !!r.j.already_open, next: `poll tokenmark_submission_status with id ${r.j.id}; a person reviews it before it goes live` }, null, 2);
  }
  if (name === "tokenmark_submission_status") {
    const res = await get(`/api/submit/${encodeURIComponent(String(args.id || ""))}`);
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
    if (args.model) rows = rows.filter((c) => modelMatches(c.model, args.model));
    if (args.hardware) rows = rows.filter((c) => matchesHardware(c, args.hardware));
    const matched = rows.length;
    rows = rows.sort((a, b) => (b.decode_tps || 0) - (a.decode_tps || 0)).slice(0, Math.min(50, args.limit || 25));
    return JSON.stringify({ matched, shown: rows.length, order: "fastest decode first", configs: rows.map((c) => ({ model: c.model, quant: c.quant, backend: c.backend, variant: c.variant, mode: c.mode || null, speculative: isSpeculative(c.mode), hardware: c.hardwareLabel || c.hardware, decode_tps: c.decode_tps, throughput_kind: c.throughput_kind, trust: c.trust, author: c.author, source: c.doc_url || c.url })) }, null, 2);
  }
  if (name === "tokenmark_search") {
    const t = String(args.term || "").toLowerCase();
    const rows = s.configs.filter((c) => configMatches(c, t));
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
