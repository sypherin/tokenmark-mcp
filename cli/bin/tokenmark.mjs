#!/usr/bin/env node

// tracker/cli/tokenmark.mjs
import { spawn } from "node:child_process";
import { readFileSync as readFileSync2, fstatSync } from "node:fs";
import { parseArgs } from "node:util";

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
  const hardware2 = str(body, "hardware", 40).toLowerCase();
  const hardware_other = str(body, "hardware_other", 120);
  if (hardware2 === "other") {
    if (hardware_other.length < 2) return { error: "name the hardware you ran it on" };
  } else if (!HARDWARE[hardware2]) return { error: "pick the hardware you ran it on" };
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
      hardware: hardware2,
      hardware_other: hardware2 === "other" ? hardware_other : null,
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
function setAsideCredentials(path, now = Date.now()) {
  const to = `${path}.bad-${new Date(now).toISOString().replace(/[:.]/g, "-")}`;
  renameSync(path, to);
  return to;
}
function saveCredentials(path, all) {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true, mode: 448 });
  try {
    chmodSync(dir, 448);
  } catch {
  }
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(all, null, 2)}
`, { mode: 384 });
  chmodSync(tmp, 384);
  renameSync(tmp, path);
}
var withCredential = (all, base, rec) => ({ ...all, [base]: rec });
function withoutCredential(all, base) {
  const { [base]: _gone, ...rest } = all;
  return rest;
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
var safeText = (s, max = 500) => String(s ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").slice(0, max);
var REQUEST_TIMEOUT_MS = 3e4;
function tokenFor({ env = process.env, all = {}, base, now = Date.now() }) {
  if (env.TOKENMARK_TOKEN) return { token: env.TOKENMARK_TOKEN.trim(), from: "env" };
  const rec = (typeof all === "function" ? all() : all)[base];
  if (!rec?.token) return { token: null, from: null };
  if (rec.expires_at && now >= Date.parse(rec.expires_at)) return { token: null, from: "expired", rec };
  return { token: rec.token, from: "saved", rec };
}
async function pollForToken({ post, sleep, device_code, interval = 5, expires_in = 600, now = Date.now, onWait = () => {
} }) {
  const until = now() + expires_in * 1e3;
  let wait = interval;
  let dropped = false;
  while (now() < until) {
    await sleep(wait * 1e3);
    let reply;
    try {
      reply = await post("/api/cli/device-poll", { device_code });
    } catch {
      dropped = true;
      onWait();
      continue;
    }
    const { status, j } = reply;
    if (status === 200 && j.access_token) return { ok: true, token: j };
    const e = j?.error;
    if (e === "authorization_pending") {
      onWait();
      continue;
    }
    if (e === "slow_down") {
      wait = Math.max(wait + 5, Number(j.interval) || 0);
      continue;
    }
    if (e === "access_denied") return { ok: false, error: "the sign-in was denied in the browser" };
    if (e === "expired_token") return { ok: false, error: "the code expired before it was approved. Run tokenmark login again" };
    if (e === "invalid_grant") return { ok: false, error: dropped ? "the connection dropped as the sign-in finished. Run tokenmark login again (the unused sign-in can be revoked at /cli)" : "this sign-in was already used or is unknown. Run tokenmark login again" };
    return { ok: false, error: e ? safeText(e, 200) : `unexpected reply from the server (HTTP ${status})` };
  }
  return { ok: false, error: "the code expired before it was approved. Run tokenmark login again" };
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
  let parsed2 = null;
  if (benchText != null) {
    parsed2 = parseBench(benchText, { pick });
    if (parsed2.error) {
      const typed = buildResult({ fields, pick, via });
      if (typed.error) return { error: parsed2.error, setups: parsed2.setups };
      typed.notes.unshift(`the benchmark output was not used (${parsed2.error.split("\n")[0]}); sending the fields you typed`);
      return typed;
    }
    notes.push(...parsed2.notes);
  }
  const p = parsed2?.fields || {};
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
  return { body, notes, parsed: parsed2, value: v.value };
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

// tracker/lib/cli-auth.js
var USER_CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXZ";
function normalizeUserCode(input) {
  const s = String(input ?? "").toUpperCase().replace(/[\s-]/g, "");
  if (s.length !== 8) return null;
  for (const ch of s) if (!USER_CODE_ALPHABET.includes(ch)) return null;
  return s;
}
var looksLikeCliToken = (s) => /^tmk_[A-Za-z0-9_-]{43}$/.test(String(s ?? ""));

// tracker/cli/tokenmark.mjs
var VERSION = true ? "0.3.0" : "dev";
var BASE = (process.env.TOKENMARK_URL || "https://tokenmark.app").replace(/\/$/, "");
var UA = `tokenmark-cli/${VERSION}`;
var STRING_FLAGS = [
  "hardware",
  "tasks",
  "prefer",
  "limit",
  "model",
  "source",
  "note",
  "from",
  "pick",
  "quant",
  "backend",
  "variant",
  "backend-version",
  "mode",
  "decode",
  "prefill",
  "ctx",
  "concurrency",
  "device",
  "ram",
  "proof",
  "credit",
  "command"
];
var BOOL_FLAGS = ["dry-run", "no-browser", "force", "env", "help", "version"];
var parsed;
try {
  parsed = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    strict: true,
    options: Object.fromEntries([...STRING_FLAGS.map((k) => [k, { type: "string" }]), ...BOOL_FLAGS.map((k) => [k, { type: "boolean" }]), ["v", { type: "boolean", short: "v" }]])
  });
} catch (e) {
  console.error(`error: ${safeText(e.message.replace(/\. To specify a positional.*$/s, ""))}
run tokenmark help for the commands and flags`);
  process.exit(1);
}
var [cmd, ...positional] = parsed.positionals;
var flag = (name, def = null) => {
  const v = parsed.values[name];
  return v != null && v !== "" ? v : def;
};
var has = (name) => parsed.values[name] === true;
var paint = process.stdout.isTTY && !process.env.NO_COLOR ? (code) => (s) => `\x1B[${code}m${s}\x1B[0m` : () => (s) => s;
var C = { dim: paint(2), g: paint(32), b: paint(1), y: paint(33) };
async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
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

  login      [--no-browser]   sign in once by approving a short code at ${BASE}/cli
  whoami     who this terminal is signed in as
  logout     [--env] [--force]   revoke this terminal's sign-in (--env: also $TOKENMARK_TOKEN)
  submit-result  send a speed you measured (human-reviewed before going live)
             llama-bench -m model.gguf -o json | tokenmark submit-result --hardware "Strix Halo"
             tokenmark submit-result --from bench.json --hardware dgx-spark [--pick N]
             tokenmark submit-result --model Qwen3.8-27B --quant Q4_K_M --hardware strix-halo --backend llama.cpp --decode 72.4
             reads llama-bench (json, jsonl, csv, table) and vllm bench serve output; typed flags win.
             more: --prefill --ctx --concurrency --variant --backend-version --mode --device --ram
                   --proof <url> --note --credit <handle> --command "<how you ran it>" --dry-run

No terminal? Type a result in at ${SUBMIT_URL}
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
var COMMANDS = ["recommend", "configs", "search", "models", "hardware", "submit", "status", "login", "whoami", "logout", "submit-result", "version", "help"];
var CRED = credentialsPath();
var die = (msg) => {
  console.error(C.y(`error: ${safeText(msg, 2e3)}`));
  process.exit(1);
};
var needSafeBase = () => {
  if (!tokenSafeBase(BASE)) die(`${BASE} is not https: a sign-in is only sent over https (or http to this machine). Check $TOKENMARK_URL`);
};
var readCreds = () => {
  try {
    return loadCredentials(CRED);
  } catch (e) {
    if (e instanceof BadCredentialsFile) die(e.message);
    throw e;
  }
};
async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "User-Agent": UA, ...body ? { "Content-Type": "application/json" } : {}, ...token ? { Authorization: `Bearer ${token}` } : {} },
    body: body ? JSON.stringify(body) : void 0,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  return { ok: res.ok, status: res.status, j: await res.json().catch(() => ({})) };
}
function openBrowser(url) {
  const [bin, args] = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["rundll32", ["url.dll,FileProtocolHandler", url]] : ["xdg-open", [url]];
  try {
    const p = spawn(bin, args, { stdio: "ignore", detached: true });
    p.on("error", () => {
    });
    p.unref();
  } catch {
  }
}
async function login() {
  needSafeBase();
  let all;
  try {
    all = loadCredentials(CRED);
  } catch (e) {
    if (!(e instanceof BadCredentialsFile)) throw e;
    let moved;
    try {
      moved = setAsideCredentials(CRED);
    } catch (m) {
      die(`${e.message} (and it could not be moved aside: ${m.code || m.message})`);
    }
    console.error(C.y(`warning: ${e.path} was unreadable, so it was kept as ${moved} and a new one started`));
    all = {};
  }
  const s = await api("/api/cli/device-start", { method: "POST", body: { client: "tokenmark-cli", version: VERSION } });
  if (!s.ok) die(s.j.error || `could not start sign-in (HTTP ${s.status})`);
  const code = normalizeUserCode(s.j.user_code);
  if (!code || typeof s.j.device_code !== "string") die("the server sent a sign-in code this CLI does not recognise");
  const shown = `${code.slice(0, 4)}-${code.slice(4)}`;
  const url = `${BASE}/cli?code=${shown}`;
  const expires_in = Math.min(Number(s.j.expires_in) || 600, 3600);
  const interval = Math.min(Math.max(Number(s.j.interval) || 5, 0.1), 60);
  console.log(`
To sign in, open:
  ${url}
and check the code matches: ${C.b(shown)}
`);
  if (process.stdout.isTTY && !has("no-browser") && !process.env.CI) openBrowser(url);
  console.log(C.dim(`waiting for approval (the code expires in ${Math.round(expires_in / 60)} min, Ctrl+C to stop)`));
  const r = await pollForToken({
    post: (path, body) => api(path, { method: "POST", body }),
    sleep: (ms) => new Promise((ok) => setTimeout(ok, ms)),
    device_code: s.j.device_code,
    interval,
    expires_in
  });
  if (!r.ok) die(r.error);
  const t = r.token;
  if (!looksLikeCliToken(t.access_token)) die("the server sent a sign-in this CLI does not recognise");
  const days = Number(t.expires_in) > 0 ? Number(t.expires_in) / 86400 : 90;
  const me = await api("/api/cli/whoami", { token: t.access_token }).catch(() => null);
  const email = me?.ok ? safeText(me.j.email, 200) || null : null;
  const name = me?.ok ? safeText(me.j.name, 200) || null : null;
  try {
    saveCredentials(CRED, withCredential(all, BASE, {
      token: t.access_token,
      scope: safeText(t.scope, 40),
      email,
      name,
      expires_at: new Date(Date.now() + days * 864e5).toISOString(),
      saved_at: (/* @__PURE__ */ new Date()).toISOString()
    }));
  } catch (e) {
    const rv = await api("/api/cli/logout", { method: "POST", token: t.access_token }).catch(() => null);
    die(`could not save the sign-in to ${CRED} (${e.code || e.message}); ${rv?.ok ? "it was revoked on the server" : "it could not be revoked, end it at /cli"}. Fix the folder or set TOKENMARK_CONFIG_DIR, then run tokenmark login again`);
  }
  console.log(`${C.g("signed in")} as ${email || name || "your account"}. This sign-in can only send results for review, and lasts ${Math.round(days)} days.`);
  console.log(C.dim(`saved to ${CRED}`));
}
function currentToken() {
  needSafeBase();
  const t = tokenFor({ all: readCreds, base: BASE });
  if (!t.token) die(t.from === "expired" ? "your CLI sign-in has expired. Run tokenmark login" : "not signed in. Run tokenmark login first (once, in a browser)");
  return t;
}
async function whoami() {
  const t = currentToken();
  const r = await api("/api/cli/whoami", { token: t.token });
  if (!r.ok) die(r.j.error || `HTTP ${r.status}`);
  console.log(`${safeText(r.j.email || r.j.name || "signed in", 200)}  ${C.dim(`scope ${safeText(r.j.scope, 40)}, until ${safeText(r.j.expires_at, 10)}${t.from === "env" ? ", token from $TOKENMARK_TOKEN" : ""}`)}`);
}
async function revoke(token) {
  const r = await api("/api/cli/logout", { method: "POST", token }).catch((e) => ({ ok: false, status: 0, j: {}, e }));
  if (r.ok) return { ok: true, revoked: !!r.j.revoked };
  if (r.status === 401) return { ok: true, revoked: false };
  return { ok: false, why: r.status ? `HTTP ${r.status}${r.j.error ? `, ${r.j.error}` : ""}` : `the server could not be reached${r.e?.name === "TimeoutError" ? " (timed out)" : ""}` };
}
var said = (x) => x.revoked ? "revoked on the server" : "already revoked or expired on the server";
async function logout() {
  needSafeBase();
  const all = readCreds();
  const saved = all[BASE]?.token || null;
  const envTok = process.env.TOKENMARK_TOKEN?.trim() || null;
  const lines = [];
  if (saved) {
    const x = await revoke(saved);
    if (!x.ok && !has("force")) die(`could not revoke the saved sign-in (${x.why}). It is still saved, so run tokenmark logout again, or add --force to forget it on this machine only`);
    saveCredentials(CRED, withoutCredential(all, BASE));
    lines.push(x.ok ? `saved sign-in ${said(x)}, and removed from this machine` : `saved sign-in removed from this machine, NOT revoked (${x.why}); it stays valid until ${String(all[BASE].expires_at || "?").slice(0, 10)}`);
  }
  if (envTok && has("env")) {
    const x = await revoke(envTok);
    if (!x.ok) die(`could not revoke $TOKENMARK_TOKEN (${x.why})${lines.length ? `. Done so far: ${lines.join("; ")}` : ""}`);
    lines.push(`$TOKENMARK_TOKEN ${said(x)}; unset it in your shell too`);
  } else if (envTok) {
    lines.push("$TOKENMARK_TOKEN is set and was NOT revoked (add --env to revoke it too)");
  }
  if (!lines.length) lines.push("this machine was not signed in, nothing to revoke");
  console.log(`${C.g("signed out")}: ${lines.join(". ")}`);
}
async function benchInput() {
  const from = flag("from");
  const readStdin = async () => {
    const hint = setTimeout(() => console.error(C.dim("reading benchmark output from stdin (end it with Ctrl+D, or use --from <file>)")), 3e3);
    hint.unref();
    if (from === "-") clearTimeout(hint);
    let out = "";
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) out += chunk;
    clearTimeout(hint);
    return out;
  };
  if (from === "-") return readStdin();
  if (from) {
    try {
      return readFileSync2(from, "utf8");
    } catch (e) {
      die(`cannot read ${from}: ${e.code || e.message}`);
    }
  }
  if (flag("decode")) return null;
  try {
    const st = fstatSync(0);
    if (st.isFIFO() || st.isFile() || st.isSocket()) return readStdin();
  } catch {
  }
  return null;
}
async function submitResult() {
  const fields = {
    model: flag("model"),
    quant: flag("quant"),
    hardware: flag("hardware"),
    backend: flag("backend"),
    variant: flag("variant"),
    backend_version: flag("backend-version"),
    mode: flag("mode"),
    decode_tps: flag("decode"),
    prefill_tps: flag("prefill"),
    ctx: flag("ctx"),
    concurrency: flag("concurrency"),
    device: flag("device"),
    ram_gb: flag("ram"),
    proof_url: flag("proof"),
    note: flag("note"),
    credit: flag("credit"),
    command: flag("command")
  };
  const benchText = await benchInput();
  if (benchText == null && !fields.decode_tps) die("nothing to send. Pipe llama-bench output in, use --from <file>, or pass --decode <tok/s> with --model --quant --hardware --backend");
  const b = buildResult({ fields, benchText, pick: flag("pick"), via: "cli" });
  if (b.error) {
    console.error(C.y(`error: ${b.error}`));
    (b.setups || []).forEach((x) => console.error(`  ${x}`));
    process.exit(1);
  }
  b.notes.forEach((n) => console.log(C.dim(`note: ${n}`)));
  console.log(`result: ${describeResult(b.value)}`);
  if (has("dry-run")) {
    console.log(C.dim("dry run, nothing sent. This is the request body:"));
    console.log(JSON.stringify(b.body, null, 2));
    return;
  }
  const t = currentToken();
  const r = await sendResult({ base: BASE, token: t.token, body: b.body, userAgent: UA });
  if (!r.ok) die(r.j.error || `submit failed (HTTP ${r.status})`);
  const id = safeText(r.j.id, 80);
  console.log(`${C.g(r.j.already_open ? "already in the queue" : "queued for review")} ${id}`);
  console.log(C.dim(`status: tokenmark status ${id}   (a person reviews every result before it goes live)`));
}
(async () => {
  try {
    if (has("version") || has("v") || cmd === "version") return console.log(VERSION);
    if (!cmd || cmd === "help" || has("help")) return usage();
    if (!COMMANDS.includes(cmd)) {
      console.error(C.y(`error: unknown command "${safeText(cmd, 40)}"`));
      console.error("run tokenmark help for the commands");
      process.exit(1);
    }
    if (cmd === "hardware") return hardware(positional.join(" "));
    if (cmd === "login") return await login();
    if (cmd === "logout") return await logout();
    if (cmd === "whoami") return await whoami();
    if (cmd === "submit-result") return await submitResult();
    if (cmd === "submit") {
      const repo = positional[0];
      if (!repo) return console.log(C.y('usage: tokenmark submit <repo> [--note "\u2026"] [--source hf]'));
      const { ok, status, j } = await api("/api/submit", { method: "POST", body: { repo, source: flag("source"), note: flag("note"), via: "cli" } });
      if (!ok) die(j.error || status);
      console.log(`${C.g(j.already_open ? "already open" : "queued")} ${safeText(j.id, 80)}  ${safeText(j.url, 300)}`);
      console.log(C.dim(`status: tokenmark status ${safeText(j.id, 80)}   (configs are extracted, then a human reviews before they go live)`));
      return;
    }
    if (cmd === "status") {
      const id = positional[0];
      if (!id) return console.log(C.y("usage: tokenmark status <submission-id>"));
      const { ok, status, j } = await api(`/api/submit/${encodeURIComponent(id)}`);
      if (!ok) die(j.error || status);
      const t = (v, max = 200) => safeText(v, max);
      console.log(`${C.b(t(j.id, 80))}  ${t(j.url || j.title || "", 300)}
  status: ${C.g(t(j.status, 40))}${j.decision ? ` (${t(j.decision)})` : ""}${j.error ? `  ${C.y(t(j.error))}` : ""}`);
      (Array.isArray(j.configs) ? j.configs : []).forEach((c, i) => console.log(`  ${i + 1}. ${t(c.model)} \xB7 ${t(c.quant || "?")} \xB7 ${t(c.hardware)} \xB7 ${t(c.backend || "?")} \u2192 ${t(c.decode_tps, 20)} tok/s${Array.isArray(c.flags) && c.flags.length ? C.y(`  \u26A0 ${t(c.flags.join("; "), 400)}`) : ""}`));
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
${plural(recs.length, "pick", "picks")} for ${flag("hardware") || "any hardware"}${tasks.length ? ` \xB7 ${tasks.join(", ")}` : ""} \xB7 prefer ${flag("prefer", "balanced")}
`));
      recs.forEach(printRec);
      return;
    }
    if (cmd === "configs") {
      const model = flag("model"), hw = flag("hardware");
      let rows = s.configs;
      if (model) rows = rows.filter((c) => modelMatches(c.model, model));
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
      const term = (positional[0] || "").toLowerCase();
      if (!term) return console.log(C.y("usage: tokenmark search <term>"));
      const rows = s.configs.filter((c) => configMatches(c, term));
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
  } catch (e) {
    console.error(C.y(`error: ${safeText(e.message, 2e3)}`));
    process.exit(1);
  }
})();
