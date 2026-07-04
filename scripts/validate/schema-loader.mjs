/**
 * Schema 加载器（共享模块）
 *
 * 用 Vite SSR 构建 breakSchema.ts 为可 import 模块，确保校验脚本用的是与运行时一致的 schema。
 * 抽出此模块供 schema.mjs / i18n-sync.mjs 等脚本复用，避免每个脚本各自 build 一份。
 */
import { build } from "vite";

let cachedSchemas = null;
let cachedFormatZodIssues = null;

/**
 * 加载 entitySchemas 与 formatZodIssues。
 * 首次调用 build schema bundle，后续调用返回缓存（同一进程内 schema 不变）。
 * @returns {Promise<{ entitySchemas: Record<string, import("zod").ZodType>, formatZodIssues: Function }>}
 */
export async function loadSchemaModule() {
  if (cachedSchemas) {
    return { entitySchemas: cachedSchemas, formatZodIssues: cachedFormatZodIssues };
  }

  const schemaBundle = await build({
    configFile: false,
    logLevel: "silent",
    ssr: {
      noExternal: true,
    },
    plugins: [],
    build: {
      ssr: true,
      write: false,
      rollupOptions: {
        input: "src/validation/breakSchema.ts",
      },
    },
  });

  const schemaChunk = schemaBundle.output.find((item) => item.type === "chunk");
  if (!schemaChunk) {
    throw new Error("❌ 无法加载数据 Schema");
  }

  const schemaModule = await import(
    `data:text/javascript;base64,${Buffer.from(schemaChunk.code).toString("base64")}`
  );

  cachedSchemas = schemaModule.entitySchemas;
  cachedFormatZodIssues = schemaModule.formatZodIssues;
  return { entitySchemas: cachedSchemas, formatZodIssues: cachedFormatZodIssues };
}

/**
 * 获取某实体 schema 的顶层字段名集合。
 * Zod 4 的 ZodObject 实例有 .shape 属性（直接对象），暴露字段名；
 * .strict() 包装不影响 shape 顶层 key。
 * @param {import("zod").ZodObject} schema
 * @returns {Set<string>}
 */
export function getSchemaTopLevelFields(schema) {
  // ZodObject 实例的 .shape 是直接对象属性（Zod 4）；兜底 _def.shape() 函数
  const shape = schema?.shape ?? schema?._def?.shape?.() ?? {};
  return new Set(Object.keys(shape));
}
