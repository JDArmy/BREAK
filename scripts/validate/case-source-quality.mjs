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
  'jcrb.com',
  'mps.gov.cn',
  'jxzfw.gov.cn',
  'gdzf.org.cn',
  'gzszfw.gov.cn',
  'fjcdi.gov.cn',
  'faxin.cn',
  'sichuanpeace.gov.cn',
  'cdgaj.chengdu.gov.cn',
  'gat.guizhou.gov.cn',
  'gaj.ningbo.gov.cn',
  'gat.nmg.gov.cn',
  'bj148.org',
  'njyhfy.gov.cn',
  'samr.gov.cn',
  'cac.gov.cn',
  'chinatax.gov.cn',
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
  'openaccess.thecvf.com',
  'eprint.iacr.org',
  'tches.iacr.org',
  'mdpi.com',
  'nature.com',
  'sciencedirect.com',
  'springer.com',
  'springeropen.com',
  'github.com',
  'gitlab.com',
  'owasp.org',
  'cloudflare.com',
  'geetest.com',
  'hackthebox.com',
  'chain.link',
  'nieuws.kuleuven.be',
  'paypal.com',
  'humansecurity.com',
  'f5.com',
  'greip.io',
  'amazonaws.cn',
  'amemv.com',
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
  'cpd.com.cn',
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
  'sekoia.io',
  'cisco.com',
  'talosintelligence.com',
  'oligo.security',
  'pushsecurity.com',
  'akamai.com',
  'fortiguard.com',
  'fortinet.com',
  'checkmarx.com',
  'securelist.com',
  'koi.ai',
  'gist.github.com',
  'cert.europa.eu',
  'cert.org.cn',
  'cverc.org.cn',
  'courtlistener.com',
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
  'volex.com',
  'fujitsu.com',
  'static.nhtsa.gov',
  'forescout.com',
  'cside.com',
  'bitdefender.com',
  'blocksec.com',
  'solidityscan.com',
  'socket.dev',
  'wiz.io',
  'blackpanda.com',
  'chainalysis.com',
  'certik.com',
  'slowmist.com',
  'peckshield.com',
  'messari.io',
  'solana.com',
  'binance.com',
  'okta.com',
  'cybereason.com',
  'cloudsmith.com',
  'qubic.org',
  'bitcoingold.org',
  'horizen.io',
  'cloudsek.com',
  'tenable.com',
  'youst.in',
  'nilsonreport.com',
  'autoriteitpersoonsgegevens.nl',
  'dataprotection.ie',
  'cnpd.public.lu',
  'humanrights.go.kr',
  'pipc.go.kr',
  'capitalone.com',
  'wuhua.gov.cn',
  'ankr.com',
  'qianxin.com',
  'forcepoint.com',
  'flare.io',
  'sharkteam.org',
  'shaanxijubao.cn',
  'jinyier.me',
  'bocongan.gov.vn',
  'baochinhphu.vn',
  'threathunter.cn',
  'whwx.gov.cn',
];

const secondaryDomainSuffixes = [
  'thepaper.cn',
  'news.qq.com',
  'new.qq.com',
  'view.inews.qq.com',
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
  'https://web.archive.org/web/20180221031903/https://blog.redlock.io/cryptojacking-tesla', // RedLock CSI Team 原始研究存档
  'https://www.douyin.com/video/7646680404434504998', // 抖音黑板报官方治理公告
  'https://m.thepaper.cn/newsdetail_forward_20536442', // 上海市第二中级人民法院官方澎湃号
  'https://m.thepaper.cn/newsdetail_forward_6016636', // 汾阳市市场监管局政务通报
  'https://m.thepaper.cn/newsdetail_forward_31179929', // 敦化市人民法院官方澎湃号
  'https://m.thepaper.cn/newsdetail_forward_33183066', // 夏都西宁官方澎湃号，来源青海省公安厅
  'https://www.thepaper.cn/newsdetail_forward_33164885', // 云浮市中级人民法院官方澎湃号，供稿罗定法院
  'https://xinwen.bjd.com.cn/content/s6a2bfd65d5de97bd7464c3db.html', // 北京互联网法院供稿
  'https://hzsc.hangzhou.com.cn/content/content_7015476.htm', // 上城区法院案件通报
  'https://mp.weixin.qq.com/s/zm3kcgvf3bselnsmgdcglq', // 扬州经济技术开发区人民检察院官网要闻列表指向的官方微信原文
  'https://mp.weixin.qq.com/s?__biz=mzawntgwnjy0nq==&mid=2909647260&idx=1&sn=724da208d4480ad7ac2e411282b0556f', // 樊城发布政务微信
  'https://mp.weixin.qq.com/s?__biz=mzg4nta2mdu0oq==&mid=2247530131&idx=1&sn=69682338439f50044b36db5956286c8b', // 成都市市场监管政务微信
  'https://mp.weixin.qq.com/s/mkzzqogpgzb9dtgenlu6ja', // 公安部网安局官方微信
  'https://mp.weixin.qq.com/s/blui1fvmlxx8-zzzvaqnjq', // 警民直通车浦东官方微信
  'https://mp.weixin.qq.com/s?__biz=mjazmdqwntu0mq==&mid=2653000171&idx=1&sn=3c2a6b6f9da032c1df95330f763093d5&chksm=4b7a5d4a81092891c6e0b10cb742fb5b0b6d25060326fd33ab8ec5eaf6cff8e908bb5194e5f9&scene=27', // 公安机关处罚快手公司官方微信
  'https://mp.weixin.qq.com/s?__biz=mzi1mde2oteynq==&mid=2651575022&idx=1&sn=adacaec3ecf7ff07d111d5b00d07e4bc&chksm=f378f513b9d6f9b9abcdd0a175a8023e855453160fdfa587ba8c166bfa9faff20736064dc02b&scene=27', // 网信上海政务微信
  'https://mp.weixin.qq.com/s?__biz=mzi0nzqwnzy1mw==&mid=2247944095&idx=3&sn=c237244af82a135331a870a2bfa43632&chksm=e9b832d5decfbbc39143c28fd3a49dbb946ef253ee8deab1d48800408634a44ebcf5f93eda98&scene=27', // 抖音黑板报官方治理公告
  'https://mp.weixin.qq.com/s?__biz=mza5mzgzodywoa==&mid=2650506064&idx=3&sn=6f1ab6601fe507fea783c3da8235ab61&chksm=8914f041678c84c260dabbab50587d08dfbbea7248fc01300674a473343172e066f62f2bd993&scene=27', // 众安保险官方协查公告
  'https://mp.weixin.qq.com/s?__biz=mziwmjg4oti2nq==&mid=2247597756&idx=1&sn=751c1ea5b214ae6e14a208c04ae05e3d&chksm=976a9115a2f2a7d3a131e573f1ace2322d97ec1a77abf668a1224ac8d977e046968f5c7cad71&scene=27', // 上海高院官方微信
  'https://mp.weixin.qq.com/s?__biz=mzi3mtqznjyxnw==&mid=2247942229&idx=1&sn=60015b68761a105e0f52e046a045e0b0&chksm=eb23a3265ba293db1f219b1ce7328244489cb07e98df0a228bd981f419b7ec820f1515bb599a&scene=27', // 网信北京官方微信
  'https://mp.weixin.qq.com/s/ksxev9ft7i4suicefuyzxg', // 微信安全中心官方治理公告
  'https://mp.weixin.qq.com/s?__biz=mzu1mte1mju5nw==&mid=2247485363&idx=1&sn=76a86685d32ca24ebff66be37165fdf3', // 国家网络安全通报中心官方微信
  'https://mp.weixin.qq.com/s?__biz=mjm5mjk2odm2ma==&mid=2652737162&idx=5&sn=9b044f853f0bcacdd13c0f24218565de&chksm=bce87f0d81468ad5857e16c6e43a77ee8a6809d162a627524fe86a69d5a98bc3ddc9c671cc8b&scene=27', // 国家网络安全通报中心官方微信
  'https://mp.weixin.qq.com/s?__biz=mzawnzg1oti4mw==&mid=2676817869&idx=2&sn=fc3193716827d44022b63b50912959f8&chksm=80d202c18d5547befba3507e0ae878277af68d8fa58c83ce9ca6e19799fdf130f95ffbcd1711&scene=27', // 阳曲公安官方微信
  'https://mp.weixin.qq.com/s?__biz=mza3mtm5odc4oq==&mid=2650704873&idx=2&sn=8e3743b992069ccf00ad6809bd960249&chksm=86109499ec04490202647267022f328a06b7e065e122fe40b7a7fdbd26b29b004eaa0aa904c5&scene=27', // 平安火洲官方微信
  'https://mp.weixin.qq.com/s?__biz=mzu0mta3otu5ng==&mid=2247500269&idx=1&sn=8f12a6a214ec007a6c4b576c77921b04&chksm=fb2de0aecc5a69b8ddf2a66b87116a8e018f48d1e54258032e56925cca82742fd45231fa5b08&scene=27', // 公安部网安局官方微信
  'https://mp.weixin.qq.com/s?__biz=mzixntazodg3oa==&mid=2651228803&idx=1&sn=71cad1e585f04d147e288ac25e93a3f7&chksm=8d9aa4e8f29da5503bd31542e0298049dc31ba45f7dd9e92f52d76debc2b9d7f8c66fdfe6d1b&scene=27', // 顺义检察官方微信
  'https://mp.weixin.qq.com/s/z3r0ry2s3aitpxcmwyufzq', // 扬州市江都区人民检察院官网索引指向的官方微信原文
  'https://mp.weixin.qq.com/s?__biz=mzaxote3nzc5mq==&mid=2650805014&idx=1&sn=f2da7f16d9431b33ba42148525423eae&chksm=803fbb46b748325096c865731e35848ed0bb924ce706060c3f12073b614a3bf8b0de1c9c2903&scene=27', // 扬州市中级人民法院官方微信
  'https://mp.weixin.qq.com/s?__biz=mza3ody0njqzma==&mid=2650284888&idx=1&sn=a48ed16d4c3feb2abfe101fb778108f9&chksm=87b31ea9b0c497bf2295c0506f0b9adb1618bad1e445662eefe8423764371d94786a591701e9&scene=27', // 宁波公安官方微信
  'https://mp.weixin.qq.com/s?__biz=mzawmtu1odawnq==&mid=2650670258&idx=4&sn=115d31346e5a6671f91921b2bd1597c6&chksm=82dd7028b5aaf93eba9ba66f686d8fad00b96ea480d9cd30a8b77277c3a3d09b55571658b53b&scene=27', // 公安部网安局官方微信
  'https://mp.weixin.qq.com/s/nhiwxqy5qxj_xsxtzgpyba', // 钦州网警官方微信
  'https://mp.weixin.qq.com/s/mmawdyonqffbbdzexx-qaa', // 公安部网安局官方微信
  'https://mp.weixin.qq.com/s/xjq1sbdm5_2njzfcf3g3tq', // 公安部网安局官方微信
  'https://mp.weixin.qq.com/s/ml4m1wnvnrh90rqkhvxura', // 昌南公安官方微信
  'https://mp.weixin.qq.com/s/zi8yf94a9ylqkdgb_yjqvq', // 烟台公安官方微信
  'https://mp.weixin.qq.com/s/az4jgsr42s-qjtrmjtc2dg', // 石门县人民法院官方微信
  'https://mp.weixin.qq.com/s/-4rbqfafnygl6uz2l8mk1a', // 成都公安官方微信
  'https://mp.weixin.qq.com/s?__biz=mjm5mtiwmjy1mg==&mid=2650074669&idx=1&sn=df2777e4c5a07e8b62a2ec98b12b4c6f&chksm=bf14ee27f795e8d2f1ca2b37d65972e134a6f6b8f89ff592b4c46d18b5f78404910ea62caf87&scene=27', // 国家安全部官方微信
  'https://mp.weixin.qq.com/s?__biz=mzu2mjc2oda5mw==&mid=2247540570&idx=1&sn=7177dbd96b2327b899d78d6306d15b91&chksm=fc666ee8cb11e7fea80de38c970b6044a5e94a02fc0f8577a5678408a5aedb6981071d1f55dc&scene=27', // 江都警方官方微信
  'https://mp.weixin.qq.com/s/ivnvm37snzpzajrgimpy-a', // 大悟发布政务微信，大悟县人民政府办公室情况通报
  'https://mp.weixin.qq.com/s/8olzgvwkc7qhqzkma1ixia', // 上海市长宁区人民检察院官网索引指向的官方微信原文
  'https://mp.weixin.qq.com/s/o9cuy24aczeyta73z0iqda', // 江苏省人民检察院官网案件发布索引指向的仪征检察官方微信原文
  'https://peking.bjd.com.cn/content/s649a2d5fe4b042ca9e8e4fb9.html', // 北京法院审判信息发布账号，供稿朝阳法院
  'https://jsnews.jschina.com.cn/jczx/202502/t20250218_s67b41f81e4b04dff9907e0f5.shtml', // 江苏检察在线来源，太仓市人民检察院官网宣传看点索引指向
  'https://news.qq.com/rain/a/20250415a08y8c00', // 上海市徐汇区新闻办公室官方账号托管页
  'https://news.qq.com/rain/a/20260605a03qyh00', // 乐山市人民政府新闻办公室官方账号托管页
  'https://www.zhongyuan.gov.cn/rdhy/9581840.jhtml', // 政府门户转载抖音黑板报官方治理公示
  'http://putian.pafj.net/caw/f/10/view-225-766722.html', // 莆田长安网检察院栏目，中共莆田市委政法委员会主办
  'https://x.com/alvierid/status/1999403353466421320', // 安全研究人员原始披露
  'https://xz.aliyun.com/news/13288', // 作者原始漏洞复盘
  'https://xz.aliyun.com/news/14031', // 作者原始云存储接管复盘
  'https://0xspade.medium.com/api-secret-key-leakage-leads-to-disclosure-of-employees-information-5ca4ce17e1ce', // 漏洞赏金猎人原始披露
  'https://medium.com/osmosis-community-updates/osmosis-updates-from-the-lab-recap-osmocon-and-exploit-fix-june-15-2022-fc22355e4b0d', // Osmosis 官方社区更新
  'https://medium.com/paritytech/a-postmortem-on-the-parity-multi-sig-library-self-destruct-63daca3a4cf7', // Parity 官方事后分析
  'https://peckshield.medium.com/value-defi-incident-root-cause-analysis-fbab71faf373', // PeckShield 原始链上分析
  'https://peckshield.medium.com/bzx-hack-ii-full-disclosure-with-detailed-profit-analysis-8126eecc1360', // PeckShield 原始链上分析
  'https://peckshield.medium.com/alert-new-batchoverflow-bug-in-multiple-erc20-smart-contracts-cve-2018-10299-511067db6536', // PeckShield 原始链上分析
  'https://slowmist.medium.com/the-root-cause-of-poly-network-being-hacked-ec2ee1b0c68f', // SlowMist 原始链上分析
  'https://slowmist.medium.com/navigating-on-chain-communication-after-a-crypto-hack-74a4fd8b1791', // SlowMist 原始链上分析
  'https://medium.com/xtoken/xsnx-post-mortem-666d35071f38', // xToken 官方事后分析
  'https://medium.com/balancer-protocol/incident-with-non-standard-erc20-deflationary-tokens-95a0f6d46dea', // Balancer 官方事故说明
  'https://x.com/MantaNetwork/status/1749636246023057431', // Manta Network 官方公告
  'https://x.com/AztecLabs_/status/2066175430252700035', // Aztec Labs 官方事故说明
  'https://x.com/MultichainOrg/status/1679768407628185600', // Multichain 官方停运说明
  'https://x.com/realScamSniffer/status/1970322013597450609', // Scam Sniffer 原始链上告警
  'https://x.com/PeckShieldAlert/status/1976577386469839269', // PeckShield 原始链上告警
  'https://x.com/SlowMist_Team/status/1516962155211407360', // SlowMist 原始链上分析
  'https://x.com/twittercomms/status/1167559184410431488', // Twitter 官方事件说明
  'https://x.com/github/status/2056949169701720157', // GitHub 官方事件说明
  'https://x.com/venusprotocol/status/2033471885259034989', // Venus Protocol 官方事件说明
  'https://x.com/thetanutsfi/status/2066569315961454925', // Thetanuts Finance 官方事件说明
  'https://x.com/multichainorg/status/1679768407628185600', // Multichain 官方事件说明
  'https://x.com/gate_io/status/1082525066510749696', // Gate.io 官方 ETC 51% 攻击说明
  'https://humanityprotocol.notion.site/h-token-incident-update-37ab0ec467a781d7af06e7dcedd66852', // Humanity Protocol 官方事件更新
  'https://bitcointalk.org/index.php?topic=105818.0', // BitFloor 创始人事故说明
]);
const normalizedPrimaryReferenceLinks = new Set([...primaryReferenceLinks].map((link) => link.toLowerCase()));
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

  if (normalizedPrimaryReferenceLinks.has(link.toLowerCase())) {
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
