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
  'sdcourt.gov.cn',
  'szlhcourt.gov.cn',
  'chinacourt.cn',
  'chinacourt.org',
  'jcy.gov.cn',
  'jcy.gansu.gov.cn',
  'hexushui.jcy.gov.cn',
  'baoding.jcy.gov.cn',
  'jcrb.com',
  'spp.gov.cn',
  'moj.gov.cn',
  'mps.gov.cn',
  'europarl.europa.eu',
  'jxzfw.gov.cn',
  'gdzf.org.cn',
  'gzszfw.gov.cn',
  'shyp.gov.cn',
  'fjcdi.gov.cn',
  'faxin.cn',
  'sichuanpeace.gov.cn',
  'suiningpeace.gov.cn',
  'cdgaj.chengdu.gov.cn',
  'gat.guizhou.gov.cn',
  'gaj.ningbo.gov.cn',
  'gaj.huangshi.gov.cn',
  'gat.nmg.gov.cn',
  'gat.hubei.gov.cn',
  'yjj.wuzhou.gov.cn',
  'wjw.lanzhou.gov.cn',
  'hljcourt.gov.cn',
  'bj148.org',
  'njyhfy.gov.cn',
  'nxfy.gov.cn',
  'liulin.gov.cn',
  'sgzjfy.gov.cn',
  'scjgj.quanzhou.gov.cn',
  'pbc.gov.cn',
  'samr.gov.cn',
  'tj.gov.cn',
  'cac.gov.cn',
  'chinatax.gov.cn',
  'npc.gov.cn',
  'cisa.gov',
  'nist.gov',
  'nvd.nist.gov',
  'justice.gov',
  'judiciary.uk',
  'cps.gov.uk',
  'europol.europa.eu',
  'fbi.gov',
  'peelpolice.ca',
  'ic3.gov',
  'sec.gov',
  'cve.org',
  'ipaguard.com',
  'mitre.org',
  'attack.mitre.org',
  'arxiv.org',
  'doi.org',
  'dl.acm.org',
  'ieee.org',
  'usenix.org',
  'openaccess.thecvf.com',
  'portswigger.net',
  'eprint.iacr.org',
  'tches.iacr.org',
  'ncl.ac.uk',
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
  'imperva.com',
  'f5.com',
  'barracuda.com',
  'greip.io',
  'amazonaws.cn',
  'amemv.com',
  'appsflyer.com',
  'fraudlogix.com',
  'adguard.com',
  'blog.google',
  'chromewebstore.google.com',
  'peerj.com',
  'att.com',
  'about.att.com',
  'acer.com',
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
  'qn.taobao.com',
  'jinritemai.com',
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
  'santaclara.courts.ca.gov',
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
  'dzb.xfrb.com.cn',
  'bitcoingold.org',
  'horizen.io',
  'cloudsek.com',
  'tenable.com',
  'youst.in',
  'soundcloud.com',
  'haveibeenpwned.com',
  'datenschutz-berlin.de',
  'statenislandda.org',
  'page.alertsense.com',
  'nilsonreport.com',
  'visa.com',
  'cgbchina.com.cn',
  'autoriteitpersoonsgegevens.nl',
  'dataprotection.ie',
  'cnpd.public.lu',
  'humanrights.go.kr',
  'pipc.go.kr',
  'piyao.org.cn',
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
  'ipthailand.go.th',
  'threathunter.cn',
  'whwx.gov.cn',
  'vcredit.com',
  'vicone.com',
  'vulntech.com',
  'tfri.tencent.com',
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
  'https://www.xinhuanet.com/politics/2016-12/20/c_1120149364.htm', // 新华网转载法院审理结果，高校学生利用境外隐藏网络传播儿童淫秽视频案
  'https://m.thepaper.cn/newsdetail_forward_20536442', // 上海市第二中级人民法院官方澎湃号
  'https://m.thepaper.cn/newsdetail_forward_6016636', // 汾阳市市场监管局政务通报
  'https://m.thepaper.cn/newsdetail_forward_31179929', // 敦化市人民法院官方澎湃号
  'https://m.thepaper.cn/newsdetail_forward_33183066', // 夏都西宁官方澎湃号，来源青海省公安厅
  'https://www.thepaper.cn/newsdetail_forward_28991401', // 思明法院官方澎湃号，网络赌博代理返点案
  'https://news.ijjnews.com/system/2023/08/15/030131845.shtml', // 晋江新闻网法院通讯员稿，丰泽法院“呼死你”软件产业链案
  'https://www.hshfy.sh.cn/shfy/web/xxnr.jsp?pa=aaWQ9MTAyMDMxOTYyNCZ4aD0xJmxtZG09bG03NDYPdcssz&zd=xwzx', // 上海高院官网，恶意软件霸屏广告案
  'https://www.sznews.com/news/content/2021-08/28/content_24522078.htm', // 深圳公安发布托管页，福田警方打击涉诈手机黑卡产业链
  'https://www.sznews.com/news/content/2021-12/08/content_24799309.htm', // 深圳南山警方发布托管页，木马盗号冒充熟人诈骗案
  'https://news.qq.com/rain/a/20250312A0885900', // 警民直通车上海官方托管页，点餐优惠券漏洞案
  'https://news.qq.com/rain/a/20220224A06WIA00', // 警民直通车上海官方托管页，货运平台改定位诈骗案
  'https://www.sznews.com/news/content/2021-06/15/content_24299254.htm', // 深圳新闻网承载龙华警方通报，私家侦探公司案
  'https://mp.weixin.qq.com/s/tcDg7zap3pX4MivKt6JkoA', // 公安部网安局官方微信，呼死你短信轰炸案
  'https://news.qq.com/rain/a/20240920A08WA400', // 成都公安官方托管页，篡改货运车辆 GPS 监控数据案
  'https://news.qq.com/rain/a/20260614a04mdv00', // 上海静安官方托管页，七天无理由退货掉包案
  'https://news.cctv.com/2026/06/18/arti1im1sqmvqzkv04azh5w5260618.shtml', // 央视网转载平安北京/朝阳分局调包退货案
  'https://tv.cctv.cn/2026/06/16/VIDE8BAjd4ZlnMMT7J42OnrO260616.shtml', // 央视《新闻直播间》节目页，北京调包退货诈骗案
  'https://m.news.cctv.com/2021/07/19/artie58rnmechoj4v8zu2jfq210719.shtml', // 央视新闻客户端，绵阳手机积分兑换诈骗案
  'https://tv.cctv.cn/2018/10/09/VIDEBJfRxwDXNrvaPc5N7361181009.shtml', // 央视《焦点访谈》节目页，免费手环货到付款诈骗案
  'https://tv.cctv.com/2024/03/15/VIDEaISGnSjSjVaDWrZDsLbf240315.shtml', // 央视 3·15 晚会，同程金融礼品卡变相现金贷曝光
  'https://www.chinaums.com/tblm/aqzx2/djzldxwlzp_1905/jbzspj_1904/202209/t20220906_45358.shtml', // 银联商务转载中国支付清算协会跨境赌博资金转移案例
  'https://m.cyol.com/gb/articles/2021-10/17/content_xyzgdfvxp.html', // 中国青年报客户端来源江都警方，商户收款码非法套现案
  'https://m.thepaper.cn/newsdetail_forward_30782061', // 乌兰浩特市人民法院官方澎湃号，伪造国家机关印章案
  'https://pubg.qq.com/webplat/info/news_version3/33247/33250/33268/33270/m19999/201804/713383.shtml', // 腾讯《绝地求生》官方公告，外挂黑产团伙案
  'https://lol.qq.com/news/detail.shtml?docid=15623264036510329250', // 腾讯《英雄联盟》官方站，消极比赛封号诉讼案
  'https://zzky.shandong-energy.com/185709/185711/2024/04/32388212.html', // 山东能源枣矿集团官网转载枣西公安微信公众号，虚假招聘诈骗团伙案
  'https://m.gmw.cn/2023-04/12/content_1303339963.htm', // 光明网托管温州市中级人民法院/龙湾法院案例
  'https://www.thepaper.cn/newsdetail_forward_14923193', // 中国共产党武宣县委员会宣传部官方澎湃号
  'https://www.thepaper.cn/newsdetail_forward_33164885', // 云浮市中级人民法院官方澎湃号，供稿罗定法院
  'https://xinwen.bjd.com.cn/content/s6a2bfd65d5de97bd7464c3db.html', // 北京互联网法院供稿
  'https://xinwen.bjd.com.cn/content/s66249aa1e4b064178156893f.html', // 海淀区人民法院官方，北京 AI 一键去衣案
  'https://xinwen.bjd.com.cn/content/s6168f10ce4b08aed9d8a566a.html', // 扬州市公安局江都分局，二维码套现案
  'https://www.bjcourt.gov.cn/cpws/paperview.htm?id=d9b9eef791a44e1798920d1a896c419e&n=1', // 北京法院审判信息网，金某某破坏计算机信息系统案
  'https://ga.lasa.gov.cn/lsga/jwxw/202503/00a60419366a450bbc87f3413e6e154a.shtml', // 拉萨市公安局，冒充领导亲属诈骗案
  'https://hzsc.hangzhou.com.cn/content/content_7015476.htm', // 上城区法院案件通报
  'https://z.hangzhou.com.cn/2022/wangan/content/content_8269934.htm', // 杭州网警以案说法，假冒 imToken 钱包盗币案
  'https://mp.weixin.qq.com/s/zm3kcgvf3bselnsmgdcglq', // 扬州经济技术开发区人民检察院官网要闻列表指向的官方微信原文
  'https://delhihighcourt.nic.in/app/showlogo/1669383973237_80487_2022.pdf/2022', // 德里高等法院官网 PDF，Amitabh Bachchan 人格权临时禁令
  'https://news.cctv.com/2025/12/17/ARTIP5TCJFTBanuU5hioemaE251217.shtml', // 央视新闻采访广州海关缉私局，走私孕妇血样系列案
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
  'https://mp.weixin.qq.com/s?__biz=mziyotaymjyyng==&mid=2650559154&idx=1&sn=09b817d995126acdf25c3dca552ac662&chksm=f041fc7fc7367569868f18818e306b0c5566798c7d43df51844d7e13cda1f644f7fa507fb96a&scene=27', // 钦南法院官方微信
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
  'https://web.guardiacivil.es/es/destacados/noticias/la-guardia-civil-desmantela-una-red-de-phishing-bancario-y-detiene-al-principal-desarrollador-de-kits-de-robo-de-credenciales-en-espana/', // 西班牙国民警卫队官方通报，GXC Team 银行钓鱼工具网络
  'https://www.group-ib.com/media-center/press-releases/guardia-civil-gxc-team-takedown/', // Group-IB 官方协查公告，GXC Team AI 增强钓鱼工具网络
  'https://peking.bjd.com.cn/content/s649a2d5fe4b042ca9e8e4fb9.html', // 北京法院审判信息发布账号，供稿朝阳法院
  'https://jsnews.jschina.com.cn/jczx/202502/t20250218_s67b41f81e4b04dff9907e0f5.shtml', // 江苏检察在线来源，太仓市人民检察院官网宣传看点索引指向
  'https://news.qq.com/rain/a/20250415a08y8c00', // 上海市徐汇区新闻办公室官方账号托管页
  'https://news.qq.com/rain/a/20260605a03qyh00', // 乐山市人民政府新闻办公室官方账号托管页
  'https://new.qq.com/rain/a/20260613a06iov00', // 株洲九郎山公安官方托管页
  'https://new.qq.com/rain/a/20260612a03gzu00', // 株洲警事官方托管页
  'https://weibo.com/2508053484/lzdbhlssp', // 腾讯 QQ 官方微博回应盗号事件
  'https://www.bilibili.com/opus/1213283855504506887', // 虹吸工作室官方动态，Project GT 虚假众筹声明
  'https://news.ifeng.com/c/8ocjypfqor1', // 凤凰网托管公安部网安局游戏外挂通报
  'https://m.thepaper.cn/baijiahao_28782951', // 延津县人民法院官方澎湃号
  'https://www.thepaper.cn/newsdetail_forward_2921336', // 浙江法院系统政务稿，首例恶意注册账号案
  'https://static.nfapp.southcn.com/content/202104/01/c5049044.html', // 南方+承载蕉岭公安发布，内外勾结非法获取企业数据案
  'https://ipr.mofcom.gov.cn/article/gnxw/qt/202112/1966903.html', // 商务部知识产权栏目转载常熟市场监管跨平台盗图处罚
  'https://www.sohu.com/a/1037162346_99923255', // 《方圆》杂志原创，徐州经开区检察院审查起诉
  'https://web.archive.org/web/20220621092007/https://weibo.com/6329746106/LyKD2xUk8', // 学习通官方微博数据泄露传闻声明存档
  'https://view.inews.qq.com/a/20251205a03wsm00', // 抖音黑板报官方托管页，盗号黑产治理公告
  'https://view.inews.qq.com/a/20250821a025up00?scene=qb_ranking', // 公安部网安局官方托管页，弱支付密码盗刷案
  'https://mp.weixin.qq.com/s/wsro3i0l02fku9gr0o9gfw', // 公安部网安局官方微信，变脸软件解封涉诈账号
  'https://mp.weixin.qq.com/s?__biz=mjm5nzc5mzmwmg==&mid=2657509714&idx=1&sn=ea2791b3a16cd87c205a988970e63d9f&chksm=bca72fc0e30cef6f8cca4d60cabf4574670190e0eb8736e5a8a402373d0fc786bb7fef3a4f08&scene=27', // 公安部网安局官方微信，AI 仿冒名人直播带货行政拘留案
  'https://content-static.cctvnews.cctv.com/snow-book/index.html?item_id=16452910468894153646&track_id=06cab3b6-40f2-45f6-b2ee-15f8dc4ae04d', // 央视新闻客户端转述沁水公安 USDT 洗钱案
  'https://xinwen.bjd.com.cn/content/s659b6e44e4b0f6c5abd4836a.html', // 北京日报托管公安部网安局数据泄露处罚通报
  'https://xinwen.bjd.com.cn/content/s683f8979e4b0380e186cf999.html', // 北京日报托管公安部网安局/陕西网警非法薅羊毛案
  'https://mp.weixin.qq.com/s?__biz=mziwnzexnti5ma==&mid=2649895992&idx=1&sn=2db768454308aea8661283b04870a38d&chksm=8e40cffb5980f6350bf9e907cc441b820572068c2b4b5e6215a0f98ae38e4b465829b53ca1a4&scene=27', // 上海高院官方微信，临期食品恶意索赔案
  'https://www.zhongyuan.gov.cn/rdhy/9581840.jhtml', // 政府门户转载抖音黑板报官方治理公示
  'https://jubao.xzdw.gov.cn/zxdt/202308/t20230826_390432.html', // 西藏自治区党委保密办/自治区国家保密局，保密典型案例
  'http://putian.pafj.net/caw/f/10/view-225-766722.html', // 莆田长安网检察院栏目，中共莆田市委政法委员会主办
  'https://www.msxf.com/news/xwxq/1326', // 马上消费金融官网，反催收团伙协查公告
  'https://news.qq.com/rain/a/20260402a067vo00', // 腾讯新闻承载《三角洲行动》官方账号安全公告
  'https://view.inews.qq.com/a/20240926a05rcb00', // 警民直通车上海官方托管页，国际通用礼品卡非法汇兑案
  'https://x.com/alvierid/status/1999403353466421320', // 安全研究人员原始披露
  'https://x.com/iloveponzi/status/1488354391401054216', // larrylawliet.eth 本人说明 Moshi Mochi Discord 被黑和假 mint 链接
  'https://etherscan.io/address/0x6d0267156f1c6CE44Caa4BF129B76009d3d41830', // larrylawliet.eth 链上地址页面
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
  'https://polymarket.com/event/ukraine-agrees-to-give-trump-rare-earth-metals-before-april/ukraine-agrees-to-give-trump-rare-earth-metals-before-april', // Polymarket 官方市场页
  'https://www.toutiao.com/w/1813324433807370/', // 字节跳动官方账号澄清
  'https://dj.sina.com.cn/article/iznezxt0458042.shtml', // 新浪电竞承载 DOTA2 官方公告
  'https://www.facebook.com/100084504854473/videos/a-statement-on-the-recent-upload-of-ai-music-impersonating-my-voice-onto-major-s/892417137070162/', // 艺人本人声明
  'https://news.cctv.cn/2024/11/05/ARTIoH6Pv5aQFgb3LONjc3Kc241105.shtml', // 央视网转载北京市第一中级人民法院法官署名案例
  'https://www.elawcn.com/ecommerce/2021/0611/845.html', // 法律教育网转载人民法院刑事判决书文本
  'https://www.freebuf.com/articles/network/216918.html', // FreeBuf 原创应急响应分析
  'https://sichuan.scol.com.cn/ggxw/202605/83260828.html', // 四川在线承载公安部网安局通报
  'https://xinwen.bjd.com.cn/content/s61ac6df9e4b04441fdd04169.html', // 北京日报客户端发布海淀区检察院白皮书
  'https://finance.sina.com.cn/wm/2026-05-08/doc-inhxcusr4543179.shtml', // 新浪承载公安部网安局官方账号通报
  'https://mp.weixin.qq.com/s?__biz=mzi1nji5nju4mq==&mid=2247515266&idx=1&sn=4c6c087308a789b4669772ec8f2aef63&chksm=ebb9ea1c5e83f82dcf46c7304595a7abc3ee3d420411372888f73739ee36d90e19404816526b&scene=27', // 公安部网安局官方微信，烟台莱山勒索病毒通报
  'http://finance.sina.com.cn/wm/2026-05-08/doc-inhxcyyr4271612.shtml', // 新浪承载公安部网安局官方账号通报
  'https://finance.sina.com.cn/wm/2026-05-08/doc-inhxcusr4594497.shtml', // 新浪承载公安部网安局官方账号通报
  'http://www.chinapeace.gov.cn/chinapeace/c100052/2021-10/18/content_12548925.shtml', // 中国长安网，郑州内鬼侵犯公民个人信息案
  'https://www.gipc.gov.cn/res/pdfFile/6a7f6b6d-f68c-4a22-903a-480c8acc53cc.pdf', // 广东省高级人民法院典型案例，AI 换脸非法获取计算机信息系统数据案
  'http://www.chinapeace.gov.cn/chinapeace/c100045/2025-12/16/content_12815785.shtml', // 中国长安网，短视频带货诈骗团伙案
  'https://mp.weixin.qq.com/s?__biz=mjm5mtczodg0ma==&mid=2649821281&idx=1&sn=4c5cfd23a22fa9563581871847f89863&chksm=bfd3905763b3ba9d7dfed20dc74856a586350043733c7cdb9c8af73c163ab6d015f264768f97&scene=27', // 南京市场监管相关官方微信托管页，价格违法典型案例
  'https://mp.weixin.qq.com/s?__biz=MzIyMTk1NDkzMg==&mid=2247533157&idx=2&sn=27cc5dbb20b7d0500b59088f46c3f6ff&chksm=e836d47edf415d68d183b1dcbd10f684f5e4ebaeaea49c02209103ed06a95f24d32e7faee253&scene=27', // 茂县公安官方微信托管页，伪造转账截图诈骗通报
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
