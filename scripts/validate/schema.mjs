import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { build } from "vite";

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
  console.error("❌ 无法加载数据 Schema");
  process.exit(1);
}

const schemaModule = await import(
  `data:text/javascript;base64,${Buffer.from(schemaChunk.code).toString("base64")}`
);

const { entitySchemas, formatZodIssues } = schemaModule;

const categories = [
  {
    name: "risks",
    dir: "src/BREAK/risks",
    schemaKey: "risks",
    filePattern: /^R\d{4}\.json$/,
    keyPattern: /^R\d{4}(?:-\d{3})?$/,
  },
  {
    name: "avoidances",
    dir: "src/BREAK/avoidances",
    schemaKey: "avoidances",
    filePattern: /^A\d{4}\.json$/,
    keyPattern: /^A\d{4}(?:-\d{3})?$/,
  },
  {
    name: "attack-tools",
    dir: "src/BREAK/attack-tools",
    schemaKey: "attackTools",
    filePattern: /^AT\d{4}\.json$/,
    keyPattern: /^AT\d{4}(?:-\d{3})?$/,
  },
  {
    name: "threat-actors",
    dir: "src/BREAK/threat-actors",
    schemaKey: "threatActors",
    filePattern: /^TA\d{4}\.json$/,
    keyPattern: /^TA\d{4}(?:-\d{3})?$/,
  },
  {
    name: "business-scenes",
    dir: "src/BREAK/business-scenes",
    schemaKey: "businessScenes",
    filePattern: /^BS\d{2}\.json$/,
    keyPattern: /^BS\d{2}$/,
  },
];

const issues = [];

function addIssue(message) {
  issues.push(message);
}

for (const category of categories) {
  const schema = entitySchemas[category.schemaKey];
  const files = readdirSync(category.dir).filter((file) => file.endsWith(".json"));
  let count = 0;

  for (const file of files) {
    const filePath = join(category.dir, file);
    if (!category.filePattern.test(file)) {
      addIssue(`${filePath}: 文件名不符合 ${category.name} 命名规则`);
    }

    let data;
    try {
      data = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch (error) {
      addIssue(`${filePath}: JSON 解析失败: ${error.message}`);
      continue;
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      addIssue(`${filePath}: 顶层必须是对象`);
      continue;
    }

    const expectedParentKey = file.replace(/\.json$/, "");
    for (const [key, entity] of Object.entries(data)) {
      count++;
      if (!category.keyPattern.test(key)) {
        addIssue(`${filePath}.${key}: ID 不符合命名规则`);
      }
      if (key !== expectedParentKey && !key.startsWith(`${expectedParentKey}-`)) {
        addIssue(`${filePath}.${key}: key 与文件名 ${expectedParentKey} 不匹配`);
      }

      const result = schema.safeParse(entity);
      if (!result.success) {
        for (const issue of formatZodIssues(result.error)) {
          addIssue(`${filePath}.${key}.${issue}`);
        }
      }
    }
  }

  console.log(`✅ ${category.name}: 已校验 ${count} 条`);
}

if (issues.length > 0) {
  console.error(`\n❌ Schema 校验失败，共 ${issues.length} 个问题`);
  for (const issue of issues.slice(0, 80)) {
    console.error(`- ${issue}`);
  }
  if (issues.length > 80) {
    console.error(`... 另有 ${issues.length - 80} 个问题未显示`);
  }
  process.exit(1);
}

console.log("\n✅ 所有 BREAK 数据均通过 Schema 校验");
