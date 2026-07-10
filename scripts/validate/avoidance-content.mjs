import fs from 'fs';
import path from 'path';
import { loadEntities, projectRoot, writeJson } from '../search/common.mjs';
import { TEXT_LENGTH_POLICY } from './text-length-policy.mjs';

// 长度阈值
const DESC_MIN = 40; // 所有类别 description 最小长度
const LIM_MIN = TEXT_LENGTH_POLICY.avoidances.limitation.minZh; // 所有类别 limitation 最小长度
const LIM_SIGNAL_MIN = 40; // AC02/AC03 limitation 弱约束+长度补强阈值

// 词集（精确使用，不要增减）
const COLLECT_WORDS = [
  '采集', '收集', '埋点', '上报', '抓取', '监听', '采样', '探测', '获取', '记录', '日志',
  '流量', '请求', '访问', '事件', '轨迹', '陀螺仪', '压力', '速率', '频率', '频次',
  '指纹', '标识', 'IP', '设备信息', '环境', '行为', '特征', '特征值', '内容', '文本',
  '图像', '音频', '视频', '文档', '链接',
];
const LOGIC_WORDS = [
  '阈值', '规则', '模型', '算法', '评分', '打分', '权重', '聚类', '分类', '匹配', '比对',
  '偏离', '基线', '统计', '校验', '签名', '序列', '情报', '令牌', '黑名单', '白名单',
  '深度学习', '机器学习', '深度包检测', 'DPI', '异常', '风险', '判定', '决策', '置信',
  '召回', '误报', '漏报', '指标', '监测', '监控',
];
const BYPASS_WORDS = [
  '绕过', '破解', '规避', '突破', '绕开', '击穿', '攻破', '对抗', '打码', '众包',
  '伪造', '模拟', '欺骗', '混淆', '篡改', '改机', '多开', '模拟器', '代理池', '代理',
  '劫持', '注入', '脱机', '协议层', '变种', '升级', '进化', '失效', '无效',
];
const FP_WORDS = [
  '误报', '漏报', '误判', '误伤', '误封', '误拦', '误杀', '误识', '假阳', '假阴',
  '正常用户', '正常业务', '正常访问', '合法', '合规', '噪声', '歧义', '边界', '准确率', '召回率',
];
const PLACEHOLDER_LIM = ['无', '暂无', '待补充', 'N/A', '无明确局限', '暂无明确局限', '无已知局限', '无明确局限性', '暂无局限性', '无'];

const CATEGORY_LABEL = {
  AC01: '防止',
  AC02: '感知',
  AC03: '识别',
  AC04: '处置',
};

const hasAny = (text, words) => words.some((w) => text.includes(w));

function severityForIssue(type) {
  // limitation_signal_uncertain 为 review；其余均为 error
  if (type === 'limitation_signal_uncertain') return 'review';
  return 'error';
}

function addIssue(issues, issue) {
  issues.push({
    severity: issue.severity || severityForIssue(issue.type),
    ...issue,
  });
}

function validateAvoidance(record, issues) {
  const { key, entity } = record;
  const category = entity.category || '';
  const desc = String(entity.description || '');
  const lim = String(entity.limitation || '').trim();

  const ctx = { entityKey: key, category };

  // 1. limitation 全局 required
  if (!lim) {
    addIssue(issues, {
      type: 'limitation_missing',
      ...ctx,
      message: `${key}.limitation: 缺失（所有 Avoidance 必须含"被绕过方式+误报场景"局限说明）`,
    });
  } else if (PLACEHOLDER_LIM.includes(lim)) {
    addIssue(issues, {
      type: 'limitation_placeholder',
      ...ctx,
      message: `${key}.limitation: 占位套话 "${lim}"，需写明具体局限`,
    });
  } else if (lim.length < LIM_MIN) {
    addIssue(issues, {
      type: 'limitation_too_short',
      ...ctx,
      message: `${key}.limitation: 过短（≥${LIM_MIN}字），当前 ${lim.length} 字`,
    });
  }

  // 2. description 长度（所有类别）
  if (desc.length < DESC_MIN) {
    addIssue(issues, {
      type: 'description_too_short',
      ...ctx,
      message: `${key}.description: 过短（≥${DESC_MIN}字），当前 ${desc.length} 字`,
    });
  }

  // 3. AC02/AC03 description 检测信号
  if (category === 'AC02' && !hasAny(desc, COLLECT_WORDS) && !hasAny(desc, LOGIC_WORDS)) {
    addIssue(issues, {
      type: 'description_no_signal',
      ...ctx,
      message: `${key}.description: AC02(感知)需含采集信号或判定逻辑相关词（如采集/埋点/指纹/阈值/模型），当前未命中`,
    });
  }
  if (category === 'AC03' && !hasAny(desc, LOGIC_WORDS) && !hasAny(desc, COLLECT_WORDS)) {
    addIssue(issues, {
      type: 'description_no_signal',
      ...ctx,
      message: `${key}.description: AC03(识别)需含判定逻辑或采集信号相关词（如阈值/规则/模型/匹配/异常），当前未命中`,
    });
  }

  // 4. AC02/AC03 limitation 弱约束+长度补强（仅在 lim 非空且非占位且非过短时才检查）
  if (
    (category === 'AC02' || category === 'AC03') &&
    lim &&
    !PLACEHOLDER_LIM.includes(lim) &&
    lim.length >= LIM_MIN
  ) {
    const hasBypass = hasAny(lim, BYPASS_WORDS);
    const hasFp = hasAny(lim, FP_WORDS);
    if (!hasBypass && !hasFp && lim.length < LIM_SIGNAL_MIN) {
      addIssue(issues, {
        type: 'limitation_no_bypass_fp',
        ...ctx,
        message: `${key}.limitation: ${category} 需含"被绕过方式"或"误报场景"（如绕过/破解/误报/漏报/正常用户），或写足 ${LIM_SIGNAL_MIN} 字说明具体局限`,
      });
    } else if (!hasBypass && !hasFp) {
      addIssue(issues, {
        type: 'limitation_signal_uncertain',
        ...ctx,
        message: `${key}.limitation: 未命中绕过/误报信号词，建议档位三 LLM 复核是否真含"被绕过方式+误报场景"`,
      });
    }
  }
  // AC01/AC04 的 limitation 仅做长度+套话校验（上面已覆盖），不强制 BYPASS/FP
}

function buildStats(records) {
  const stats = {
    AC01: { count: 0, noLimitation: 0 },
    AC02: { count: 0, noLimitation: 0 },
    AC03: { count: 0, noLimitation: 0 },
    AC04: { count: 0, noLimitation: 0 },
    total: records.length,
    withLimitation: 0,
    coverage: '0%',
  };

  for (const { entity } of records) {
    const cat = entity.category;
    const lim = String(entity.limitation || '').trim();
    if (stats[cat] && stats[cat].count !== undefined) {
      stats[cat].count++;
      if (!lim) stats[cat].noLimitation++;
    }
    if (lim) stats.withLimitation++;
  }

  const coverage = records.length
    ? Math.round((stats.withLimitation / records.length) * 100)
    : 0;
  stats.coverage = `${coverage}%`;
  return stats;
}

function renderMarkdown(stats, issues) {
  const lines = [
    '# Avoidance 内容规范审计报告',
    '',
    `生成时间: ${new Date().toISOString()}`,
    '',
    '## 分类统计',
    '',
    '| 类别 | 含义 | 条目数 | 缺 limitation |',
    '| --- | --- | ---: | ---: |',
  ];

  for (const cat of ['AC01', 'AC02', 'AC03', 'AC04']) {
    const item = stats[cat] || { count: 0, noLimitation: 0 };
    lines.push(`| ${cat} | ${CATEGORY_LABEL[cat] || ''} | ${item.count} | ${item.noLimitation} |`);
  }
  lines.push(
    `| 合计 | - | ${stats.total} | ${stats.total - stats.withLimitation} |`,
  );

  lines.push('', '## limitation 覆盖', '');
  lines.push(
    `- 有 limitation: ${stats.withLimitation}/${stats.total} (${stats.coverage})`,
  );

  lines.push('', '## 问题汇总', '');
  const severities = ['error', 'warning', 'review'];
  for (const severity of severities) {
    const count = issues.filter((issue) => issue.severity === severity).length;
    lines.push(`- ${severity}: ${count}`);
  }

  const issueTypes = [...new Set(issues.map((issue) => issue.type))].sort();
  if (issueTypes.length > 0) {
    lines.push('', '### 按问题类型', '');
    for (const type of issueTypes) {
      const count = issues.filter((issue) => issue.type === type).length;
      lines.push(`- ${type}: ${count}`);
    }
  }

  lines.push('', '## 问题详情', '');
  for (const severity of severities) {
    const grouped = issues.filter((issue) => issue.severity === severity);
    if (grouped.length === 0) continue;
    lines.push(`### ${severity} (${grouped.length})`, '');
    for (const issue of grouped) {
      lines.push(
        `- [${issue.category || '-'}] \`${issue.type}\` ${issue.message || ''}`.trim(),
      );
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const records = loadEntities('avoidances');
  const issues = [];

  for (const record of records) {
    validateAvoidance(record, issues);
  }

  const stats = buildStats(records);

  const reportDir = path.join(projectRoot, 'research/search-reports');
  fs.mkdirSync(reportDir, { recursive: true });

  const summary = {
    error: issues.filter((issue) => issue.severity === 'error').length,
    warning: issues.filter((issue) => issue.severity === 'warning').length,
    review: issues.filter((issue) => issue.severity === 'review').length,
  };

  writeJson(path.join(reportDir, 'avoidance-content.json'), {
    generatedAt: new Date().toISOString(),
    stats,
    summary,
    issues,
  });
  fs.writeFileSync(path.join(reportDir, 'avoidance-content.md'), renderMarkdown(stats, issues));

  console.log('\n=== Avoidance 内容规范检查 ===');
  const cats = ['AC01', 'AC02', 'AC03', 'AC04'];
  console.log(
    cats.map((cat) => `${cat}: ${stats[cat].count} 条`).join(' | '),
  );
  console.log(`limitation 覆盖: ${stats.withLimitation}/${stats.total} (${stats.coverage})`);

  console.log('\n问题汇总:');
  for (const severity of ['error', 'warning', 'review']) {
    console.log(`  ${severity}: ${summary[severity]}`);
  }

  const errorIssues = issues.filter((issue) => issue.severity === 'error');
  if (errorIssues.length > 0) {
    console.log(`\n❌ Avoidance 内容规范存在 ${errorIssues.length} 个问题：`);
    const shown = errorIssues.slice(0, 80);
    for (const issue of shown) {
      console.log(`- ${issue.message}`);
    }
    const remaining = errorIssues.length - shown.length;
    if (remaining > 0) {
      console.log(`  ...另有 ${remaining} 个问题未显示，查看 JSON 报告`);
    }
  } else {
    console.log('\n✅ Avoidance 内容规范无 error 级问题。');
  }

  console.log(`\n报告已保存到: ${path.join(reportDir, 'avoidance-content.md')}`);

  if (process.argv.includes('--strict') && issues.some((issue) => issue.severity === 'error')) {
    process.exitCode = 1;
  }
}

main();
