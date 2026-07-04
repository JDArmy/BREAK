// A 类机器强约束：Case.category 与 references 域名特征一致性
// verdict：review
// 规则（强信号不一致 → review，交人工核实）：
//   criminal_verdict       refs 须含 court/gov 域名
//   administrative_enforcement refs 须含 gov 域名
//   vulnerability_advisory refs 须含 CVE 编号且至少 1 条 link 指向 cve/nvd/mitre/github
//   academic_research      refs 须含学术域名（arxiv/ieee/dl.acm/doi.org/springer/usenix 等）
//   security_incident      refs 须含 primary 或 secondary 来源
//   news_report            无强信号约束

import fs from 'fs';
import path from 'path';
import { projectRoot, writeJson, domainOf } from '../search/common.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';
import { classifySource } from './source-classify.mjs';

const CVE_RE = /\bCVE-\d{4}-\d{4,}\b/i;
const CVE_DOMAINS = ['cve.org', 'nvd.nist.gov', 'mitre.org', 'github.com', 'gist.github.com'];

const COURT_DOMAIN_SUFFIXES = [
  'gov.cn',
  'chinacourt.cn',
  'chinacourt.org',
  'court.gov.cn',
  'courtlistener.com',
  'bjcourt.gov.cn',
  'hshfy.sh.cn',
  'elawcn.com',
  '055110.com',
  'indiankanoon.org',
];

const ACADEMIC_DOMAINS = [
  'arxiv.org',
  'ieee.org',
  'dl.acm.org',
  'doi.org',
  'springer.com',
  'springeropen.com',
  'usenix.org',
  'openaccess.thecvf.com',
  'eprint.iacr.org',
  'tches.iacr.org',
  'mdpi.com',
  'nature.com',
  'sciencedirect.com',
  'peerj.com',
  'ncl.ac.uk',
  'kuleuven.be',
];

function matchesAny(domain, suffixes) {
  return suffixes.some((s) => domain === s || domain.endsWith(`.${s}`));
}

const issues = [];
const cases = loadAllEntities('cases');

for (const { key, entity } of cases) {
  const cat = entity.category;
  const refs = Array.isArray(entity.references) ? entity.references : [];
  if (!refs.length) continue; // require-references.mjs 已管
  const domains = refs.map((r) => domainOf(r.link));
  const sourceTypes = refs.map((r) => classifySource(r).sourceType);
  const hasCveInTitle = refs.some((r) => CVE_RE.test(String(r.title || '')));
  const hasCveDomain = domains.some((d) => matchesAny(d, CVE_DOMAINS));

  let mismatch = null;
  if (cat === 'criminal_verdict') {
    const hasCourt = domains.some((d) => matchesAny(d, COURT_DOMAIN_SUFFIXES));
    if (!hasCourt && !sourceTypes.includes('primary')) {
      mismatch = 'criminal_verdict 案例 refs 须含 court/gov 域名或 primary 来源';
    }
  } else if (cat === 'administrative_enforcement') {
    const hasGov = domains.some((d) => d.endsWith('gov.cn') || d.endsWith('.gov'));
    if (!hasGov && !sourceTypes.includes('primary')) {
      mismatch = 'administrative_enforcement 案例 refs 须含 gov 域名或 primary 来源';
    }
  } else if (cat === 'vulnerability_advisory') {
    if (!(hasCveInTitle || hasCveDomain)) {
      mismatch = 'vulnerability_advisory 案例 refs 须含 CVE 编号且 link 指向 cve/nvd/mitre/github';
    }
  } else if (cat === 'academic_research') {
    const hasAcademic = domains.some((d) => matchesAny(d, ACADEMIC_DOMAINS));
    if (!hasAcademic) {
      mismatch = 'academic_research 案例 refs 须含学术域名（arxiv/ieee/dl.acm/doi.org 等）';
    }
  } else if (cat === 'security_incident') {
    const hasPrimaryOrSec = sourceTypes.includes('primary') || sourceTypes.includes('secondary');
    if (!hasPrimaryOrSec) {
      mismatch = 'security_incident 案例 refs 须含 primary 或 secondary 来源';
    }
  }

  if (mismatch) {
    issues.push({
      severity: 'review',
      type: 'cases',
      key,
      title: entity.title,
      category: cat,
      type2: 'case_category_domain_mismatch',
      message: `${key} [${cat}] ${mismatch}（当前 refs 域名：${domains.slice(0, 3).join(', ')}）`,
    });
  }
}

const reportDir = path.join(projectRoot, 'research/search-reports');
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'case-category-domain-consistency.json'), {
  generatedAt: new Date().toISOString(),
  summary: { review: issues.length },
  issues,
});

console.log('\n=== Case.category 与 references 域名一致性 ===');
console.log(`review: ${issues.length}`);
for (const issue of issues.slice(0, 40)) {
  console.log(`  🔍 ${issue.message}`);
}
if (issues.length > 40) console.log(`  ...另有 ${issues.length - 40} 条未显示`);
if (!issues.length) {
  console.log('✅ 所有 Case.category 与 refs 域名特征一致');
}
