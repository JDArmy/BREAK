/**
 * 英文完整 BREAK 数据 barrel（不含 cases）。
 *
 * 导入由 `npm run generate:en-full` 预合并生成的完整英文 JSON，
 * 英文 locale 运行时直接注入 i18n，无需再加载中文 BREAK 数据。
 *
 * 使用 import.meta.glob eager 加载逐文件结构，使 rolldown 的 maxSize 自然拆分。
 * cases 由 useCases composable 懒加载管理，不纳入此 barrel。
 */

import { loadJsonModules } from "@/BREAK/utils";
import basicInfo from "./.generated/basic-info.json";

const riskFiles = import.meta.glob("./.generated/risks/*.json", { eager: true });
const avoidanceFiles = import.meta.glob("./.generated/avoidances/*.json", { eager: true });
const avoidanceCategoryFiles = import.meta.glob("./.generated/avoidance-categories/*.json", { eager: true });
const businessSceneFiles = import.meta.glob("./.generated/business-scenes/*.json", { eager: true });
const attackToolFiles = import.meta.glob("./.generated/attack-tools/*.json", { eager: true });
const threatActorFiles = import.meta.glob("./.generated/threat-actors/*.json", { eager: true });
const termFiles = import.meta.glob("./.generated/terms/*.json", { eager: true });

const BREAK = {
  ...basicInfo,
  risks: loadJsonModules(riskFiles),
  avoidances: loadJsonModules(avoidanceFiles),
  avoidanceCategories: loadJsonModules(avoidanceCategoryFiles),
  businessScenes: loadJsonModules(businessSceneFiles),
  attackTools: loadJsonModules(attackToolFiles),
  threatActors: loadJsonModules(threatActorFiles),
  terms: loadJsonModules(termFiles),
};

export default BREAK;
