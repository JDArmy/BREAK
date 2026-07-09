import fs from 'fs';
import path from 'path';
import {
  ensureDir,
  loadEntities,
  projectRoot,
  readJson,
  writeJson,
} from '../search/common.mjs';

const reportDir = path.join(projectRoot, 'research/search-reports');
const reportJsonPath = path.join(reportDir, 'business-domain-audit.json');
const reportMdPath = path.join(reportDir, 'business-domain-audit.md');

const strict = process.argv.includes('--strict');

const defaultCrossSceneReason = {
  R0020: '内容合规风险同时具备内容治理与法规合规属性。',
  R0046: '未成年人识别绕过同时影响身份识别与未成年人保护合规。',
  R0060: '洗钱风险既影响支付链路，也会借助商家/商户经营链路落地。',
  'R0055-001': '卡券使用限制突破发生在电商、金融、航旅、出行、教育和物流等带有优惠券、运费券或权益券核销体系的行业，属于可跨行业复用的营销权益核销风险。',
  'R0055-004': '支付金额篡改发生在订单、充值、会员、打赏、保险缴费、AI API 计费、政务缴费和物流代收货款等多行业支付链路中，属于可跨行业复用的交易资金风险。',
  R0071: '生成式AI风险兼具内容生态与业务合规属性。',
  'R0071-002': 'AIGC合规风险在多个行业均作为行业监管专题复用。',
  R0097: '借助平台赌博既是合规问题，也是内容/生态治理问题。',
  R0110: '平台色情风险同时影响内容治理与行业合规。',
  R0115: '恶意广告投放同时影响内容生态与合规治理。',
  'R0012-001': '抢红包外挂既属于直播互动权益滥用，也依赖客户端和自动化对抗链路。',
  R0124: '未成年人保护合规风险在多个行业作为专题复用。',
  R0133: '隐私计算滥用风险在人工智能和行业合规中均需单列。',
  R0222: '影子 API 同时属于接口自动化攻击面和 API/云原生资产治理问题。',
  R0223: 'API 对象级越权同时属于接口自动化攻击面和 API 授权治理问题。',
  R0224: 'API 批量调用既是自动化滥用问题，也是 API 资源与配额治理问题。',
  R0225: 'Webhook 事件伪造同时涉及接口调用滥用和 API 事件链路安全。',
  R0232: 'SaaS 第三方应用授权滥用同时影响供应链协作和 API/OAuth 授权治理。',
  R0233: '协作文档外链泄露同时属于内部协作数据治理和云/SaaS 访问控制问题。',
  R0246: 'MFA 疲劳攻击同时影响认证账号安全和接口化登录对抗。',
  R0247: '会话令牌重放同时影响 API 会话安全和自动化接口调用。',
  R0248: '移动应用重打包同时属于自动化对抗入口和客户端完整性问题。',
  R0249: 'CDN 缓存投毒同时属于接口自动化输入污染和边缘云原生配置安全问题。',
  R0250: '边缘函数配置滥用同时涉及接口链路对抗和边缘云原生配置治理。',
  R0259: 'C2C盲销诈骗同时属于快递快运售后滥用与商家账号治理两个风险问题域。',
  'R0085-002': '双重/三重勒索同时影响账号身份安全和合规治理处置。',
};

function loadBusinessDomains() {
  const dir = path.join(projectRoot, 'src/BREAK/business-domains');
  const records = [];
  for (const file of fs.readdirSync(dir).filter((item) => item.endsWith('.json')).sort()) {
    const data = readJson(path.join(dir, file));
    for (const [key, entity] of Object.entries(data)) {
      records.push({ key, entity, file });
    }
  }
  return records;
}

function addIssue(issues, severity, type, message, details = {}) {
  issues.push({ severity, type, message, ...details });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function normalizeSceneRef(sceneKey, sceneTitle, dimensionTitle) {
  return {
    sceneKey,
    sceneTitle: sceneTitle || sceneKey,
    dimensionTitle: dimensionTitle || '',
  };
}

function parentRiskId(riskId) {
  return riskId.includes('-') ? riskId.split('-')[0] : '';
}

function sceneRefsForRisk(riskId, referencedInRiskScenes) {
  const directRefs = referencedInRiskScenes.get(riskId) || [];
  if (directRefs.length > 0) return directRefs;

  const parentId = parentRiskId(riskId);
  if (!parentId) return directRefs;
  return referencedInRiskScenes.get(parentId) || [];
}

function uniqueBy(values, keyFn) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const key = keyFn(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function inferCrossSceneReason(riskId, sceneRefs, referencedInRiskScenes) {
  const uniqueRefs = uniqueBy(
    sceneRefs,
    (item) => `${item.businessDomainKey}/${item.sceneKey}`,
  );
  const uniqueBusinessDomains = unique(uniqueRefs.map((item) => item.businessDomainKey));
  const uniqueSceneTitles = unique(uniqueRefs.map((item) => item.sceneTitle));
  const uniqueDimensionTitles = unique(uniqueRefs.map((item) => item.dimensionTitle));

  if (uniqueSceneTitles.length === 1 && uniqueBusinessDomains.length > 1) {
    return `同一风险场景“${uniqueSceneTitles[0]}”在多个行业复用。`;
  }

  const parentId = parentRiskId(riskId);
  if (parentId) {
    const parentRefs = referencedInRiskScenes.get(parentId) || [];
    const parentPairs = new Set(
      parentRefs.map((item) => `${item.businessDomainKey}/${item.sceneKey}`),
    );
    if (
      parentPairs.size > 0 &&
      uniqueRefs.every((item) => parentPairs.has(`${item.businessDomainKey}/${item.sceneKey}`))
    ) {
      return `子风险继承父风险 ${parentId} 的业务域归类。`;
    }
  }

  if (uniqueDimensionTitles.length === 1 && uniqueBusinessDomains.length > 1) {
    return `同一${uniqueDimensionTitles[0]}风险在多个行业复用。`;
  }

  if (uniqueBusinessDomains.includes('BD00') && uniqueBusinessDomains.length > 1) {
    return '全域通用风险与行业专题域并行复用。';
  }

  return '';
}

function collectSceneIndex(sceneEntity) {
  const dimensionByScene = new Map();
  for (const dimension of Object.values(sceneEntity.riskDimensions || {})) {
    for (const sceneKey of dimension.riskScenes || []) {
      dimensionByScene.set(
        sceneKey,
        normalizeSceneRef(sceneKey, sceneEntity.riskScenes?.[sceneKey]?.title, dimension.title),
      );
    }
  }
  return dimensionByScene;
}

function collectAudit() {
  const risks = loadEntities('risks');
  const riskTitleById = new Map(risks.map(({ key, entity }) => [key, entity.title || '']));
  const riskIds = new Set(risks.map(({ key }) => key));
  const businessDomains = loadBusinessDomains();
  const issues = [];
  const referencedInRiskScenes = new Map();
  const referencedAtTopLevel = new Map();
  const crossSceneReasons = new Map(Object.entries(defaultCrossSceneReason));
  const inferredCrossSceneReasons = new Map();

  for (const { key: businessDomainKey, entity } of businessDomains) {
    const dimensionByScene = collectSceneIndex(entity);

    for (const [sceneKey, scene] of Object.entries(entity.riskScenes || {})) {
      const sceneRef = dimensionByScene.get(sceneKey) || normalizeSceneRef(sceneKey, scene.title, '');
      for (const riskId of scene.risks || []) {
        if (!referencedInRiskScenes.has(riskId)) referencedInRiskScenes.set(riskId, []);
        referencedInRiskScenes.get(riskId).push({
          businessDomainKey,
          businessDomainTitle: entity.title || businessDomainKey,
          ...sceneRef,
        });
      }
    }

    for (const riskId of entity.risks || []) {
      if (!referencedAtTopLevel.has(riskId)) referencedAtTopLevel.set(riskId, []);
      referencedAtTopLevel.get(riskId).push({
        businessDomainKey,
        businessDomainTitle: entity.title || businessDomainKey,
      });
    }
  }

  for (const riskId of riskIds) {
    const sceneRefs = sceneRefsForRisk(riskId, referencedInRiskScenes);
    const topRefs = referencedAtTopLevel.get(riskId) || [];

    if (sceneRefs.length === 0 && topRefs.length === 0) {
      addIssue(
        issues,
        'error',
        'risk_without_business_scene',
        `Risk 未被任何 BusinessDomain 覆盖: ${riskId}`,
        { key: riskId, title: riskTitleById.get(riskId) || '' },
      );
      continue;
    }

    if (sceneRefs.length === 0 && topRefs.length > 0) {
      addIssue(
        issues,
        strict ? 'error' : 'review',
        'risk_without_primary_scene',
        `Risk 缺少主业务域，仅存在于顶层 risks: ${riskId}`,
        {
          key: riskId,
          title: riskTitleById.get(riskId) || '',
          businessDomains: topRefs.map((item) => item.businessDomainKey),
        },
      );
    }

    const scenePairs = unique(
      sceneRefs.map((item) => `${item.businessDomainKey}/${item.sceneKey}`),
    );
    if (scenePairs.length > 1 && !crossSceneReasons.has(riskId)) {
      const inferredReason = inferCrossSceneReason(riskId, sceneRefs, referencedInRiskScenes);
      if (inferredReason) {
        inferredCrossSceneReasons.set(riskId, inferredReason);
      } else {
        addIssue(
          issues,
          strict ? 'error' : 'review',
          'cross_scene_without_reason',
          `Risk 跨挂多个场景但缺少明确理由: ${riskId}`,
          {
            key: riskId,
            title: riskTitleById.get(riskId) || '',
            references: sceneRefs.map(
              (item) =>
                `${item.businessDomainTitle}/${item.dimensionTitle || '未分类维度'}/${item.sceneTitle}`,
            ),
          },
        );
      }
    }
  }

  for (const [riskId, topRefs] of referencedAtTopLevel.entries()) {
    const sceneRefs = referencedInRiskScenes.get(riskId) || [];
    if (sceneRefs.length > 0) {
      addIssue(
        issues,
        strict ? 'error' : 'review',
        'top_level_risk_duplicate',
        `顶层 risks 不应重复收录已分配主业务域的 Risk: ${riskId}`,
        {
          key: riskId,
          title: riskTitleById.get(riskId) || '',
          businessDomains: topRefs.map((item) => item.businessDomainKey),
        },
      );
    } else {
      addIssue(
        issues,
        'review',
        'top_level_risk_unassigned',
        `顶层 risks 存在未分配专题 Risk，应尽快清零: ${riskId}`,
        {
          key: riskId,
          title: riskTitleById.get(riskId) || '',
          businessDomains: topRefs.map((item) => item.businessDomainKey),
        },
      );
    }
  }

  for (const { key: businessDomainKey, entity } of businessDomains) {
    const topLevel = entity.risks || [];
    const duplicated = topLevel.filter((riskId) => (referencedInRiskScenes.get(riskId) || []).length > 0);
    if (duplicated.length > 0) {
      addIssue(
        issues,
        strict ? 'error' : 'review',
        'business_scene_top_level_duplicates',
        `BusinessDomain 顶层 risks 存在重复收录: ${businessDomainKey}`,
        {
          key: businessDomainKey,
          title: entity.title || '',
          risks: duplicated,
        },
      );
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      risks: risks.length,
      coveredByPrimaryScene: [...riskIds].filter(
        (riskId) => sceneRefsForRisk(riskId, referencedInRiskScenes).length > 0,
      ).length,
      topLevelOnly: [...riskIds].filter(
        (riskId) =>
          sceneRefsForRisk(riskId, referencedInRiskScenes).length === 0 &&
          (referencedAtTopLevel.get(riskId) || []).length > 0,
      ).length,
      crossSceneWithoutReason: issues.filter((item) => item.type === 'cross_scene_without_reason').length,
      topLevelDuplicates: issues.filter((item) => item.type === 'top_level_risk_duplicate').length,
    },
    crossSceneReasonCount: crossSceneReasons.size + inferredCrossSceneReasons.size,
    crossSceneReasons: Object.fromEntries([
      ...crossSceneReasons.entries(),
      ...inferredCrossSceneReasons.entries(),
    ].sort(([a], [b]) => a.localeCompare(b))),
    issues,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# BREAK 业务域归类审计报告',
    '',
    `生成时间: ${report.generatedAt}`,
    '',
    '## 规则',
    '',
    '1. 一个风险至少有一个主业务域',
    '2. 跨挂必须有明确理由',
    '3. 顶层 risks 只保留未分配专题风险，并尽快清零',
    '',
    '## 摘要',
    '',
    `- 风险总数: ${report.summary.risks}`,
    `- 已有主业务域的风险: ${report.summary.coveredByPrimaryScene}`,
    `- 仅存在于顶层 risks 的风险: ${report.summary.topLevelOnly}`,
    `- 缺少跨挂理由的风险: ${report.summary.crossSceneWithoutReason}`,
    `- 顶层重复收录风险: ${report.summary.topLevelDuplicates}`,
    `- 预置跨挂理由数: ${report.crossSceneReasonCount}`,
    '',
    '## 问题汇总',
    '',
  ];

  const severities = ['error', 'review', 'info'];
  for (const severity of severities) {
    lines.push(`- ${severity}: ${report.issues.filter((issue) => issue.severity === severity).length}`);
  }

  lines.push('', '## 问题详情', '');
  if (report.issues.length === 0) {
    lines.push('未发现业务域归类问题。');
  } else {
    for (const issue of report.issues.slice(0, 150)) {
      lines.push(`- [${issue.severity}] \`${issue.type}\` ${issue.message}`);
      if (issue.title) lines.push(`  - title: ${issue.title}`);
      if (issue.references?.length) lines.push(`  - refs: ${issue.references.join(' | ')}`);
      if (issue.businessDomains?.length) lines.push(`  - businessDomains: ${issue.businessDomains.join(', ')}`);
      if (issue.risks?.length) lines.push(`  - risks: ${issue.risks.join(', ')}`);
    }
    if (report.issues.length > 150) {
      lines.push(`- 另有 ${report.issues.length - 150} 条未显示，请查看 JSON 报告。`);
    }
  }

  return `${lines.join('\n')}\n`;
}

const report = collectAudit();
ensureDir(reportDir);
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, renderMarkdown(report));

console.log('\n=== BREAK 业务域归类审计报告 ===\n');
console.log(`risks=${report.summary.risks}`);
console.log(`coveredByPrimaryScene=${report.summary.coveredByPrimaryScene}`);
console.log(`topLevelOnly=${report.summary.topLevelOnly}`);
console.log(`crossSceneWithoutReason=${report.summary.crossSceneWithoutReason}`);
console.log(`topLevelDuplicates=${report.summary.topLevelDuplicates}`);
console.log(`report=${reportMdPath}`);

if (strict && report.issues.some((issue) => issue.severity === 'error')) {
  process.exitCode = 1;
}
