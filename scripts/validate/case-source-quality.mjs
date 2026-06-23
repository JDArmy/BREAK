import fs from 'fs';
import path from 'path';
import { domainOf, loadEntities, projectRoot, writeJson } from '../search/common.mjs';

const reportDir = path.join(projectRoot, 'research/search-reports');
const highValueCategories = new Set([
  'criminal_verdict',
  'administrative_enforcement',
  'security_incident',
  'vulnerability_advisory',
]);

const weakDomains = [
  'baidu.com',
  'baijiahao.baidu.com',
  'blog.csdn.net',
  'csdn.net',
  'jianshu.com',
  'zhihu.com',
  'zhuanlan.zhihu.com',
  '66law.cn',
  '64365.com',
  'dianyatou.cn',
  'kaitao.cn',
];

const primaryDomainSuffixes = [
  '.gov',
  '.gov.cn',
  '.gov.au',
  '.edu',
  '.edu.cn',
  '.ac.cn',
  'gov.cn',
  'court.gov.cn',
  'chinacourt.cn',
  'chinacourt.org',
  'jcy.gov.cn',
  'mps.gov.cn',
  'jxzfw.gov.cn',
  'samr.gov.cn',
  'cac.gov.cn',
  'npc.gov.cn',
  'cisa.gov',
  'nist.gov',
  'nvd.nist.gov',
  'justice.gov',
  'europol.europa.eu',
  'fbi.gov',
  'ic3.gov',
  'sec.gov',
  'cve.org',
  'mitre.org',
  'attack.mitre.org',
  'arxiv.org',
  'doi.org',
  'dl.acm.org',
  'ieee.org',
  'usenix.org',
  'nature.com',
  'sciencedirect.com',
  'springer.com',
  'springeropen.com',
  'github.com',
  'gitlab.com',
  'owasp.org',
  'cloudflare.com',
  'geetest.com',
  'amazonaws.cn',
  'appsflyer.com',
  'fraudlogix.com',
  'adguard.com',
  'chromewebstore.google.com',
  'peerj.com',
  'att.com',
  'about.att.com',
  'microsoft.com',
  'learn.microsoft.com',
  'uber.com',
  'pvp.qq.com',
  'gp.qq.com',
  'daan.cpd.com.cn',
  'epaper.cpd.com.cn',
  'cf.qq.com',
  'rule.jd.com',
  'gamesafe.qq.com',
  'yysls.cn',
  'sega.co.jp',
  'jp.square-enix.com',
  'square-enix.com',
  'kaspersky.com.cn',
  'hackerone.com',
  'fraudblocker.com',
  'indusface.com',
  'securityscorecard.com',
  'jfrog.com',
  'cyfrin.io',
  'trufflesecurity.com',
  'proofpoint.com',
  'paloaltonetworks.com',
  'invariantlabs.ai',
  'samcurry.net',
  'fortiguard.com',
  'fortinet.com',
  'checkmarx.com',
  'securelist.com',
  'koi.ai',
  'cert.europa.eu',
  'sonatype.com',
  'endorlabs.com',
  'nsfocusglobal.com',
  'notepad-plus-plus.org',
  'unit42.paloaltonetworks.com',
  'eclypsium.com',
  'trufflesecurity.com',
  'docs.litellm.ai',
  'lightning.ai',
  'elliptic.co',
  'stepsecurity.io',
  'kudelskisecurity.com',
  'halborn.com',
  'autoriteitpersoonsgegevens.nl',
  'dataprotection.ie',
  'capitalone.com',
  'ankr.com',
  'qianxin.com',
  'forcepoint.com',
  'flare.io',
  'shaanxijubao.cn',
];

const secondaryDomainSuffixes = [
  'thepaper.cn',
  'news.qq.com',
  'new.qq.com',
  'content-static.cctvnews.cctv.com',
  'cctv.com',
  'xinhuanet.com',
  'news.cn',
  'cnr.cn',
  'chinadaily.com.cn',
  'people.com.cn',
  'peopleapp.com',
  'huanqiu.com',
  'gmw.cn',
  'jfdaily.com',
  'jfdaily.com.cn',
  'southcn.com',
  'ycwb.com',
  'ifeng.com',
  'chinanews.com.cn',
  'jstv.com',
  'legaldaily.com.cn',
  'cfsn.cn',
  'caixin.com',
  'ysxw.cctv.cn',
  'news.cctv.cn',
  '163.com',
  'sina.cn',
  'sina.com.cn',
  'sohu.com',
  '36kr.com',
  'coindesk.com',
  'chainalysis.com',
  'certik.com',
  'slowmist.com',
  'peckshield.com',
  'thehackernews.com',
  'krebsonsecurity.com',
  'bleepingcomputer.com',
  'freebuf.com',
  'anquanke.com',
  'xz.aliyun.com',
  'secrss.com',
  'cloud.tencent.com',
  '51cto.com',
  'schneier.com',
];

const mirrorDomainSuffixes = ['mp.weixin.qq.com', 'm.gmw.cn', 'toutiao.com', 'web.toutiao.com'];
const primaryReferenceLinks = new Set([
  'https://m.thepaper.cn/newsdetail_forward_20536442', // 上海市第二中级人民法院官方澎湃号
  'https://mp.weixin.qq.com/s/zm3kcgvf3bselnsmgdcglq', // 扬州经济技术开发区人民检察院官网要闻列表指向的官方微信原文
  'https://mp.weixin.qq.com/s?__biz=mzawntgwnjy0nq==&mid=2909647260&idx=1&sn=724da208d4480ad7ac2e411282b0556f', // 樊城发布政务微信
  'https://mp.weixin.qq.com/s?__biz=mzg4nta2mdu0oq==&mid=2247530131&idx=1&sn=69682338439f50044b36db5956286c8b', // 成都市市场监管政务微信
  'https://mp.weixin.qq.com/s/mkzzqogpgzb9dtgenlu6ja', // 公安部网安局官方微信
  'https://mp.weixin.qq.com/s/blui1fvmlxx8-zzzvaqnjq', // 警民直通车浦东官方微信
  'https://medium.com/osmosis-community-updates/osmosis-updates-from-the-lab-recap-osmocon-and-exploit-fix-june-15-2022-fc22355e4b0d', // Osmosis 官方社区更新
  'https://medium.com/paritytech/a-postmortem-on-the-parity-multi-sig-library-self-destruct-63daca3a4cf7', // Parity 官方事后分析
  'https://peckshield.medium.com/value-defi-incident-root-cause-analysis-fbab71faf373', // PeckShield 原始链上分析
  'https://peckshield.medium.com/bzx-hack-ii-full-disclosure-with-detailed-profit-analysis-8126eecc1360', // PeckShield 原始链上分析
]);
const primaryWechatBizIds = [
  'MjM5MjMyNTA0MQ==', // 公安部网安局
];

function matchesDomain(domain, suffixes) {
  return suffixes.some((suffix) => {
    if (suffix.startsWith('.')) {
      return domain.endsWith(suffix);
    }
    return domain === suffix || domain.endsWith(`.${suffix}`);
  });
}

function classifySource(ref) {
  const link = String(ref?.link || '').trim();
  const title = String(ref?.title || '').trim();
  const domain = domainOf(link);

  if (!domain) {
    return { sourceType: 'unknown', reason: 'invalid_or_missing_domain' };
  }

  if (weakDomains.some((item) => domain === item || domain.endsWith(`.${item}`))) {
    return { sourceType: 'weak', reason: 'weak_or_user_generated_domain' };
  }

  if (primaryReferenceLinks.has(link.toLowerCase())) {
    return { sourceType: 'primary', reason: 'official_account_reference' };
  }

  if (matchesDomain(domain, primaryDomainSuffixes)) {
    return { sourceType: 'primary', reason: 'official_academic_or_original_domain' };
  }

  if (domain === 'mp.weixin.qq.com' && primaryWechatBizIds.some((bizId) => link.includes(`__biz=${bizId}`))) {
    return { sourceType: 'primary', reason: 'official_wechat_account' };
  }

  if (matchesDomain(domain, mirrorDomainSuffixes)) {
    return { sourceType: 'mirror', reason: 'republished_or_social_platform' };
  }

  if (matchesDomain(domain, secondaryDomainSuffixes)) {
    return { sourceType: 'secondary', reason: 'trusted_media_or_security_analysis' };
  }

  if (/\b(CVE|NVD|arXiv|DOI|GitHub|司法解释|法院|检察院|公安|监管|公告)\b/i.test(title)) {
    return { sourceType: 'unknown', reason: 'title_suggests_primary_but_domain_unclassified' };
  }

  return { sourceType: 'unknown', reason: 'unclassified_domain' };
}

function strongestSourceType(sourceTypes) {
  const order = ['primary', 'secondary', 'mirror', 'unknown', 'weak'];
  return order.find((type) => sourceTypes.includes(type)) || 'unknown';
}

function buildReport() {
  const cases = loadEntities('cases');
  const caseReports = [];
  const statsByCategory = {};
  const stats = {
    caseCount: cases.length,
    highValueCaseCount: 0,
    primaryCoveredCases: 0,
    highValuePrimaryCoveredCases: 0,
    secondaryOnlyCases: 0,
    weakSourceCases: 0,
    unknownOnlyCases: 0,
  };

  for (const { key, filePath, entity } of cases) {
    const category = entity.category || 'unknown';
    const isHighValue = highValueCategories.has(category);
    const classifiedReferences = (entity.references || []).map((ref, index) => ({
      index,
      title: ref.title || '',
      link: ref.link || '',
      domain: domainOf(ref.link),
      ...classifySource(ref),
    }));
    const sourceTypes = [...new Set(classifiedReferences.map((ref) => ref.sourceType))];
    const strongest = strongestSourceType(sourceTypes);
    const hasPrimary = sourceTypes.includes('primary');
    const hasWeak = sourceTypes.includes('weak');
    const isSecondaryOnly = sourceTypes.length === 1 && sourceTypes[0] === 'secondary';
    const isUnknownOnly = sourceTypes.length === 1 && sourceTypes[0] === 'unknown';

    if (!statsByCategory[category]) {
      statsByCategory[category] = {
        total: 0,
        primaryCovered: 0,
        secondaryOnly: 0,
        weakSource: 0,
        unknownOnly: 0,
      };
    }
    statsByCategory[category].total++;
    if (isHighValue) stats.highValueCaseCount++;
    if (hasPrimary) {
      stats.primaryCoveredCases++;
      statsByCategory[category].primaryCovered++;
      if (isHighValue) stats.highValuePrimaryCoveredCases++;
    }
    if (isSecondaryOnly) {
      stats.secondaryOnlyCases++;
      statsByCategory[category].secondaryOnly++;
    }
    if (hasWeak) {
      stats.weakSourceCases++;
      statsByCategory[category].weakSource++;
    }
    if (isUnknownOnly) {
      stats.unknownOnlyCases++;
      statsByCategory[category].unknownOnly++;
    }

    caseReports.push({
      key,
      title: entity.title || '',
      category,
      file: path.relative(projectRoot, filePath),
      isHighValue,
      strongestSourceType: strongest,
      hasPrimary,
      sourceTypes,
      qualityFlags: [
        ...(isHighValue && !hasPrimary ? ['high_value_missing_primary'] : []),
        ...(isSecondaryOnly ? ['secondary_only'] : []),
        ...(hasWeak ? ['weak_source'] : []),
        ...(isUnknownOnly ? ['unknown_only'] : []),
      ],
      references: classifiedReferences,
    });
  }

  stats.primaryCoverageRate = stats.caseCount
    ? Number(((stats.primaryCoveredCases / stats.caseCount) * 100).toFixed(2))
    : 0;
  stats.highValuePrimaryCoverageRate = stats.highValueCaseCount
    ? Number(((stats.highValuePrimaryCoveredCases / stats.highValueCaseCount) * 100).toFixed(2))
    : 0;

  for (const stat of Object.values(statsByCategory)) {
    stat.primaryCoverageRate = stat.total ? Number(((stat.primaryCovered / stat.total) * 100).toFixed(2)) : 0;
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceTypeDefinitions: {
      primary: '官方、原始或高稳定来源，例如法院/监管/公安/厂商公告、论文、CVE/NVD、原始代码仓库。',
      secondary: '可信媒体或安全厂商分析，可用于佐证但不等同原始证据。',
      mirror: '转载、社交平台或备份入口，适合作为补充，不宜作为唯一高价值证据。',
      weak: '低可信、用户生成或易失来源，需优先替换或补 primary。',
      unknown: '当前规则无法可靠判定，需人工复核或扩充域名规则。',
    },
    highValueCategories: [...highValueCategories],
    stats,
    statsByCategory,
    cases: caseReports,
    issues: {
      highValueMissingPrimary: caseReports.filter((item) => item.qualityFlags.includes('high_value_missing_primary')),
      secondaryOnly: caseReports.filter((item) => item.qualityFlags.includes('secondary_only')),
      weakSource: caseReports.filter((item) => item.qualityFlags.includes('weak_source')),
      unknownOnly: caseReports.filter((item) => item.qualityFlags.includes('unknown_only')),
    },
  };
}

function renderReport(report) {
  const lines = [
    '# BREAK 案例来源质量审计报告',
    '',
    `生成时间: ${report.generatedAt}`,
    '',
    '## 汇总',
    '',
    '| 指标 | 数量 |',
    '| --- | ---: |',
  ];

  for (const [key, value] of Object.entries(report.stats)) {
    lines.push(`| ${key} | ${value} |`);
  }

  lines.push('', '## 按案例类别统计', '');
  lines.push('| category | total | primaryCovered | primaryCoverageRate | secondaryOnly | weakSource | unknownOnly |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const [category, stat] of Object.entries(report.statsByCategory)) {
    lines.push(
      `| ${category} | ${stat.total} | ${stat.primaryCovered} | ${stat.primaryCoverageRate}% | ${stat.secondaryOnly} | ${stat.weakSource} | ${stat.unknownOnly} |`,
    );
  }

  const sections = [
    ['高价值但缺 primary 来源 Top 50', report.issues.highValueMissingPrimary],
    ['仅 secondary 来源 Top 50', report.issues.secondaryOnly],
    ['包含 weak 来源 Top 50', report.issues.weakSource],
    ['仅 unknown 来源 Top 50', report.issues.unknownOnly],
  ];

  for (const [title, items] of sections) {
    lines.push('', `## ${title}`, '');
    if (!items.length) {
      lines.push('无。');
      continue;
    }
    for (const item of items.slice(0, 50)) {
      const refs = item.references
        .map((ref) => `${ref.sourceType}:${ref.domain || 'unknown'}`)
        .join(', ');
      lines.push(`- ${item.key} ${item.title} [${item.category}] (${refs})`);
    }
  }

  return `${lines.join('\n')}\n`;
}

const report = buildReport();
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'case-source-quality.json'), report);
fs.writeFileSync(path.join(reportDir, 'case-source-quality.md'), renderReport(report));

console.log('\n=== BREAK 案例来源质量审计 ===\n');
for (const [key, value] of Object.entries(report.stats)) {
  console.log(`${key}: ${value}`);
}
console.log(`\n报告已保存到: ${path.join(reportDir, 'case-source-quality.md')}`);
