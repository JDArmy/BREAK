import { listEntityFiles } from "../search/common.mjs";

const batchSizeArgIndex = process.argv.indexOf("--size");
const batchSize = batchSizeArgIndex >= 0 ? Number(process.argv[batchSizeArgIndex + 1]) : 50;
const batchArgIndex = process.argv.indexOf("--batch");
const requestedBatch = batchArgIndex >= 0 ? Number(process.argv[batchArgIndex + 1]) : null;
const jsonMode = process.argv.includes("--json");

if (!Number.isInteger(batchSize) || batchSize <= 0) {
  console.error("❌ --size 必须是正整数");
  process.exit(1);
}

const entityTypes = ["risks", "avoidances", "attack-tools", "threat-actors"];
const locales = ["zh", "en"];

function buildBatches() {
  const files = [];

  for (const locale of locales) {
    for (const entityType of entityTypes) {
      files.push(...listEntityFiles(entityType, locale));
    }
  }

  return files.reduce((batches, filePath, index) => {
    const batchIndex = Math.floor(index / batchSize);
    if (!batches[batchIndex]) {
      batches[batchIndex] = {
        batchId: `batch-${String(batchIndex + 1).padStart(2, "0")}`,
        size: 0,
        files: [],
      };
    }

    batches[batchIndex].files.push(filePath);
    batches[batchIndex].size += 1;
    return batches;
  }, []);
}

const batches = buildBatches();
const selectedBatches =
  requestedBatch == null
    ? batches
    : batches.filter((batch) => batch.batchId === `batch-${String(requestedBatch).padStart(2, "0")}`);

if (requestedBatch != null && selectedBatches.length === 0) {
  console.error(`❌ 找不到 batch ${requestedBatch}`);
  process.exit(1);
}

if (jsonMode) {
  console.log(JSON.stringify(selectedBatches, null, 2));
  process.exit(0);
}

for (const batch of selectedBatches) {
  console.log(`${batch.batchId} (${batch.size})`);
  for (const filePath of batch.files) {
    console.log(filePath);
  }
  console.log("");
}
