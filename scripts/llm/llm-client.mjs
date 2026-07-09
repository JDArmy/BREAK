// 统一 LLM client（OpenAI 兼容）
// 从 .env 的 LLM_* 变量读取凭据与模型，支持双模型分工：
//   - MODEL_TEXT (LLM_TEXT_MODEL，默认 jd/glm-5.2)：轻量文本判断（字段密度、分类、title 一致性）
//   - MODEL_MULTI (LLM_MULTI_MODEL，默认 jd/glm-5.2)：重型推理（subagent 交叉判断、Case 事实核验）
//
// 环境变量（.env，gitignored）：
//   LLM_API_URL=http://ai-api.jdcloud.com/v1/chat/completions
//   LLM_API_KEY=pk-...
//   LLM_TEXT_MODEL=jd/glm-5.2
//   LLM_MULTI_MODEL=jd/glm-5.2
//
// 导出：chatText / chatJson / withRetry / sleep / MODEL_TEXT / MODEL_MULTI
// 兼容：scripts/research/llm.mjs re-export 本模块的 chatText as chat / chatJson

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_LLM_URL = 'http://ai-api.jdcloud.com/v1/chat/completions';
const DEFAULT_MODEL = 'jd/glm-5.2';

function parseEnvValue(raw) {
  let value = String(raw ?? '').trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value;
}

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    env[match[1]] = parseEnvValue(match[2]);
  }
  return env;
}

function resolveUrl(rawUrl) {
  const value = rawUrl || DEFAULT_LLM_URL;
  // 当前京东云 HTTPS endpoint 返回 503，HTTP endpoint 可正常进入业务层。
  if (value === 'https://ai-api.jdcloud.com/v1/chat/completions') return DEFAULT_LLM_URL;
  return value;
}

function resolveConfiguredModel(rawModel) {
  const value = rawModel || DEFAULT_MODEL;
  if (value === 'GLM-5.2' || value === 'GPT-5.5') return DEFAULT_MODEL;
  return value;
}

const localEnv = loadLocalEnv();
const LLM_URL = resolveUrl(process.env.LLM_API_URL || localEnv.LLM_API_URL);
const LLM_KEY = localEnv.LLM_API_KEY || process.env.LLM_API_KEY || process.env.DIGITALSANG_LLM_API_KEY;
export const MODEL_TEXT = resolveConfiguredModel(process.env.LLM_TEXT_MODEL || localEnv.LLM_TEXT_MODEL);
export const MODEL_MULTI = resolveConfiguredModel(process.env.LLM_MULTI_MODEL || localEnv.LLM_MULTI_MODEL);

const LLM_RATE_MS = 1500; // 限流，保守
const DEFAULT_TIMEOUT_MS = 60000;

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function resolveModel(model) {
  if (model === 'multi') return MODEL_MULTI;
  if (model === 'text') return MODEL_TEXT;
  return model || MODEL_TEXT; // 允许直接传模型名
}

function ensureKey() {
  if (!LLM_KEY) {
    throw new Error(
      '需要设置环境变量 LLM_API_KEY（或旧变量 DIGITALSANG_LLM_API_KEY）。请在 .env 配置 LLM_API_URL/LLM_API_KEY/LLM_TEXT_MODEL/LLM_MULTI_MODEL。',
    );
  }
}

/**
 * 调用 LLM。messages 为 OpenAI 兼容的 [{role, content}]。
 * @param {Array<{role:string,content:string}>} messages
 * @param {{model?:string, timeoutMs?:number, temperature?:number}} opts
 *   注意：multi 模型不支持自定义 temperature 时，应使用服务默认值（不传该字段）。
 *   text 模型默认 0.2。
 * @returns {Promise<string>} assistant 文本内容；失败抛错
 */
export async function chatText(messages, { model = 'text', timeoutMs = DEFAULT_TIMEOUT_MS, temperature = 0.2 } = {}) {
  ensureKey();
  const resolvedModel = resolveModel(model);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const body = { model: resolvedModel, messages };
    // multi 模型不支持自定义 temperature（仅默认 1），text 模型用 0.2
    if (resolvedModel === MODEL_MULTI) {
      // 不传 temperature，用服务默认
    } else {
      body.temperature = temperature;
    }
    const res = await fetch(LLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLM_KEY}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 500)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
    await sleep(LLM_RATE_MS);
  }
}

/**
 * 调用 LLM 并解析 JSON 输出（剥离 ```json 包裹）。
 * @param {Array<{role:string,content:string}>} messages
 * @param {{model?:string, timeoutMs?:number, schema?:object, validate?:(data)=>void}} opts
 *   - schema: 可选，传入会做基础结构校验（需为对象/数组），失败 throw 触发重试
 *   - validate: 可选校验函数，抛错则触发外层 withRetry 重试
 * @returns {Promise<any>}
 */
export async function chatJson(messages, opts = {}) {
  const raw = await chatText(messages, opts);
  let txt = String(raw || '').trim();
  txt = txt
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  // 容忍前后多余文本：尝试截取首个 { 或 [ 到最后一个 } 或 ]
  const firstBrace = txt.search(/[{[]/);
  const lastBrace = Math.max(txt.lastIndexOf('}'), txt.lastIndexOf(']'));
  if (firstBrace > 0 && lastBrace > firstBrace) {
    txt = txt.slice(firstBrace, lastBrace + 1);
  }
  const data = JSON.parse(txt);
  if (opts.validate) opts.validate(data);
  return data;
}

/**
 * 带重试的执行器（用于 429/超时/JSON 解析失败）。
 * @param {() => Promise<any>} fn
 * @param {{retries?:number, on429Ms?:number, pattern?:RegExp}} opts
 */
export async function withRetry(fn, { retries = 3, on429Ms = 8000, pattern = /429|RATE_LIMIT|ECONNRESET|ETIMEDOUT|abort/i } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || e);
      if (attempt < retries - 1 && pattern.test(msg)) {
        await sleep(on429Ms);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}
