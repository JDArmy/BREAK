# Change log

## 2.42.37

规避手段分类/有效性卡片移到定义后，改为 3 列网格

- 规避手段详情页的「分类」「有效性」卡片网格从 keywords 后移至「定义」section 之后，与风险详情页优先级/复杂度卡片紧跟定义的结构一致。
- 网格由 2 列改为 3 列（`repeat(3, minmax(120px, 1fr))`），与风险详情页 risk-meta-grid 的 3 列布局对齐；当前 2 个卡片占前两列，第三列留空。

## 2.42.36

规避手段详情页分类/有效性改为卡片+badge 布局，参考风险详情页样式

- 规避手段详情页的「分类」（AC01 防止/AC02 感知/AC03 识别/AC04 处置）与「有效性」（high/medium/low）由原来的纯文本 section 改为 `avoidance-meta-grid` 双卡片网格 + badge 布局，与风险详情页的处置优先级/风险复杂度卡片视觉一致：标题左上角，badge 水平+垂直居中。
- 分类 badge 按环节语义配色：AC01 绿（防止）、AC02 天蓝（感知）、AC03 紫（识别）、AC04 琥珀（处置）。
- 有效性 badge 按强度配色：high 绿、medium 琥珀、low 灰。
- 补充暗黑模式浅色文字变体保证对比度。

## 2.42.35

term-completeness 重评确认 52→0 + prompt 收紧（通用但相关不算 fail）+ 新增 Case 补 primary。

- **term-completeness 重评**：52 fail → 0（50 修复确认 pass，2 真实 fail）。重评后 prompt 调整：区分"通用但相关的 Avoidance"（A0054 合规治理/A0044 依法打击等，算 review 不算 fail）vs"完全不相关错挂"（真 fail）。调整后 T0146/T0423 重评 fail 0。
- **T0146 真过宽修复**：移除 R0150 杀猪盘（盒饭是冒充采购骗局，非杀猪盘投资诈骗）。
- **新增 Case 补 primary 源**（其他 session 新增的 C1831-C1844，admission 20 error 阻断）：起 subagent 用 Scrapingdog 搜源，9 个补 primary（C1831 普陀检察院/C1834 无锡中院/C1835 最高检/C1837 寿县法院/C1839 青羊检察院/C1843 Mandiant 等），3 个降级 news_report（C1832/C1836/C1842 无官方 primary）。source-classify 白名单扩充（cloud.google.com/普陀检察院公众号）。
- **C1840-C1844 补 relatedRisks**（其他 session 新增 Case 空 relatedRisks 阻断 schema）：C1840 R0016/R0034、C1841 R0012、C1842 R0096-001/R0053、C1843 R0081-005/R0059、C1844 R0094。
- README/home.ts/cases-loader 断言同步 cases 1760→1774→1777。
- validate:data 28 门禁全绿，build 通过。

## 2.42.34

usage-highlight--link 文字色由蓝色改为中性灰，避免被误认为链接

- 术语 usageExample 列表页高亮（`.usage-highlight--link`）原用链接色（蓝色），易被误认为可点击链接；改为中性 slate 灰（slate-700 浅灰背景），并补充暗黑模式 slate-200 文字色保证对比度。

## 2.42.33

修复 term-completeness 52 个 fail（relatedAvoidances 过宽/错挂），2 批 subagent 并行。

- **移除过宽通用项**（重点）：从 52 个 Term 移除 A0015（风控策略，对具体黑产术语过宽）。另按场景移除错挂：A0059/A0061/A0021（偏账号访问）、A0006-005/A0016-002（偏链接安全）、A0050/A0035/A0052/A0049（数据安全类与电诈/扫号无关）、A0046/A0057（合法信贷准入对非法放贷不适用）、A0051（安全意识培训）、A0042（功能随机化）等。
- **补场景特异防御**（保守）：T0003 补 A0005/A0077、T0013/T0015 补 A0020-001/A0077、T0033/T0037/T0065 补 A0024/A0075、T0099 补 A0018/A0026/A0001/A0021/A0004/A0007、T0262/T0264/T0265 补 A0001/A0006-007/A0020-003、T0297/T0301/T0317 等补 A0077/A0207、T0565 补 A0209/A0210、T0476 补 A0198。
- **移除不匹配风险**：T0476 移除 R0126/R0127、T0565 移除 R0247。
- sync:lateral-relations 重算，validate:data 28 门禁全绿，67 测试通过。

## 2.42.32

详情页 UI 优化：风险卡片布局/语言切换 loading/雷达图放大/badge popover/TermsView 警告修复

- **风险卡片布局**：处置优先级/复杂度卡片中，标题改为左上角，P0/中级等级 badge 在卡片剩余空间水平+垂直居中（原为整体垂直居中导致标题不在顶角）。
- **语言切换 loading**：中英文切换加载对应语言文件期间，语言切换 icon 临时替换为旋转的 loading icon，加载完成后恢复，避免切换时无反馈。
- **雷达图放大**：风险详情页雷达图尺寸增大 50%（max-width 420→630px，height 300→450px）。
- **badge popover**：鼠标悬停处置优先级（P0-P3）/复杂度（初级/中级/高级）badge 时，显示 tooltip 解释当前等级含义；新增 `riskPriorityLevelDesc`/`riskComplexityLevelDesc` 中英文 i18n 文案与 `.risk-badge-tooltip` 主题样式。
- **TermsView 警告修复**：补上缺失的 `selectedTerm` computed，消除 Vue 渲染警告「Property 'selectedTerm' was accessed during render but is not defined」。
- **前序改动一并入库**：relation-type 改为实体 ID 前 badge（4 个实体统一）、badge 语义配色与暗黑模式可见性、抽屉表格标题链接蓝色、移除抽屉顶部实体 ID 链接、关联图谱按钮文字、RisksView selectedRisk 警告修复、抽屉 relation-list 2 列布局。

## 2.42.31

重评确认 tool-risks/term-completeness/case-fact 修复效果，修真实 fail。

- **tool-risks 重评**：92 fail → 33 fail。修 6 个真实 direct/indirect 错划：AT0049 移除 R0016-001（挂人气不匹配）、AT0050 R0005-001 indirect→direct、AT0054-004 R0036 indirect→direct、AT0061 R0001-001 indirect→direct、AT0061-005 R0008 indirect→direct、AT0095 R0051 indirect→direct。27 个 STALE/HALLUCINATED fail（数据已正确，LLM 引用不存在的 risk ID）。重评 6 个改动 key 全 pass。
- **term-completeness 重评**：161 fail → 52 fail（降 68%）。剩 52 fail 多是 LLM 主观判断"风控策略过宽应换更具体关联"，保守不改。
- **case-fact 重评**：67 fail → 1 fail → 0。C1360 Value DeFi 改正漏洞机制（闪电贷→Bancor 公式 power() 不变量计算漏洞），title/summary/keywords 同步。
- sync:lateral-relations 重算，validate:data 28 门禁全绿。

## 2.42.30

4 个 subagent 并行修复 4 维度 fail：case-fact 重评+4 真实 fail、term-completeness 161、risk-avoidance 真实不匹配、tool-risks 92。

- **case-fact 重评**：67 fail → 4 fail（63 个已修复确认 pass）。剩 4 个真实 references 不匹配再修：C1305 换葛某案正确源（spp.gov.cn 专稿+凤凰网）、C1359 换 rekt.news Venus 攻击页、C1510 删错误缓存重抓、C1695 换 Tenable 原始报告+summary 重写。case-fact fail 清零。
- **term-completeness 161 fail 全改**：移除数据安全类错挂（A0050/A0035/A0049 等）、移除过宽 A0015 风控策略、补场景特异防御（电商补 A0077/A0208、信贷补 A0075/A0024、POS 补 A0207）。修正风险/工具/行为者错挂（T0238 炸码改挂 DDoS、T0437 狗催改挂反催收）。
- **risk-avoidance 4 个真实不匹配移除**：R0029-003/R0032-002 移除 A0009（时间限制对 CC/密码喷射无缓解）、R0051 移除 A0021（设备指纹对防逆向不匹配）、R0228 移除 A0055（漏洞识别对恶意包投毒不匹配）。50 个历史已修，90 缺少保守不补。
- **tool-risks 61 个 AT 修改**：移除 94 项完全不匹配风险关联（AT0024 GPS 伪造移除 R0050/R0002 等、AT0033-001 偷拍移除 R0082/R0112 等、AT0050 发贴机移除 R0002/R0003 等）、纠正 105 项 direct↔indirect 划分（indirect→direct 42、direct→indirect 63）。
- sync:lateral-relations 重算横向关系，validate:data 28 门禁全绿，68 测试通过。

## 2.42.29

case-fact 全量评审完成 + 44 个新 fail 事实错误修复，4 批 subagent 并行用 Scrapingdog 抓取核验。

- **case-fact 全量完成**：1772/1777 评完（5 个 LLM 失败），pass 947/review 758/fail 67。23 个已修（v2.42.27）+ 44 个新 fail。
- **44 个新 fail 修复**（4 批 subagent 并行）：
  - 批次A 11 个：C0737 保安队成员→外部人员、C0776 换央广网源、C0837 赎金表述、C0887/C0891/C0896 时间修正、C0897 行业归错、C0916 混淆两案拆分、C0934 9枚→99枚、C0973 连发视频主体、C0984 日期修正+title 加区分。
  - 批次B 11 个：C1026 法律依据、C1035 共同入侵者修正、C1064/C1069 抓取缓存误报补判决、C1107/C1161/C1252 时间修正、C1276/C1275 title/主体修正、C1305/C1311 罪名修正。
  - 批次C 11 个：C1322/C1352 攻击方法、C1323/C1335/C1372 时间、C1344 维度、C1359/C1360 换权威源、C1376/C1387/C1409 事实修正。
  - 批次D 11 个：C1423 双花攻击、C1424 美元≠元、C1471 改 academic_research、C1510/C1695 换匹配源、C1541/C1542/C1552 事实修正、C1707 误报改 title、C1757 删 5700 万混入、C1767 时间。
- **C0983/C0984 title 重复修复**（其他 session 去重遗留）：C0984 title 加日期区分。
- **README/home.ts/cases-loader 断言同步**：cases 1777→1760（其他 session 去重删 17 个）。

## 2.42.28

关系实体表格 ID 列去链接

- EntityLinkSection / DrawerEntityLinkSection 的 ID 列由链接(router-link/button)改为纯文本,仅保留标题列可点击跳转
- 降低视觉噪声:ID 列等宽静默展示,标题列蓝色加粗突出可点击

## 2.42.27

修复 case-fact 23 个 Case 事实错误（summary 与 references 网页事实矛盾），3 批 subagent 并行用 Scrapingdog 抓取核验。

- **批次A 8 个**：C0137 删除虚构的出售59339条个人信息、C0158 报案立案≠破获、C0166 补 2021年1月抓获、C0195 腾讯云转载非CSDN、C0208 接报≠破获、C0211 宣判 2018-05→2018-04、C0215 作案 2023-11→2024-11、C0233 判决 2025-01→2024-11。
- **批次B 8 个**：C0291 抓获 2023-05→2023-02、C0288 修正获利金额与分工、C0330 incidentTime 2025-12→2020-12、C0353 出售380万→获取380万售7万、C0375 2025年5月8000元→2024年5月800元、C0417 incidentTime 2022-02→2025-10、C0466 2024-03→2022-05、C0504 2022-05→2026-07。
- **批次C 7 个**：C0527 2021-01→2025-09、C0553 跨平台两次→单次维权、C0562 非法牟利38万→赠品市场价值38万、C0563 拼多多→淘宝、C0570 消费券套现→银行信用贷骗贷洗钱（全重写）、C0638 预算300万→280万、C0645 误删数据库→得知不续签后删除数据被合法解雇（全重写）。
- case-fact 全量评审进行中（done 880/1777，fail 30，新 fail 待后续修）。

## 2.42.26

关系图按钮改用 el-button type=default

- 4 个抽屉(RiskDetail/AvoidanceDetail/AttackToolDetail/ThreatActorDetail)detail-heading 的关系图按钮由原生 `<button>` 改为 `<el-button type="default" size="small">`,与旁边查看详情按钮风格统一
- 保留 relation-map-icon class 用于 margin 定位

## 2.42.25

抽屉同类关联跳转改嵌套抽屉

- 首页抽屉的同类关联(Risk→Related Risk、Avoidance→Related Avoidance、AttackTool→Related AttackTool、ThreatActor→Related ThreatActor)由新窗口改为开嵌套抽屉,统一"抽屉内链接尽量开新抽屉"的交互
- 4 个抽屉组件用 createRecoverableAsyncComponent 自引用(项目首个自引用先例),保留 relation type + note 渲染
- RiskDetail 顶层补 append-to-body=true,与其它嵌套抽屉统一
- 跨类嵌套、Case 新窗口、BusinessScene 路由跳转、知识库详情页 router-link 维持不变

## 2.42.24

修复 references 3 个 Case + fingerprintOf 脚本缺陷（对象数组指纹不区分内容）。

- **3 个 Case references 修复**：
  - C1684 恶意 Py 包 perfviewer：替换不符源为 OpenSSF 官方恶意包数据库 + O3 Security 分析。
  - C1719 亚马逊退款不退货限制：替换 Temu 不符源为亚马逊官方卖家后台 + Supply Chain Dive。
  - C1759 MFA 疲劳攻击：替换弱源为 CISA 官方通告 + Proofpoint 权威分析。
- **fingerprintOf 脚本缺陷修复**（scripts/llm/llm-review-runner.mjs）：原 `String(entity[f])` 对 references 等对象数组得到 `[object Object]` 不区分内容，改 references 后指纹不变导致评审误判"待评审 0"复用旧结果。改为对对象/数组字段 JSON 序列化后再哈希。此修复使 references 字段变化能正确触发重评。
- references 评审 3160/3200（fingerprintOf 修复后需重评 references 相关实体）。

## 2.42.23

修复 references 4 个高价值 Case 缺 primary 源。

- **C1610** 小度智能音箱偷拍：references 标题"升学宴"张冠李戴，替换为小度官方微博声明+中新网+搜狐。
- **C1622** OpenAI 语音克隆冒充拜登：补 FCC 官方 Declaratory Ruling + OpenAI 官方博客。
- **C1645** VR 社交游戏虚拟性侵：补 Wikipedia Virtual crime + BBC 原始报道。
- **C1657** Optus 影子 API 泄露 PII：补 OAIC 官方调查公告 + Salt Security 技术分析。
- references 评审 3106/3200 进行中。

## 2.42.22

修复 C1600 Mirai references + subagent 扩展修复（attack-tools description 补充 + Risk 横向关系 note 派生增强）。

- **C1600 Mirai 僵尸网络 DDoS**：references 从 1 个不符的 IEEE domain fronting 论文替换为 4 个权威源（CISA 官方通告 + KrebsOnSecurity 原始报道 + Wikipedia Dyn 攻击 + Cloudflare 技术分析）。
- **subagent 扩展修复**：AT0001-002 猫池卡 description 补实质内容（GOIP 语音中转/诈骗短信群发/验证码接收）、其他 attack-tools 字段完善。
- **校验脚本增强**：relation-note-utils.mjs 新增 `isDerivedRiskNote` + `expectedRiskRelationNote`（支持 Risk 横向关系 note 派生，variant/co-occurrence/prerequisite/escalation 四类）；check-entity-relations.mjs 修复 recordMap 对 Risk/ThreatActor 的支持；sync-lateral-relations.mjs 接入 Risk note 派生。
- references 评审 2996/3200 进行中。

## 2.42.21

修复 references 评审 53 fail（高价值 Case 缺 primary 源），起 2 批 subagent 用 Scrapingdog 搜索补源。

- **50 个 Case 补充权威 primary 源**（2 批 subagent 并行）：
  - 国际案例补官方源：C1132 Forbes、C1177 BleepingComputer、C1181 The Hacker News+JFrog、C1190 DOJ、C1213 FBI IC3、C1214 Cifas、C1216 NDSS、C1239 FinCEN、C1241 美联储、C1263 Black Hat+NVD、C1268 Microsoft TI、C1282 ACM、C1313 Okta、C1317 Okta+Microsoft、C1319 CISA、C1325 IBM、C1331 mr.d0x、C1404 Compound 官方、C1433 Helius。
  - 中国案例补权威源：C1243 央视网、C1246 扬州中院公众号、C1252 WCJB、C1255 澎湃+新民晚报、C1337 Sixth Tone、C1404/C1433 修正 incidentTime。
- **附带事实修正**：C1243 法院名+罚金、C1337 源 title 措辞、C1404 incidentTime、C1433 incidentTime+中断时长+事件年份。
- **source-classify.mjs 白名单扩充**：新增扬州市中院公众号 bizId 到 primaryWechat、xinmin.cn 到 secondary 域名。
- **清理 sourceType 字段**：subagent 误加 sourceType:"primary"（违反 referenceSchema strict 只允许 title+link），已统一清理 0 残留。
- 2 个保留现状（C1255/C1275 非高价值 news_report，无官方 primary，补 secondary 使 ≥2 源）。
- references 评审 2918/3200 已评，fail 53→0 真实。

## 2.42.20

修复 case-fact 3 个 Case 事实错误（101-159 批次评审 fail）。

- **C0118** 江苏网吧流量劫持案：references 网页是四川绵竹案（主体不符），换公安部正确源 mps.gov.cn（含江苏案 40 名抓获/600 余万元），补 summary 事实。
- **C0134** 世嘉游戏不正课金案：summary 述 2025-07/12名玩家/10亿日元，但世嘉官方公告是 2024-08 逮捕+有罪判决。incidentTime 2025-07→2024-08，summary 按官方公告重写，title 去掉矛盾数量。
- **C0151** 账号工厂案：summary 述"江苏检察机关披露"，但网页明确上海公安侦破。title/summary 改为上海公安/徐汇分局，补网页事实。
- 中英文同步，case-fact 101-159 批次 fail 清零。

## 2.42.19

修复 case-fact 试点 9 个 Case 的事实错误（summary 与 references 网页事实矛盾）。

case-fact 试点 100 个 Case（Scrapingdog 抓取 references 网页核验 summary 事实）：pass 49/review 42/fail 9。9 fail 全是真实事实问题：

- **时间冲突 5 个**：C0005 incidentTime 2025-07→2023-11（新华网报道年份）、C0012 summary 日期 2025→2024-12、C0078 incidentTime 2024-10→2024-09（上海检察报道）、C0095 公诉时间 2024-11→2024-08（早于 9 月获刑报道）、C0033 被告人数/时间按江苏检察网原文修正。
- **事实不符 2 个**：C0024 按光明网原文修正李某/郑某手法分工（手动抢号 vs 自动化抢号）、C0065 去掉"永久封禁"（网页显示是约谈，永久封禁是无关政治账号）。
- **错配 2 个**：C0045 换光明网+环球网源（原源是安徽芜湖案非山东枣庄刷单）、C0067 去掉"AI滥用"归类改"短视频恶意营销伪科普"（网页显示是伪科普专项非 AI 滥用专项），移除 AT0053/TA0041。
- 中英文 summary 同步，case-fact fail 清零。

## 2.42.18

修复 references 剩余 18 fail 实体（高价值 Case 缺 primary 源 + 标题不符）。

- **18 个实体全部修复**（补充权威 primary 源）：
  - 中国刑事案例 5 个：C0221 南方+央媒、C0838 桐乡法院+央视、C0888 人民网四川、C0896 河南省高院+管城法院、C0904 中国江苏网。
  - 中国通报案例 5 个：C0911 广西公安厅、C0913 人民网江苏、C0920 新浪财经、C0927 央视新闻、C0891 浙江省检察院（匹配本案细节）。
  - 国际案例 7 个：C0097 ICJ 法律原文、C0820 Verizon 官方 DBIR、C0828 Keepnet+FBI IC3、C0840 新华网+中国互联网协会、C0856 CISA+Chainalysis、C0863 360+奇安信、C0883 IBM 官方+PR Newswire。
  - 攻击工具 1 个：AT0037 补《风控要略》书籍章节。
- 3 个保留现状（C0097/C0840/C0920 为 news_report 非高价值，无官方 primary 但 2 源含 1 primary 达标）。
- case-fact 试点 100 个：pass 44/review 39/fail 9（fail 率 10%）。

## 2.42.17

修复 references 评审 112 个 fail 实体（标题不符 + 缺权威源），起 4 批 subagent 用 Scrapingdog 搜索权威替换/补充源。

- **112 个实体全部修复**（216 文件中英文同步）：
  - Risk 21：R0007-003 阿里妈妈细则、R0012 两高司法解释、R0052 市监总局价格欺诈规定、R0060 反洗钱法、R0082 最高检通报、R0260 拆单套费判决等。
  - Avoidance 17：A0015 风控国标、A0016-003 信通院号码标记、A0029-002 Spamhaus、A0105 BIP38、A0222 市监总局抽检等。
  - AttackTool 8：AT0013-001 Check Point、AT0034-002 中新网秒拨IP案、AT0038 北知院租号案、AT0045 最高法票务反挂案等。
  - ThreatActor 5：TA0001-001 公安部黑灰产案例、TA0028 游戏外挂团伙案等。
  - Term 18：T0288/T0289/T0300 最高检裸聊/资金盘/键盘手案、T0474 爬虫最高检+海淀法院、T0482 反垄断法、T0558 银保监会套现通知等。
  - Case 43：C0338 上海检察、C0432 江西政法网、C0784 NVD+GitHub Advisory、C0773 国家密码管理局等。
- 大量替换为 .gov.cn/court/检察院/国标/安全厂商等一手 primary 源，高价值 Case 补足 ≥2 源含 primary。
- 中英文 references 同步，Python/Node 直接 IO 避免数字串脱敏，英文 title 翻译清除中文残留。
- references 评审已评 2175/3200（被 killed 前进度），剩余 1025 靠增量门禁后续补。

## 2.42.16

修复 references 标题不符 18 个实体 + case-relation 重评验证（fail 254→65，降 74%）。

- **references 标题不符修复（18 个实体，24 条 reference 替换）**：review-references 评审 fail，references 标题与实体内容严重不符。起 subagent 用 Scrapingdog 搜索 API 找权威替换源：
  - Risk 5 个：R0007-003 淘宝规则页、R0052 市监总局价格欺诈规定、R0054-002 邛崃检察院案、R0071-001 网信办 AIGC 办法、R0082 最高检通报。
  - Avoidance 4 个：A0015 国标风控指引、A0016-003 工信部实名登记规定、A0029-002 Spamhaus IP威胁列表、A0105 BIP38 加密私钥标准。
  - AttackTool 6 个：AT0007 检察院改机案、AT0013-001 Check Point Research、AT0034-002 中新网秒拨IP案、AT0037 顶象设备指纹、AT0038 北知院游戏账号租赁案、AT0050 光明网+新浪检察院水军案。
  - ThreatActor/Term 3 个：TA0018 两高司法解释+Mandiant、TA0022 最高法知产庭+FBI、T0023 公安部净网+抖音治理。
  - 保留 16 个（现有源实际相符，LLM 过严）。
- **case-relation 重评验证**：v2.42.15 修复后重评，pass 885→991，fail 254→65（降 74%）。剩 65 fail 多是唯一 risk 错配无替代的边界情况。
- 中英文 references 同步替换，写文件用 Python/Node 直接 IO 避免数字串脱敏。

## 2.42.15

case-relation 全量 254 fail 深度甄别修复（之前误标为"LLM 主观判断保留"，重新审视发现大量真实错配）。

起 4 批 subagent 独立甄别 254 个 fail，实际修复 ~204 个 Case 的 relatedRisks/relatedAttackTools 错配，~50 个保留（唯一 risk 无替代或 LLM 过严）。

- **风险替换（核心修复）**：大量行为方向相反/业务不同的错配纠正：
  - 删除差评≠恶意差评（C0184/C0185/C0186 保留 R0015 因无删评风险，但 C0641 等改 R0015）
  - 倒卖火车票→账号盗取（C0153 R0011→R0032）、伪劣种子→违规违法商品（C0178 R0014→R0026）
  - 传销返利→虚假裂变（C0089 R0007-004→R0005-002）、虚假退货→退货造假（C0056/C0059 R0005→R0054-002）
  - 区块链攻击细化（C1518 等供应链投毒、C1553 跨链桥洗钱、C1651 虚假交易操纵）
  - APT/数据泄露纠正（C1611/C1739 智能家居窃听/RAG越权→数据泄露）
- **工具移除（~80 个）**：移除与 summary 无证据的工具关联（AI 深伪/数据投毒/手机木马/虚拟机等误关联）。
- **子风险替换父级**：summary 明确场景时子风险换父级（R0017-001→R0017、R0071-001→R0071 等）。
- **保留 ~50 个边界**：唯一 risk 错配但无更贴切替代（如删评无对应风险、空壳公司无对应风险），review 级不阻断。

## 2.42.14

修复 risk-avoidance 关联错配（移除 Risk.avoidances 中不匹配的规避手段）+ case-relation 6 个工具错配。

- **risk-avoidance 关联错配修复（17 个 Risk）**：review-risk-avoidance 评审 fail，Risk.avoidances 关联了与攻击向量不匹配的规避手段。移除明显不匹配项：
  - R0032 撞库移除 A0063（密码复杂度对撞库无直接缓解）
  - R0084-002 EIP协议钓鱼移除 A0007（身份认证对协议钓鱼缓解弱）
  - R0084-003 二维码钓鱼移除 A0013/A0013-001（移动加固是攻击者工具非防御）
  - R0084-004 域名仿冒移除 A0010（设备指纹对域名仿冒缓解弱）
  - R0117/R0127/R0132/R0136/R0146/R0150 等移除 A0018/A0013/A0026/A0016 等不匹配项
- **A0013-001/A0157 引用恢复**：subagent 误移除导致两个 Avoidance 孤立。A0013-001（Android应用加固）改归 R0051（应用被逆向，更贴切）；A0157（零知识KYC）恢复到 R0185（虚拟世界资产盗窃，Web3 身份验证防盗）。
- **case-relation 6 工具错配修复**：C0512 移除反编译/LLM攻击工具、C0803 移除提示注入工具、C1120 移除 LLM攻击工具、C1313 移除 Agent劫持工具、C1527 移除信息窃取器、C1820 移除地理位置欺诈/手机虚拟定位（无人机GPS欺骗非手机定位）。
- **回滚 avoidances relatedAvoidances 误改**：subagent 误改横向关系字段（自动维护），git checkout 回滚后跑 sync:lateral-relations 重算。
- **case-relation 全量完成**：1776/1778 评完，pass 885/review 637/fail 254。fail 254 多是 LLM 对"风险与 summary 匹配度"的主观判断（如营销作弊对退货欺诈），保留为边界判断。

## 2.42.13

修复 granularity/risk-scene/should-extract 评审检出的 6 个真实数据问题。

- **AT0054 漏洞利用工具聚焦**：description 从"扫描/挖掘/利用混合"改为聚焦漏洞利用核心（EXP 构建/载荷投递/提权/利用框架），排除上游扫描挖掘。granularity fail→review。
- **AT0083 OT与物联网协议工具重写**：title "工业与车联网协议利用工具"→"OT与物联网协议利用工具"（原 title 漏医疗/边缘），description 重写为统一的 OT/IoT 协议层攻击面叙事，与 directCauseRisks 对齐。granularity fail→pass。
- **T0412 合并入 T0307**：T0412（一手操作）与 T0307（一手直盘）实质重复，删 T0412，内容（aliases/keywords/related*）并入 T0307。terms 593→592。顺带移除 T0307 损坏的脱敏 zhihu 链接。
- **R0091 加入游戏账号接管场景**：R0091 游戏洗号加入 BS06/RS07（账号接管与身份盗用）。risk-scene fail→pass。
- **AT0053 AI滥用工具集上位类定位**：description 重写为"AI 黑产工具集上位分类"，按生成模态枚举 7 个子工具，明确与单点工具边界。granularity fail→pass，should-extract fail→review。
- **T0386 野路子 category 信贷欺诈→非法经营**（无牌照非法放贷平台属非法经营金融业务，非借款人信贷欺诈）。
- R0239 漏归电商营销场景（已处理，旧 report 缓存）；R0174/R0202 重复（R0202 已删，旧 report 残留）。

## 2.42.12

删除虚构案例 C0003（classification 评审检出）。

- **删除 C0003 洗脚店重放攻击类比**：C0003 summary 是"以洗脚店办卡消费为例...形象说明重放攻击本质"，纯虚构科普类比，无真实事件要素，违反 Case 定义（"真实发生的具体安全事件"）。references 是博客园技术文章。删除中英文文件，cases 1778→1777。
- **测试 fixture 同步**：useCases.test.ts/layoutAndCases.test.ts 的 C0003 fixture 换成真实案例 C0004/C0012；cases-loader.test.ts 案例数断言 1778→1777；data-integrity.test.ts 经 generate:home-counts 刷新后通过。
- **README/README_CN 案例数 1778→1777**，home.ts 计数刷新，DATA_SCHEMA.md 同步。

## 2.42.11

跑 `review:case-relation` 全量（870/1778 已评）修复 Case 关联错配，重评 classification 验证 Case category 修复效果。

- **Case 关联错配修复（~80 个）**：review-case-relation 评审 fail，Case 的 relatedRisks/relatedAttackTools/relatedThreatActors 与 summary 不符。起 subagent 分 4 批甄别修复：
  - 移除与 summary 明显不符的工具关联（如 C0034 summary 是 AI 换脸却关联批量注册器→移除；C0698 关联 92 个工具精简至 5 个相关工具）。
  - 子风险错配替换为父级或更匹配风险（如 C0197 R0016-002 批量关注→R0001 流程自动化；C0294 R0029-002→R0159 智能合约漏洞）。
  - 保留 ~90 个边界情况（relatedRisks 仅剩 1 个且无更贴合替代，受非空约束保留；或 LLM 过严）。
- **classification 全量重评验证**：cases fail 173→10（163 个修复），risks fail 42→1（prompt 修复生效），avoidances fail 6→0，terms fail 25→12。总 fail 246→23，降 90%。
- **cases 剩 10 fail 边界核实**：C1206/C1763 改为 academic_research（攻击手法技术分析非具体事件）；C0003 建议删除（虚构科普类比，待用户确认）；其余 7 个保留（C0021 OWASP 标准文档/academic_research、C0097 司法原则分析/news_report、C0295/C1400/C1444/C1556 学术论文或技术方案/academic_research、C0343 警方通报/news_report——LLM 与 subagent 判断分歧的边界）。

## 2.42.10

跑 `review:classification` 全量重评验证 v2.42.9 的 Case category 修复效果，并修复 Term/Avoidance 的 category 错配。

- **Term category 错配修复（15 个，中英文同步）**：LLM 评审检出 Term.category 与 definition 语义不符，逐条甄别后修复：
  - 跑分洗钱误判 5 个：T0288 铯聊/T0289 资金盘/T0300 键盘手 → 电信诈骗（诈骗前端非洗钱）；T0292 盗刷 → 金融犯罪；T0430 砖头 → 跑分洗钱（洗钱结算特征）。
  - 业务欺诈误判 3 个：T0244 仓播/T0259 高粉号 → 营销欺诈（直播带货/虚假营销刷量）；T0279 水上 → 平台治理（合规推广渠道非欺诈）。
  - 业务安全误判 3 个：T0551 PIA → 合规管理（隐私合规）；T0587 固件签名/T0610 安全停机 → 安全防护（底层/物理安全机制）。
  - 其他：T0031 一机多单 → 金融犯罪（POS 套现）；T0084 跳转号 → 黑产资源（账号交易）；T0487 改机工具 → 黑产服务；T0601 OWASP 自动化威胁 → 攻击手段。
  - 保留 10 个边界情况（T0044 进件/T0063 网花/T0075-001 二手料/T0099 扫号/T0161 担保双压/T0180 神父/T0303 无卡人头/T0327 电子卡/T0533 制品库/T0542 临时凭证）——与父/同类一致性或无更贴切类，LLM 过严。
- **Avoidance category 错配修复（6 个）**：A0151 AC04→AC01（灰度发布是预防非处置）、A0169 AC02→AC03（白名单匹配判定）、A0184/A0206/A0234 AC02/AC03→AC01（主动阻断/防泄漏是预防）、A0236 AC03→AC04（审计追溯是处置）。顺带修 A0151 complexity "中级"→"intermediate"（schema 要求英文枚举）。
- **classification prompt 修复验证**：v2.42.9 修的 review-classification prompt（明确 Risk 无 category 不评）生效，risks fail 42→1（41 个 category 误判消失，剩 1 个 R0107 complexity 边界判断保留）。
- **avoidances fail 6→0**，**terms fail 25→12**（12 个保留是边界情况）。

## 2.42.9

跑 `review:classification` 全量检出 246 个 category 错配 fail，起 subagent 分 4 批甄别修复 166 个 Case 的 category 字段。

- **Case category 语义错配修复（166 个）**：LLM 评审检出 category 与 summary 内容不符，逐条独立甄别后修复：
  - **criminal_verdict → news_report（~95 个）**：警方破案通报/刑拘/立案/批捕阶段（未到法院判决）误标 criminal_verdict；民事纠纷（不正当竞争/著作权/合同/借贷）误标 criminal_verdict（无民事枚举归 news_report）。
  - **administrative_enforcement → news_report（~10 个）**：平台内部治理公告/运营商限速/巡视整改误标行政执法（非政府行政行为）。
  - **→ security_incident（~25 个）**：真实网络安全事件（NSA 入侵华为/西工大、3CX 供应链攻击、Petya/NotPetya、真主党对讲机爆炸、Canva/23andMe 数据泄露等）误标 news_report/academic_research/criminal_verdict。
  - **→ academic_research（~7 个）**：技术方法研究/法律解读/开源工具项目误标 news_report/vulnerability_advisory。
  - **→ criminal_verdict（2 个）**：C1026 出借账户帮信罪、C1823 永嘉法院职务侵占罪，确有法院刑事判决，从 news_report 升级。
- **高价值 Case 补 primary 第二源（10 个）**：category 升级为 security_incident/criminal_verdict 后触发高价值案例 ≥2 源且含 ≥1 primary 门禁，补权威第二源：C1823（永嘉检察院）、C0634（淘宝规则页）、C0788（国家计算机病毒应急处理中心）、C0789（CNCERT）、C0810（CISA）、C1026（最高人民法院）、C1206（腾讯官方微博）、C1322（微软安全博客）、C1444（EIP-155 GitHub）、C1581（Wikipedia）。C1165/C1296 找不到可靠官方源保留 warning（不阻断）。
- **关系测试快照同步**：AT0001 等攻击工具 directCause/indirectSupport 划分修正后（R0005-001 电话黑卡→营销作弊属间接支持），更新 3 个关系图谱测试期望的 sourceFields/relationType，全 267 个 relation 测试绿。
- **顺带**：DATA_SCHEMA.md 同步、review-progress-baseline.json 更新。

## 2.42.0

强化实体校验：建立三层门禁体系（A 类机器强约束 + B 类 subagent 交叉判断 + C 类 LLM+抓取），让新增/修改实体默认完善，严进严出。

- **第一层·A 类机器强约束（接入 `validate:data` 硬链，error 阻断 build）**：把可枚举/可正则/可查表/可编辑距离的规则全部下沉为机器脚本，新增 10 个 + 增强 4 个：
  - 新增：`title-dedup`（精确/归一化/编辑距离近义）、`title-format`（Term.title 括号/间隔号/顿号/过长，CLAUDE.md 已禁但无脚本管）、`updated-sync-gate`（内容变更但 updated 未刷新）、`id-continuity`（主 ID 跳号）、`generic-phrase-blocklist`（套话短语黑名单）、`case-category-domain-consistency`（Case.category 与 refs 域名特征）、`risk-complexity-coverage`（Risk.complexity 与 AC 覆盖）、`case-summary-relation-consistency`（Case.summary 与 related* 交叉）、`term-category-enum`（Term.category 沿用已有取值，含 allowlist）、`entity-granularity`（description 多场景拆分初筛 + 父子 title）。
  - 增强：`content-quality`（增 title 重复 + description≈title）、`references`（统一用 source-classify 的 11 个 weakDomains + title-domain 强信号不一致 + 根域首页）、`case-incident-time`（增 incidentTime 与 summary 年份一致性）、`avoidance-content`（扩充 PLACEHOLDER_LIM）。
  - references 权威性机器化复用 `source-classify.mjs` 的 250+ 域名白名单 + classifySource，不必丢 LLM。
- **第二层·B 类 subagent 交叉判断（`review:*` 命令，fail 阻断）**：需要读实体实际内容做语义交叉的规则，用 subagent 加载知识库已有实体内容判断。新增 9 个脚本：`review-risk-avoidance`（规避手段是否真能缓解风险 + 漏加）、`review-risk-scene`（应加其他业务场景）、`review-case-relation`（Case 与关联风险匹配）、`review-tool-risks`（directCause/indirectSupport 划分）、`review-actor-consistency`（自建/使用工具划分）、`review-term-completeness`（related* 漏挂）、`review-granularity`（合并/拆分双向 + title 近义终判）、`review-should-extract`（应提炼新风险/手段/工具/行为者/术语/案例）、`review-references`（权威性应补源）。
- **第三层·C 类 LLM+抓取（最小集）**：`review-case-fact`（Scrapingdog 抓取网页核验 summary 事实）、`review-field-density`（信息密度）、`review-classification`（category 语义贴切）。
- **基础设施**：统一 LLM client `scripts/llm/llm-client.mjs`（双模型 GLM-5.2/GPT-5.5，从 .env 读 LLM_*）；共享运行器 `llm-review-runner`/`subagent-review`（worker 池 + 断点续传 + 内容指纹 + 429 重试）；变更检测共享模块 `changed-entities.mjs`（抽自 auto-version，含 untracked 新文件检测，auto-version 改薄封装不回归）；全库加载 `llm-review-helpers.mjs`（补 common.mjs 对 terms/BS 缺口 + title 索引 + 相关实体加载）。`scripts/research/llm.mjs` 改兼容层保护旧 `review:avoidance-signal`。
- **编排与门禁**：`review:changed` 编排器（变更实体按类型分派 B+C 类 + 汇总）、`review:full` 全库指纹增量兜底、`.husky/pre-commit` 追加 `BREAK_REVIEW_ON_COMMIT=1` 可选触发（默认关不拖慢日常提交）。
- **文档**：`scripts/llm/README.md` 三层门禁速查、`CLAUDE.md` 补「LLM 评审体系」章节并更新过时 LLM 凭据信息。
- **顺带修复**：T0116 title 格式违规（"杀鱼盘（杀鱼、鲨鱼）"→"杀鱼盘"，括号内别名迁入 aliases）+ 英文 aliases 补 angler/fish cutter。

### 变更文件

- `scripts/llm/llm-client.mjs`、`llm-review-runner.mjs`、`subagent-review.mjs`、`README.md`（新建基础设施 + 文档）
- `scripts/validate/changed-entities.mjs`、`llm-review-helpers.mjs`（新建共享模块）
- `scripts/validate/title-dedup.mjs`、`title-format.mjs`、`updated-sync-gate.mjs`、`id-continuity.mjs`、`generic-phrase-blocklist.mjs`、`case-category-domain-consistency.mjs`、`risk-complexity-coverage.mjs`、`case-summary-relation-consistency.mjs`、`term-category-enum.mjs`、`entity-granularity.mjs`、`term-category-allowlist.json`（A 类新脚本）
- `scripts/validate/review-risk-avoidance.mjs`、`review-risk-scene.mjs`、`review-case-relation.mjs`、`review-tool-risks.mjs`、`review-actor-consistency.mjs`、`review-term-completeness.mjs`、`review-granularity.mjs`、`review-should-extract.mjs`、`review-references.mjs`（B 类 subagent 脚本）
- `scripts/validate/review-case-fact.mjs`、`review-field-density.mjs`、`review-classification.mjs`（C 类 LLM 脚本）
- `scripts/validate/review-changed.mjs`、`review-full.mjs`（编排器）
- `scripts/validate/content-quality.mjs`、`references.mjs`、`case-incident-time.mjs`、`avoidance-content.mjs`、`auto-version.mjs`（增强/改造）
- `scripts/research/llm.mjs`（兼容层）
- `package.json`（validate:data 链接入 A 类 + 新增 review:* scripts + version bump）
- `.husky/pre-commit`（可选 LLM 评审触发）
- `CLAUDE.md`（补 LLM 评审体系章节）
- `src/BREAK/terms/T0116.json` + `src/i18n/en/BREAK/terms/T0116.json`（顺带修复 title 格式）
- `src/BREAK/basic-info/main.json`（version/updated）

## 2.41.3

仓库卫生治理：消除构建产物入库漂移 + 修正过时文档计数。

- **`public/data/changelog.json` 改为 gitignore**：该文件是 `generate:changelog` 的构建产物，部署时 CI 会重新生成，入库后每次改 CHANGELOG.md 都制造漂移（历史已被连带提交 45 次）。现与 `public/data/` 下其余 7 个产物（break-data/stix/jsonld/manifest/quality-report）保持一致，`git rm --cached` 移出索引、加入 `.gitignore`。本地 dev 时 ChangelogView 有 404 容错，需要时跑 `npm run generate:changelog` 即可恢复。
- **`.gitignore` 补 `test-results/`**：Playwright/e2e 产物目录，此前 `coverage/`、`dist/` 都已忽略却漏了它，补齐规则缺口。
- **更新 `SKILL.md` / `SKILL_en.md` 计数表**：原表为历史快照（Risk 350/Avoidance 300/AttackTool 110/ThreatActor 70/Term 600/Case 1797/BusinessScene 18），与现状脱节。统一为 `.total` 口径（与 README/docs-consistency 一致）：382/318/118/75/593/1778/20，总数 3200+ → 3280+。
- **更新 `ADMISSION-STANDARD.md`**：`validate:data` 门禁数 14 → 18（链中脚本实际数量）。
- 清理本地 `.DS_Store` × 2（已被 gitignore，纯本地垃圾）。

## 2.41.2

清理无用历史脚本。

- **删除 `scripts/validate/measure-cross-refs.mjs`**：该脚本是 v2.33.0「互引用密度评估」任务的一次性只读测量工具，统计实体自由文本字段内嵌实体 ID 的引用密度。任务结论已写入 CHANGELOG，未接入任何 npm script / CI / import，重跑无意义；文本 ID 正确性防护已由 `audit-text-id-refs.mjs`（接入 validate:data）承担。删除不影响 build 与任何工作流。

## 2.41.1

为 10 个无案例风险补充真实案例 + 新增 Case incidentTime 校验门禁。

- **补案例（10 个，C1821-C1830）**：3 个 subagent 并行用 Scrapingdog 搜索 + WebFetch 核实，按"宁缺毋滥"筛选。覆盖风险-案例覆盖率 94.8% → 97.4%（362/382 → 372/382）。
  - 物流套利（4 个）：C1821 R0259-001 盲销诈骗（乐清案，criminal_verdict）、C1822 R0266 偷重漏重（上海青浦，criminal_verdict）、C1823 R0265 运价套利（温州永嘉，news_report）、C1824 R0263 散单套用（太仓案，criminal_verdict）
  - AI 安全（4 个）：C1825 R0273 BadVLA 后门（NeurIPS 2025）、C1826 R0274 跨模态注入（arxiv）、C1827 R0027-004 水印移除（NeurIPS 2024）、C1828 R0027-005 爬虫陷阱检测（ICISSP 2020）
  - 游戏+通用（2 个）：C1829 R0114 曲阜盗号案（news_report）、C1830 R0051-001 小红书接口破解（criminal_verdict，最高检+常州中院双 primary）
  - 弃用 3 个存疑 case：C1825 喜茶案（匹配度中等）、C1824 Nepenthes 硕士论文（权威性中等）、C1823 运价套利降级为 news_report（仅1源）
  - 剩余 10 个无案例风险（R0027-002/003、R0256/0257/0260/0261/0264/0264-001/002/003）：京东物流内部场景无公开判决或学术论文缺失，合理缺失
- **Case incidentTime 校验门禁**：新增 `scripts/validate/case-incident-time.mjs`（接入 validate:data --strict），强制 case 必须有 incidentTime（YYYY/YYYY-MM/YYYY-MM-DD）+ 年份合理性 + 日历合法性。配套 allowlist 豁免 7 个真无日期 case。系统补全 313+9 个 case 的 incidentTime（覆盖率 81.4% → 99.60%）。
- 配套更新：README/README_CN 案例计数 1768→1778、home.ts entityCounts、cases-loader.test.ts、DATA_SCHEMA.md。

### 变更文件

- `src/BREAK/cases/C1821-C1830.json`（新增 10 个中文 case）
- `src/i18n/en/BREAK/cases/C1821-C1830.json`（新增 10 个英文翻译）
- `scripts/validate/case-incident-time.mjs` + `case-incident-time-allowlist.json`（新校验门禁）
- `package.json` validate:data 链接入 case-incident-time
- `README.md` / `README_CN.md` / `src/BREAK/home.ts` / `src/BREAK/__tests__/cases-loader.test.ts`（计数同步）

## 2.41.0

移动端 LCP 优化：切断入口 chunk → 全量 BREAK 数据的静态依赖链。

- **根因**：`vite.config.mts` 的 BREAK 分组 `{ test: toChunkTest("/src/BREAK") }` 把 `entityRegistry.ts`（入口 router/MenuList 必需的轻量元数据，零业务依赖）和 `index.ts`（全量 barrel，静态 import 6 类实体 index）合并进同一 chunk。入口经 `main.ts → router → entityRegistry` 静态拉入该 chunk，barrel 静态依赖连带把全部实体数据 chunk（~1MB）拉进首屏 modulepreload，移动端 4x CPU slowdown 下 JS 解析执行主导 LCP（94% render delay）。
- **修复**：BREAK 分组前加 `{ name: "BREAK-registry", test: "/src/BREAK/entityRegistry", priority: 20 }`，让 entityRegistry 独立成 < 5KB 小 chunk，切断入口 → 全量数据链路。全量 BREAK 仍由 `import("@/BREAK")` 动态懒加载（HomeView 抽屉、i18n、搜索索引），逻辑不变。
- **效果**（lighthouse 移动端）：
  - FCP 7208ms → 2704ms（-65%，首屏内容绘制快 4.5 秒）
  - perf 59 → 70（+11），desktop perf 90 → 94（+4）
  - LCP 7662ms → 7404ms（小幅改善；剩余瓶颈为 HomeView 场景矩阵渲染，risks 数据 + 2257 DOM 元素，属后续 B3 范畴）
  - modulepreload 23 个 → 7 个，首屏不再加载 avoidances/attackTools/threatActors/terms 数据 chunk
- bundle-budget 通过（largestDataJs 296KB < 900KB 阈值）。

### 变更文件

- `vite.config.mts`：codeSplittingGroups 加 BREAK-registry 分组（entityRegistry 独立 chunk）

## 2.40.10

补强 pathExplorer 视角在现有浏览器测试中的基础覆盖（与 perspective-coverage 交互回归互补）。

- **smoke 加 pathExplorer 路由**：site-smoke.mjs routes 数组追加 `/#/relations/path-explorer/risk/R0001`，文本匹配 R0001/Path Explorer/Source/Target，提供最廉价的渲染兜底（9 路由）。
- **visual-review 加 pathExplorer 路由**：site-visual-review.mjs routes 数组追加 pathExplorer，3 视口截图（desktop/mobile/mobile-small）+ 桑基 canvas 像素断言（`.path-explorer-chart canvas`）。81 截图。
- **已知警告分类**：classifyKnownWarning 加 pathExplorer 移动端 el-tabs nav 溢出分支，归入已知移动端布局限制（与 relation-network 同类）。

### 变更文件

- `scripts/validate/site-smoke.mjs`：routes 加 pathExplorer
- `scripts/validate/site-visual-review.mjs`：routes 加 pathExplorer + classifyKnownWarning 加移动端 tab 溢出分支

## 2.40.9

补强 Playwright 浏览器覆盖：新增关系图视角覆盖测试，填补 pathExplorer 零覆盖与 analysis 交互回归缺口。

- **pathExplorer 视角覆盖**（此前零浏览器覆盖）：用例 1 断言控制面板元素可展示正确性（2 type-select / 2 entity-select / 2 param-slider / result 区）；用例 2 验证 v2.40.7 起点同步修复——从 attack-path 带实体切 pathExplorer 后起点实体显示 R0001，切 risk 视角再切回后 startKey 保留。
- **analysis 视角交互回归**（此前仅视觉截图）：用例 3 断言三列可展示（4 filter / coverage / path 项非空）；用例 4 验证 v2.40.7 rightAction/preserveScrollPane 修复——右列滚动后点 focus-node（经 rightAction 包装）scrollTop 保持 200，对照点左列 coverage-item（left preserve）右列归零，双向佐证 preserveScrollPane 逻辑。
- 复用 relation-stability.mjs 脚手架（findFreePort/waitForServer/错误收集/shouldRunOnMinorBump 守卫），`BREAK_FORCE_PERSPECTIVE_COVERAGE=1` 强制运行。

### 变更文件

- `scripts/validate/relation-perspective-coverage.mjs`：新建，4 用例覆盖 pathExplorer + analysis
- `package.json`：追加 `test:perspective-coverage` script

## 2.40.8

Code review 三轮修复：清理死代码透传 + 强化 dev 校验 + 测试 stub 对齐 + 补回归测试。

- **DetailColumn open-as-root 死代码清理**：DetailColumn 传 `show-open-as-root-action=false`，Header 按钮不渲染，Content 在该路径下永不 emit open-as-root。删除 DetailColumn 的 open-as-root emit 透传 + AnalysisPane 的 open-as-root 监听 + rightAction 不再包 openSelectedNodeAsRoot。（open-node-as-root 仍透传，因 InsightBlocks 的 RootPathBlock 可触发。）
- **dev 完整性校验强化**：RELATION_PERSPECTIVE_ROUTES 的 dev 校验从 console.error 改为 throw（强阻断，避免被忽略），并加反向校验（actualPerspectives 无重复视角）。
- **测试 stub 对齐**：RelationNodeDetailDrawer.test.ts 的 contentStub 删除已不 emit 的 copy-csv/view-detail/open-detail-new-window/open-node-detail 声明与按钮，反映 Content 实际 emits 契约。
- **补回归测试**：relationViewAssembly.test.ts 加用例"切视角回 pathExplorer 时 pathExplorerStartKey 保留为 relKey"，锁住 P0-2 修复点（原 syncFromRoot 未覆盖 route.name watcher 路径的 bug），防止未来重构恢复 watch(startType) 形式导致回归。

### 变更文件

- `src/components/relation/RelationAnalysisDetailColumn.vue`：删 open-as-root 透传
- `src/components/relation/RelationAnalysisPane.vue`：删 open-as-root 监听 + openSelectedNodeAsRoot 解构
- `src/views/relation/relationAnalysisPerspectives.ts`：dev 校验 throw + 反向校验
- `src/components/relation/__tests__/RelationNodeDetailDrawer.test.ts`：contentStub 对齐
- `src/components/relation/__tests__/RelationAnalysisPane.test.ts`：删 open-as-root 断言
- `src/views/relation/__tests__/relationViewAssembly.test.ts`：补切视角 startKey 保留用例

## 2.40.7

Code review 二轮修复：解决 preserveScrollPane 滚动保持回归 + pathExplorer startType 同步统一 + 死代码清理。

### P0 Bug 修复

- **P0-1 preserveScrollPane 滚动保持恢复**：RelationNodeDetailContent 恢复 emit（reset-attack-path-filters/focus-node/open-as-root/open-node-as-root，改 vm 状态触发父级 watch 的操作），RelationAnalysisDetailColumn 透传，RelationAnalysisPane 用 rightAction 包装（设 preserveScrollPane='right' 后调 vm 方法），恢复 analysis 右列 focus-node/reset/open-as-root 等操作的滚动保持（v2.40.6 删 emitRightAction 导致丢失）。不改 vm 状态的操作（copy-csv/view-detail 等）仍由 Content 直接调 vm。
- **P0-2 pathExplorer startType 同步统一到 assembly**：移除组件内 syncFromRoot flag + watch([relType,relKey]) + watch(pathExplorerStartType)，改 assembly 加 watch([relType, relKey]) 在 pathExplorer 视角时同步起点；组件用 startTypeModel computed setter 拦截用户手动切换（设 startType + 清空 startKey），assembly 直设 ref 不触发 setter（不清空 startKey）。修复切视角回 pathExplorer 时 startKey 被误清空（syncFromRoot 未覆盖 route.name watcher 路径）。

### P1 改进

- **P1-4 Drawer 死代码 emit 清理**：删除 RelationNodeDetailDrawer 模板 8 个死代码 emit 监听器（copy-csv/view-detail/open-detail-new-window/open-node-detail，Content 直接调 vm 不再 emit）。
- **P1-5 派生映射完整性校验**：RELATION_PERSPECTIVE_ROUTES 加 dev 模式完整性校验（import.meta.env.DEV），若 RelationPerspectiveKey 联合新增视角但漏加路由条目，dev 控制台报错（as Record 断言掩盖此缺失）。

### P2 评估

- **P2-6 Drawer 内联赋值**：评估后保留 `attackPathFilters = $event`（Vue `<script setup>` 模板内由编译器转发 .value，显式 .value 反而错误），不加注释（代码已清晰）。

### 回归测试

- RelationPathExplorerPane.test.ts 重写：startTypeModel setter 清空 startKey、assembly 直设 ref 不清空（3 用例，原 relType 同步测试移至 assembly）。
- relationViewAssembly.test.ts 加 3 用例：pathExplorer 视角 relType→startType 同步、非 pathExplorer 不同步、relType 相同时只同步 relKey。
- RelationAnalysisPane.test.ts 加 rightAction 测试：focus-node/reset/open-as-root/open-node-as-root 调 vm 方法。
- RelationNodeDetailDrawer.test.ts 适配：删除 copy-csv/view-detail 等死代码断言。

### 变更文件

- `src/components/relation/RelationNodeDetailContent.vue`：恢复 4 个 emit
- `src/components/relation/RelationAnalysisDetailColumn.vue`：透传 4 个 emit
- `src/components/relation/RelationAnalysisPane.vue`：rightAction 包装 + 解构补回
- `src/components/relation/RelationPathExplorerPane.vue`：startTypeModel computed + 移除 syncFromRoot
- `src/components/relation/RelationNodeDetailDrawer.vue`：死代码清理
- `src/views/relation/relationViewAssembly.ts`：watch([relType, relKey]) 同步
- `src/views/relation/relationAnalysisPerspectives.ts`：dev 完整性校验
- 测试：RelationPathExplorerPane/RelationAnalysisPane/RelationNodeDetailDrawer/relationViewAssembly

## 2.40.6

Code review 修复：解决 4 个 P0 Bug + 4 个 P1 设计/复用问题 + 4 个 P2 改进，含回归测试。

### P0 Bug 修复

- **P0-1 RelationAnalysisDetailColumn 迁移 inject + emits 链恢复**：B7-2 漏迁移的第 9 个子组件 RelationAnalysisDetailColumn 迁移到 inject（消除 28 props 钻取）；RelationNodeDetailContent 恢复 `update:attack-path-filters` emit（保留 5 个配置 boolean props），使 RelationAnalysisPane 的 `emitAttackPathFilters($event,'right')` 恢复触发，preserveScrollPane 滚动保持逻辑链修复（防 analysis 详情列调整筛选后滚动重置）。
- **P0-2 PathExplorer startType 同步恢复**：RelationPathExplorerPane 补 `watch([relType, relKey])` 同步起点跟随根节点（open-as-root 改 route.params 后起点更新），syncFromRoot flag 避免用户手动切换时清空 startKey。
- **P0-3 29 个英文 risk limitation 段同步**：B1 迁移 limitation 到 description 末尾时英文未同步，现 29 个英文 risk 文件 description 补 `Limitation: ...` 段。
- **P0-4 observables/references 静默跳过修复**：check-risk-assessment.mjs 英文 observables 校验 `if(zhObs && ...)` 改为报中文无对应；i18n-sync.mjs references 长度校验同类守卫同步修复。

### P1 设计/复用改进

- **P1-5 schema.mjs 复用 schema-loader**：消除内联 vite build，schema.mjs 改用 loadSchemaModule。
- **P1-6 perspective 映射单一来源**：RELATION_PERSPECTIVE_ROUTES 集中到 relationAnalysisPerspectives.ts，router/RELATION_PERSPECTIVE_BY_NAME/ENTITY_ROUTE_BY_PERSPECTIVE/PERSPECTIVE_ROUTE_NAME 均从它派生，消除 3 处重复映射。
- **P1-7 useRelatedEntities 泛型化**：改 `<T extends Record<string, Record<string, any>>>` 签名，消除 6 处 `as unknown as` 双重断言。
- **P1-8 useSearchCore watcher 泄漏修复**：watcher 加 stop 句柄，__resetSearchSingleton 调 stop 避免测试间 watcher 累积。

### P2 改进

- **P2-9 RelationView.test.ts stub**：inject stub 验证 provide 链（@vue/test-utils 限制不工作，回退固定文本 + 注释说明，inject 链由专属测试覆盖）。
- **P2-11 effectiveness 改 required**：318 个 avoidance 全量覆盖，optional 收紧为 required（与 limitation 一致）。
- **P2-12 效率优化**：check-risk-assessment.mjs 重复读 risks 合并到主循环；i18n-sync.mjs loadKeys/loadRecords 合并为 loadDir（省一半文件解析）。

### 回归测试

- 新建 RelationPathExplorerPane.test.ts（5 用例）：验证 relType→startType 同步、用户手动切换清空 startKey、syncFromRoot flag 行为。
- RelationAnalysisColumns.test.ts / RelationAnalysisPane.test.ts 适配 inject + stub 简化。

### 变更文件

- `src/components/relation/RelationNodeDetailContent.vue`：恢复 update:attack-path-filters emit
- `src/components/relation/RelationAnalysisDetailColumn.vue`：迁移 inject
- `src/components/relation/RelationAnalysisPane.vue`：清理未使用解构 + emitRightAction
- `src/components/relation/RelationPathExplorerPane.vue`：补 relType/relKey 同步 watch
- `src/composables/useRelatedEntities.ts`：泛型化签名
- `src/composables/useSearchCore.ts`：watcher stop 句柄
- `src/views/relation/relationAnalysisPerspectives.ts`：RELATION_PERSPECTIVE_ROUTES 单一来源
- `src/views/relation/relationRouteQuery.ts`：从单一来源派生
- `src/router/index.ts`：import RELATION_PERSPECTIVE_ROUTES
- `src/validation/breakSchema.ts`：effectiveness 改 required
- `scripts/validate/schema.mjs`：复用 schema-loader
- `scripts/validate/check-risk-assessment.mjs`：observables 孤儿检测 + 重复读合并
- `scripts/validate/i18n-sync.mjs`：references 孤儿检测 + loadDir 合并
- `src/i18n/en/BREAK/risks/` 29 个文件：补 Limitation 段
- 新建 `src/components/relation/__tests__/RelationPathExplorerPane.test.ts`

## 2.40.5

架构评审修复 B7 第 2 阶段：RelationView 剩余 8 个子组件全部迁移到 provide/inject，props 钻取彻底消除。

- **8 个子组件迁移**（#4）：RelationGraphContextMenu/RelationGraphTouchActions/RelationNetworkPane/RelationPathExplorerPane/RelationAnalysisPane/RelationNodeDetailDrawer/RelationNodeDetailContent + RelationSankeyPane 全部从 props/emits 改为 `inject(RELATION_VIEW_MODEL_KEY)`：
  - 响应式 state props → vm 的 ref/computed
  - 方法 emits → 直接调 vm 方法
  - v-model emits → 直接绑 vm 的 ref
  - 由 activeView 推导的 props（active/showRelationFetchActions/hideRelatedEntityActions）→ 组件内 computed
- **RelationNodeDetailContent 保留 5 个配置 boolean props**：showOpenAsRootAction/showRootRelationBlock/showCoverageBlock/showAttackPathBlock/hideRelatedEntityActions（Drawer 与 AnalysisPane 复用差异化开关，inject 不适合一次性配置）
- **RelationView 模板简化**：所有子组件自闭合 `<ComponentXxx />`，删除 31+24+28+17 等 props 传递与 emits 绑定。RelationNodeDetailDrawer 保留 `v-if="nodeDetailDrawerVisible"`。
- **测试适配**：RelationView.test.ts stub 简化（network-pane stub 改为点击调 vm.openNodeDetailDrawer）；RelationAnalysisPane.test.ts / RelationNodeDetailDrawer.test.ts 重写为 provide mock viewModel 模式。
- **验证**：type-check + 562 测试 + coverage 80.15% + build 全链通过。

### 变更文件

- `src/components/relation/`：8 个子组件迁移（RelationSankeyPane/RelationGraphContextMenu/RelationGraphTouchActions/RelationNetworkPane/RelationPathExplorerPane/RelationAnalysisPane/RelationNodeDetailDrawer/RelationNodeDetailContent）
- `src/views/RelationView.vue`：模板简化
- `src/components/relation/__tests__/RelationAnalysisPane.test.ts`、`RelationNodeDetailDrawer.test.ts`：重写
- `src/views/__tests__/RelationView.test.ts`：stub 适配

## 2.40.4

架构评审修复 #16：EntityAutoLinker mutation 批次大小阈值，防高频 DOM 变动积压。

- **mutation 批次阈值**（#16）：`EntityAutoLinker.vue` 的 `pendingMutations` 无上限，高频 DOM 变动页面（如关系图渲染）在 100ms debounce 窗口内可能积压大量 mutation 导致处理卡顿。加 `MUTATION_BATCH_LIMIT = 500` 阈值，超过立即 flush（不等 debounce）。抽 `processBatch` 函数复用 flush 逻辑。

### 变更文件

- `src/components/entity/EntityAutoLinker.vue`：processBatch 抽取 + 批次阈值

## 2.40.3

架构评审修复 B7（第 1 阶段）：RelationView 引入 provide/inject 消除 props 钻取，建立迁移基础设施与试点。

- **provide/inject 基础设施**（#4）：新建 `relationViewModelKey.ts`（`RELATION_VIEW_MODEL_KEY: InjectionKey<RelationViewModel>`）；RelationView setup `provide(KEY, viewModel)`，子组件可 `inject` 取代 props 钻取。
- **RelationSelectorBar 试点迁移**：从 4 props（relType/relKey/RelationTypeMapping/getCurrentEntityOptions）+ 2 emits（update:relType/update:relKey）改为 `inject(RELATION_VIEW_MODEL_KEY)`。relType/relKey 是 viewModel 的 ref，el-select v-model 直接绑定 ref（写回 `.value` 同步到 viewModel，不再需要 emit）。RelationView 模板删除对应 props 传递。
- **测试适配**：RelationSelectorBar.test.ts 改为 `provide` mock viewModel（含 ref），断言改为检查 viewModel.ref.value 变化（替代 emits 检查）；RelationView.test.ts 的 selector stub 简化。
- **响应性验证**：`<script setup>` 解构 ref 安全（ref 是对象引用），模板内顶层 ref 自动 unwrap。试点通过 type-check + 562 测试 + coverage 80.27%。
- **后续渐进迁移**：其余 9 个子组件（RelationAnalysisPane 31 props、RelationNodeDetailDrawer 24 props 等）可按同一模式独立迁移，风险隔离。provide/inject 基础设施已就位。

### 变更文件

- `src/views/relation/relationViewModelKey.ts`（新建）：InjectionKey
- `src/views/RelationView.vue`：setup provide + 删除 RelationSelectorBar props 传递
- `src/components/relation/RelationSelectorBar.vue`：props/emits → inject viewModel
- `src/components/relation/__tests__/RelationSelectorBar.test.ts`：provide mock viewModel
- `src/views/__tests__/RelationView.test.ts`：selector stub 简化

## 2.40.2

架构评审修复 B8：模板内重复 `getMessageStringArray` 调用清理，抽 computed 缓存。

- **清理重复 i18n 调用**（#17）：5 个文件的 keywords `getMessageStringArray` 在模板内 v-if + v-for 重复调用，抽为 computed 缓存：
  - `RisksView`：`selectedRiskKeywords`
  - `AttackToolsView`：`selectedAttackToolKeywords`
  - `AvoidancesView`：`selectedAvoidanceKeywords`
  - `ThreatActorsView`：`selectedThreatActorKeywords`
  - `TermDetail`：`keywords`（参照已有 `aliases` computed 模式）
- 每次渲染从 2 次全量 i18n 树查找降为 1 次 computed 求值（响应式缓存）。

### 变更文件

- `src/views/RisksView.vue`、`src/views/AttackToolsView.vue`、`src/views/AvoidancesView.vue`、`src/views/ThreatActorsView.vue`、`src/components/TermDetail.vue`

## 2.40.1

架构评审修复 B6（统一反查部分）：详情抽屉手写反查统一改用 `useRelatedEntities`，消除与 RisksView 的双实现。

- **统一反查**（#6 核心）：`RiskDetail`/`AvoidanceDetail`/`AttackToolDetail`/`ThreatActorDetail` 的手写 `Object.keys().filter()` 反查（descriptionTools/riskThreatActors/relatedTerms 等）改为 `useRelatedEntities` 工厂，与 `RisksView` 已用的实现统一。消除同一反查逻辑两套实现的维护负担。
- **未抽 DrawerDetailShell**：经评估，5 个抽屉模板差异大（RiskDetail 有 riskAssessment/priority badge、TermDetail 有 aliases/category/usageExample 且无关系图按钮），Shell slot 设计复杂、视觉回归风险高，而 header/ID 行/viewDetail 按钮的样板重复成本低。反查统一（核心价值）已完成，Shell 抽象留作后续可选优化。

### 变更文件

- `src/components/RiskDetail.vue`：descriptionTools/riskThreatActors/relatedTerms 改 useRelatedEntities
- `src/components/AvoidanceDetail.vue`：relatedTerms 改 useRelatedEntities
- `src/components/AttackToolDetail.vue`：relatedTerms 改 useRelatedEntities
- `src/components/ThreatActorDetail.vue`：relatedTerms 改 useRelatedEntities

## 2.40.0

架构评审修复 B5：路由表程序化生成，消除 34 条扁平路由中的重复模式。

- **路由表程序化生成**（#5）：`router/index.ts` 的 34 条路由从 `entityRegistry` 与 `RELATION_PERSPECTIVE_ROUTES` 派生：
  - home 族 12 条：`entityRegistry.filter(e => e.homeDetailRouteName)` 派生 `/home/{entity}/{id}` 与 `/business-scene/:bsKey/{entity}/{id}`
  - knowledges list/detail 12 条：`entityRegistry.flatMap` 配对生成 list 与 detail 路由，共用同一 View 组件（由 `route.params` 是否含 id 区分模式，不引入 RouterView 嵌套以保留 KnowledgeSplitView 左右联动）
  - relations 8 条：`RELATION_PERSPECTIVE_ROUTES.flatMap` 派生 4 视角 × 2 形态（pathExplorer 独立于 relationAnalysisPerspectiveOptions，故路由元信息独立维护）
  - `viewLoaders` 映射实体类型 → View 懒加载工厂
- **scrollBehavior homeRoutes 派生**：硬编码的 12 个 home 路由名数组改为从 `entityRegistry` 派生（与 SearchDialog 的 `homePageRoutes` 一致），消除新增实体时漏改同步风险。
- **路由名 diff 验证**：运行时校验 34 个路由名 + 关键 path 与原版 100% 一致，防外链/bookmark 失效。

### 变更文件

- `src/router/index.ts`：routes 数组与 scrollBehavior 程序化生成

## 2.39.4

架构评审修复 B4：tsconfig node 版本对齐 + RelationRouteShell 动态 import。

- **tsconfig node18 → node24**（#3）：`tsconfig.node.json` extends 从 `@tsconfig/node18` 改为 `@tsconfig/node24`，与 `.nvmrc`(24) 和 `engines`(>=24.0.0) 对齐。devDeps 同步更新。预检 `tsc --noEmit -p tsconfig.node.json` 无类型错误。
- **RelationRouteShell 动态 import**（#19）：`router/index.ts` 的 `RelationRouteShell` 从顶层静态 import 改为 `loadRelationRouteShell = () => import(...)` 动态工厂，8 条 relation 路由的 `component` 改用工厂。RelationRouteShell 不再进入首屏 chunk，与 `loadRelationView` 同 chunk 策略。

### 变更文件

- `tsconfig.node.json`：extends 改 @tsconfig/node24
- `package.json`：devDeps 去掉 @tsconfig/node18，加 @tsconfig/node24
- `src/router/index.ts`：RelationRouteShell 静态 import → 动态工厂

## 2.39.3

架构评审修复 B3：useSearch 单例化 + 模块拆分，消除多组件实例重复构建索引与重复注册 watcher 的隐患。

- **单例化**（#2）：`fuseInstances` 从函数作用域 ref 提升为模块级单例 ref，多次调用 `useSearch()` 共享同一份索引。watcher 用 `searchWatchersRegistered` flag 防重（参照 `useCases` 的 `localeWatchRegistered` 模式）。生产环境仅 SearchDialog 一个调用方，当前无实际 bug，但隐患消除且设计一致性提升。
- **模块拆分**（#7）：`useSearch.ts`（412 行）拆为 `useSearchCore.ts`（纯函数 FUSE_CONFIGS/buildIndexableItems/extractSnippetForSearch + 单例状态 + watcher）+ `useSearch.ts`（精简 hook）。对外 API 不变（SearchDialog 无需改）。
- **注入式单例**：useSearchCore 通过 `initSearchIndex(locale, messages, cases)` 接收全局单例 ref（vue-i18n 全局实例 + useCases 模块级 ref），watcher 引用注入的 ref，不依赖组件 setup，随 app 生命周期存在。
- **测试适配**：导出 `__resetSearchSingleton` 测试专用重置函数，beforeEach 调用清理单例避免测试间污染。
- **附带**：`useCases.ts` 的模块级 `cases` ref 改为 `export`，供 useSearchCore 直接访问（单例模式对齐）。

### 变更文件

- `src/composables/useSearchCore.ts`（新建）：纯函数 + 单例状态 + watcher
- `src/composables/useSearch.ts`：精简为 hook
- `src/composables/useCases.ts`：导出 cases ref
- `src/composables/__tests__/useSearch.test.ts`：适配单例（beforeEach 重置）

## 2.39.2

架构评审修复 B2：校验脚本补强，补齐 observables 长度、i18n 白名单、UI 文案 key 三处校验遗漏，清理 Case description 历史冲突。

- **英文 observables 长度校验**（#9）：`check-risk-assessment.mjs` 补齐英文 `riskAssessment.observables` 与中文源长度对比，防止 `mergeWithStructure` 按索引合并时错配。原 TODO 空实现填实。
- **i18n 白名单元校验**（#10）：抽 `schema-loader.mjs` 共享 Vite SSR build schema 逻辑；`i18n-sync.mjs` 加载 schema 后校验每类实体白名单 ⊆ schema 字段集，机器捕获幽灵字段（如历史遗留的 Case description）。完全自动推导不可行（references/riskAssessment 嵌套翻译边界需人工编码），故白名单仍手写但机器保证子集关系。
- **UI 文案 key 同步校验**（#12）：新建 `ui-i18n-keys.mjs`，递归对比 `zh-CN/index.json` 与 `en/index.json` 的 key 路径树，防止英文 UI 文案缺失导致 fallback 到中文产生混合语言 UI。接入 `validate:data` 链。
- **Case description 冲突清理**：`i18n-sync.mjs` Cases 白名单删 `description`（caseSchema.strict 已拒绝该字段）、`schema-docs.mjs` 文档表 Case 行删 `description`、`C1800.json`/`C1801.json` 删冗余 description（内容与 summary 完全相同的复制粘贴）。

### 变更文件

- `scripts/validate/check-risk-assessment.mjs`：英文 observables 长度对比
- `scripts/validate/i18n-sync.mjs`：白名单元校验 + Cases 白名单删 description
- `scripts/validate/schema-loader.mjs`（新建）：共享 schema 加载
- `scripts/validate/ui-i18n-keys.mjs`（新建）：UI 文案 key 同步校验
- `scripts/validate/schema-docs.mjs` + `DATA_SCHEMA.md`：Case 行删 description
- `src/i18n/en/BREAK/cases/C1800.json`、`C1801.json`：删冗余 description
- `package.json`：validate:data 链追加 ui-i18n-keys

## 2.39.1

架构评审修复 B1：Schema strict 全量落地 + references link 协议限制，补齐一致性与安全盲区。

- **references link 协议限制**（#1）：`referenceSchema.link` 在 `.url()` 基础上加 `^https?://` 正则校验，拒绝 `javascript:`/`data:`/`file:` 等伪协议。安全类知识库的引用链接必须为 http/https。
- **全量实体 schema 加 strict**（#8）：`riskSchema`/`avoidanceSchema`/`attackToolSchema`/`threatActorSchema`/`termSchema`/`businessSceneSchema` 以及嵌套的 `riskAssessmentSchema`/4 个 `*RelationSchema`/`referenceSchema` 全部加 `.strict()`，与 `caseSchema` 对齐。拒绝任何未定义字段（如 typo 字段），英文 i18n 误填结构字段时 schema 层先兜住。
- **历史脏数据清理**：strict 暴露 29 个 risks 文件带遗留 `limitation` 字段（Risk schema 不维护此字段）。逐条将有价值的 limitation 内容迁移到 `description` 末尾（"局限性："前缀）后删除字段，同步更新 `updated`。

### 变更文件

- `src/validation/breakSchema.ts`：link 协议校验 + 9 个 schema 加 strict
- `src/BREAK/risks/` 下 28 个文件：29 条 limitation 迁移到 description

## 2.39.0

Avoidance 内容规范三档控制落地：明确 description（检测信号）与 limitation（绕过方式+误报场景）的内容规范，schema 收紧 limitation 为必填，新增确定性校验（档位二，接入 CI 阻断）与 LLM 语义评审（档位三，手动跑）。

- **schema 收紧**：`breakSchema.ts` 的 `avoidanceSchema.limitation` 从 `z.string().optional()` 改为 `nonEmptyString`（必填），所有 Avoidance 必须含局限说明。
- **档位二·确定性校验**：新增 `scripts/validate/avoidance-content.mjs`，按"词集+长度+结构"组合规则校验 description/limitation 内容规范——AC02/AC03 的 description 必须含检测信号词，limitation 必须含绕过/误报词或写足 40 字。接入 `validate:data --strict` 阻断，`npm run audit:avoidance-content` 只出报告不阻断。
- **档位三·LLM 语义评审**：新增 `scripts/research/llm-review-avoidance-signal.mjs`，调用 DeepSeek-V4-Pro 语义判定 description/limitation 是否"真写了检测信号/绕过方式/误报场景"（非词集凑词）。支持 `--full` 全量审计与默认 `--incremental`（内容指纹检测变更，仅评审新增/修改手段）。`npm run review:avoidance-signal` / `review:avoidance-signal:full`，不接入 CI。
- **档位一·撰写规范**：CLAUDE.md 补《Avoidance 内容撰写规范》章节，明确 description/limitation 的内容导向、长度阈值、词集初筛与 LLM 兜底的关系。
- **存量补全**：补全 124 个 Avoidance 实体（中文+英文同步）的 description/limitation，其中 57 条原本无 limitation，覆盖率从 82% 提升至 100%。

### 新条目准入标准 + 落地门禁

制定 6 类知识实体（Risk/Avoidance/AttackTool/ThreatActor/Term/Case）新条目的严格准入标准，落地为机器门禁（`admission.mjs` 接入 `validate:data`）+ 标准文档（`ADMISSION-STANDARD.md`）+ discover 评审关约束三层。补 6 个原有准入空白：是否值得录入、是否重复、是否泛泛（文本长度下限）、keywords 数量下限、references 占位污染、高价值 Case 来源质量。

- **准入门禁脚本**：新增 `scripts/validate/admission.mjs`，接入 `validate:data` build 链。检查项：①references 禁 10 种框架首页占位链接（精确匹配，不误伤具体页）；②keywords≥3（Term≥4）；③文本字段长度下限（risk description≥60字、case summary≥80字 等，去空白字符）；④高价值 Case（criminal_verdict 等 4 类）需 ≥2 源且含 ≥1 primary 一手来源；⑤内容退化保护。`npm run audit:admission` 只报告不阻断。
- **baseline 豁免 + 退化保护**：新增 `scripts/validate/admission-baseline.json` 冻结快照（2965 条 exemptIds + 218 条 placeholderExempt + fieldSnapshots）。历史条目豁免初始下限（防误伤），但 keywords/文本长度低于快照值仍报错（防劣化）；新增条目严格执行所有下限。
- **共享来源分级模块**：新增 `scripts/validate/source-classify.mjs`，从 `case-source-quality.mjs` 抽出 `classifySource`/5 个域名后缀集合/`primaryReferenceLinks`/`highValueCategories`（去重 250+ 域名），`case-source-quality.mjs` 改为 import（行为无回归）。
- **准入标准文档**：新增 `ADMISSION-STANDARD.md`（7 章节 + 各类型阈值表 + 占位黑名单 + 来源分级 + 与现有门禁分工表 + discover 衔接）。CLAUDE.md 补"新条目准入标准"小节，SKILL.md 草稿生成约束节补占位禁令与内容下限。
- **discover 衔接**：`write-drafts.mjs` 的 `ENTITY_STANDARD` 6 类各追加【内容下限】段，`buildReviewPrompt` 评审第1项引用阈值，`buildDraftPrompt` 补 references 禁占位 + 高价值 Case ≥2源。与 admission 同步上线，落盘草稿三层卡。
- **历史占位引用修复**：218 个文件用框架首页当唯一引用（源于 `expand-coverage-batch.mjs` 批量生成），按混合策略（优先替换为权威主题对应具体页，替换不了补一条具体来源+保留占位作辅助）分批修复，中英文双改。本批先修 attack-tools(7) + threat-actors(12)，其余 risks/avoidances/terms(199) 作为后续独立工单。

## 2.38.3

移除 Case 实体的 description 字段，案例事实性描述统一用 summary：

- **数据**：删除 C1798/C1799/C1803 三个案例（中英文）的 description 字段。历史上仅这 3 个案例有 description，与 summary 内容重叠，造成冗余。
- **schema 门禁**：`breakSchema.ts` 的 caseSchema 移除 description 字段定义并加 `.strict()`，拒绝任何未定义字段（含未来误加的 description）。
- **文档**：CLAUDE.md 的 Case schema 示例与英文字段清单移除 description，新增字段约束说明"Case 不维护 description，详细背景统一写入 summary"。
- **schema-docs 脚本**：`schema-docs.mjs` 的正则兼容 `z.object({...}).strict()` 链式结尾，修复 strict 模式下文档生成报错。

## 2.38.2

修正两个案例的事实性数据错误：

- **C1803**（17岁少年DDoS攻击购票系统案）：incidentTime 由 2026-07 修正为 2020-06（案发时间），summary 补充"2021年8月广州市中级人民法院发布该案判决"等准确事实。原 incidentTime 与 summary 误用 2026 年时间。
- **C1038**（民警盗卖个人信息案）：summary 修正"查询次数接近9万次"为"导出近5000人数据（含近600条住宿信息），非法获利5万元，判有期徒刑一年八个月"——9万次查询实为另一反诈平台案的数字，原 summary 混淆了两个案件。

## 2.38.1

补强具身智能场景（BS19）新增案例的一手来源覆盖率：

- **案例一手来源补全**：为 13 个具身智能场景案例补充官方/原始一手来源，highValueMissingPrimary 由 90 降至 77，高价值案例一手来源覆盖率由 91.8% 提升至 92.99%。
  - 5 条刑事判决（C1798/C1800/C1801/C1803/C1804）：补法院官网、政法委官网、政务微信等一手通报。
  - 8 条海外安全事件（C1808-C1819）：补 MIT Tech Review 原始调查、联合国专家小组报告、腾讯科恩实验室官方博客、Black Hat whitepaper、DJI 官方安全博客、Bellingcat 开源调查、DEF CON 演讲 PDF、AI 事故数据库等一手来源。
- **白名单扩充**：`case-source-quality.mjs` 的 `primaryDomainSuffixes` 新增 4 个国际权威域名（incidentdatabase.ai / icrc.org / stopkillerrobots.org / en.wikipedia.org），`primaryReferenceLinks` 新增 9 条经核实的官方一手来源 URL。

## 2.38.0

新增可执行的风险分级体系（Risk Assessment），让企业能基于多维度评分落地评估与处置排期：

- **数据模型**：Risk 新增可选 `riskAssessment` 字段，含 5 个维度评分（发生概率 `likelihood`/业务损失 `businessLoss`/攻击成本 `attackCost`/检测难度 `detectionDifficulty`/防御成熟度 `defenseMaturity`，均采用 `low/medium/high/critical` 4 级枚举）、处置优先级 `priority`（P0-P3）、可观测信号 `observables`、覆盖机制 `priorityOverride`+`priorityNote`、评定日期 `assessedAt`。结构字段（维度/priority）不翻译，仅 `observables`/`priorityNote` 走英文 i18n。
- **优先级自动计算**：新增 `scripts/validate/risk-assessment-utils.mjs`（唯一计算源，公式为概率×损失为主项 + 攻击成本/检测难度/防御成熟度做方向性调整，阈值 `≥30→P0/≥24→P1/≥16→P2/<16→P3`，含 critical×critical 强制 P0、low×low 强制 P3 短路规则）；`sync:risk-assessment` 脚本据此写回 priority，专家可用 `priorityOverride` 覆盖。
- **校验门禁**：新增只读校验器 `check-risk-assessment.mjs` 接入 `validate:data`，校验维度枚举合法、observables 非空且质量达标（每条 ≥6 字、无重复）、assessedAt 格式、priority 与公式一致（回填阶段 priority 缺失仅警告非阻断）、覆盖时 priorityNote 必填、英文 i18n 的 `riskAssessment` 只含可翻译字段；同步更新 i18n-sync/english-i18n-quality 白名单与 `DATA_SCHEMA.md`。
- **前端展示**：详情页风险复杂度与处置优先级 pane 同宽、影响 pane 更宽，两个 pane 的徽章均有对应配色（复杂度 basic/intermediate/advanced 绿/黄/红，优先级 P0-P3 红/橙/黄/绿）；详情页新增 5 维度雷达图（echarts RadarChart 懒加载，含维度名与数值标签）、可观测信号列表、优先级说明；抽屉简化展示优先级徽章与信号计数。
- **导出落地**：STIX/JSON-LD/数据包类型定义补 `x_break_assessment`/`assessment`/`BreakRiskAssessment`，分级数据对外暴露。
- **全量回填**：全部 382 条风险完成分级评估（5 维度评分 + observables 可观测信号），priority 分布均衡（P0 占 18.8%/P1 占 37.7%/P2 占 38.5%/P3 占 5.0%），中英文 observables 同步；由 10 批子代理并行回填 + 翻译，门禁全程 0 问题。
- `data-integrity.test.ts` 新增 riskAssessment 维度枚举与覆盖一致性测试。

## 2.37.3

补强案例来源质量与引用链接健康度，提升高价值案例一手来源覆盖率：

- **案例一手来源补全**：为 49 个高价值案例（刑事判决/行政处罚/安全事件/漏洞通报）补充官方一手来源（法院判决书、检察院/公安政务通报、监管处罚公示、厂商原始公告、央视节目页、政务澎湃号等），替换或补充原有媒体转载。高价值案例一手来源覆盖率由 88.43% 提升至 91.8%，`highValueMissingPrimary` 由 125 降至 90。
- **引用坏链修复**：修复 6 条真实失效引用链接——messari.io(C1426)、news.souhu.com 拼写错误(C1376)、telegram.org(R0195/A0169)、xrsafetyinitiative.org 域名失效(AT0084/TA0050)、cisa.gov 404(AT0082/AT0054-007)。其中 cisa.gov Kubernetes 加固指南替换为更新后的有效页面。
- **反爬误报甄别**：对 references-health 报告的 66 条 connection_error 用真实浏览器复检，确认 55 条为反爬误报（mp.weixin.qq.com、jxzfw.gov.cn 等政务站点对脚本限流），仅 11 条真失效已修复；避免误改有效链接。
- **白名单扩充**：`case-source-quality.mjs` 的 `primaryReferenceLinks` 新增 38 条经核实的官方一手来源 URL（央视节目页、政务微信/澎湃号、法院官网判决书、厂商原始披露等）。
- 剩余未补全的案例多为 2017-2023 年旧案（警方/法院未发网络通报、裁判文书网需登录）、平台自治规则页（CSR 动态渲染无法获取 URL）、企业内部事件（无公开声明），属真实不可得，保留原 secondary 来源不强行编造。

## 2.37.2

修复 GitHub Pages 部署偶发失败：

- Pages 上传 artifact 改为使用包含 `run_id` 与 `run_attempt` 的唯一名称。
- `deploy-pages` 显式读取同名 artifact，避免同一次 workflow run 重跑后出现多个 `github-pages` artifact 导致部署失败。
- `punycode` deprecation warning 来自动作依赖，不影响部署；本次修复针对 artifact 重名失败。

## 2.37.1

修复慢网加载状态的两个视觉问题：

- 启动页阶段重置 `html/body/#app` 的 margin 与背景，移除浏览器默认白边。
- 全局实体自动链接器改为静默加载，避免后台能力在页面顶部显示“加载中”占位。
- 搜索弹窗预加载只拉取资源，不在未打开时挂载组件，避免 header 区域出现多余“加载中”。
- 保留正文区域真实异步组件加载提示，用户进入慢加载页面时仍能看到反馈。

## 2.37.0

新增具身智能业务场景（BS19），补齐人形机器人、服务机器人、协作机器人、医疗/手术机器人、自动驾驶具身系统、机器人集群等领域的"风险有刻画、防御有手段、工具可识别、术语成体系、案例有支撑"闭环。具身智能跨 AI(BS14)/IoT(BS16)/汽车(BS11)/元宇宙(BS17)，但有 VLA 模型对抗、遥操作劫持、ROS 中间件漏洞、机器人物理伤害与功能安全、集群协同失控、物理世界提示注入等特有风险，独立成场景。

- **新增业务场景 BS19 具身智能**：5 维度（感知与物理对抗/模型与智能体/设备与中间件/运营与合规/身份与协同）× 6 风险场景（RS33-RS38），混合新建风险与复用现有 IoT/AI/V2X 风险归类。
- **新增 12 个 Risk（R0267-R0278）**：物理世界提示注入攻击、机器人感知对抗攻击、遥操作信道劫持攻击、机器人调试与维护接口滥用、VLA/VLM模型对抗攻击、具身智能体越狱与过度自主风险、VLA模型后门与训练数据投毒、跨模态注入攻击、机器人中间件(ROS/DDS)漏洞利用、机器人物理伤害与功能安全失效、机器人集群协同失控风险、具身智能数据采集隐私泄露。
- **新增 12 个 Avoidance（A0225-A0236）**：物理世界提示注入检测、多模态感知交叉校验、遥操作信道加密认证、机器人调试接口硬化、VLA对抗训练与鲁棒性、动作安全边界与权限收敛、SROS2与DDS-Security部署、机器人安全停机E-stop与功能安全设计、集群协同容错与拜占庭防御、具身数据采集隐私保护、Sim-to-Real域随机化与一致性校验、机器人黑匣子与行为审计。
- **新增 4 个 AttackTool（AT0100-AT0103）**：VLA对抗攻击工具、机器人遥操作劫持工具、机器人硬件调试接口利用工具、机器人中间件漏洞利用工具。
- **新增 2 个 ThreatActor（TA0065-TA0066）**：机器人与具身智能攻击者、具身智能隐私窃取者。
- **新增 10 个 Term（T0605-T0614）**：具身智能、人形机器人、VLA模型、遥操作、机器人操作系统、安全停机、功能安全、对抗补丁、机器人集群、物理世界提示注入。
- **新增 15 个 Case（C1806-C1820）**：Unitree UniPwn(CVE-2025-35027)、Unitree Go1 CloudSail(CVE-2025-2894)、iRobot Roomba J7隐私泄露、Knightscope K5撞人、Raven II手术机器人劫持、KARGU-2自主武器、特斯拉车道线贴纸、RoboPAIR越狱、Alias Robotics Unitree G1评估、Ecovacs扫地机劫持、大众Baunatal机器人致死、腾讯科恩特斯拉入侵、马杜罗无人机刺杀、DJI Romo越权、Humphreys GPS欺骗。
- **全场景覆盖与门禁**：12 个新建具身智能 Risk 与 12 个 BS18 物流特有 Risk 全部归类到 BS00 全场景对应 RS；新增 `business-scene-coverage.mjs` 门禁脚本（接入 `validate:data` 链），校验专题场景特有 Risk 必须归到 BS00 全场景，防止未来新增专题场景时遗漏全场景归类。
- **语义审查修复**：R0274 跨模态注入补 A0226 多模态感知交叉校验；AT0100 的 R0273 由 directCauseRisks 调整为 indirectSupportRisks；AT0101 的 R0277 由 directCauseRisks 调整为 indirectSupportRisks；TA0065 的 R0270 由 indirectSupportRisks 升级为 directCauseRisks；C1814 移除 R0271 补 R0278；C1817 移除 R0269；BS19 RS35 移除 R0071。
- **真实案例支撑**：所有新建 Case 引用真实可查来源（CVE NVD/IEEE Spectrum/MIT Tech Review/arXiv 论文/权威新闻）。
- 中英文翻译同步（新增 56 个 EN 文件），`sync:lateral-relations` 重算横向关系，`validate:data` + `build` 全绿。

## 2.36.4

修复顶部加载条在无实际加载时误显示的问题：

- 顶部加载条新增延迟显示机制，任务在阈值内完成会直接取消，不再闪现。
- 路由切换和路由数据加载改为延迟触发，首页打开风险/规避手段等抽屉这类纯路由状态变化不会再显示顶部进度条。
- 保留真实慢加载场景的顶部条提示：路由 chunk、后台数据或异步组件加载超过阈值时仍会显示。
- 补充延迟显示与提前完成取消的回归测试。

## 2.36.3

完善慢网环境下的加载状态展示，减少用户误以为页面卡死的情况：

- 将首屏 `Loading, please wait...` 替换为静态启动页，展示品牌、阶段文案、进度条和慢网提示。
- 启动页在主 JS 尚未加载完成时会模拟推进进度，避免进度条长期停在初始位置；真实加载阶段只向前推进，不回退。
- 应用 mount 前将进度推进到 100%，并保留短暂显示时间，避免用户看不到完成状态。
- 页面已经显示后，如果后台仍在加载知识库数据、路由资源或异步组件，在顶部标题栏 border 处显示蓝色加载条。
- 异步组件慢加载占位只保留 spinner 和慢网文案，不再在页面内容区显示“刷新页面”按钮；版本更新或 chunk 失效仍走自动刷新/错误提示恢复策略。
- 新增启动页与顶部加载条回归测试，覆盖模拟进度、后台加载状态和异步占位按钮审计。

## 2.36.2

修复线上版本更新与懒加载资源混用时偶发点击无响应的问题，并完善可恢复错误提示：

- 调整 Service Worker 更新策略：新 SW 不再安装后立即 `skipWaiting` 抢占旧页面，改由前端在空闲/隐藏等安全时机确认激活。
- Service Worker 激活时保留上一版本缓存，避免旧页面运行期间点击抽屉、搜索、关系图等懒加载功能时旧 chunk 被提前清理。
- 修正构建资源缓存匹配规则，按 `/assets/*.js|css` 匹配 Vite/Rolldown 产物，避免非十六进制 hash 资源走错缓存策略。
- 新增静默更新协调器：检测到新版本后优先在页面空闲、无抽屉/弹窗、无输入操作或页面隐藏时自动应用；用户点击懒加载功能且已有待更新版本时，先应用新版本，避免继续请求旧 chunk。
- 新增统一 chunk 加载失败恢复：首次失败自动刷新一次，短时间重复失败改为明确提示手动刷新，避免无限刷新或静默无响应。
- 首页、抽屉、搜索弹窗、关系图等异步组件统一接入可恢复加载封装，并补充加载态占位。
- 新增 SW 更新策略和 chunk 恢复回归测试；`build`、smoke、performance、生产 preview 点击验证均通过。

## 2.36.1

统一新增行业术语的 title 格式，使其与已有术语的简短名词惯例一致：

- `T0601` OWASP 自动化威胁（OAT）→ **OWASP自动化威胁**（去空格与括号注释，参照 APT攻击/DNS劫持 风格）
- `T0602` Bot Management（机器人管理）→ **Bot管理**（参照 影子API/Webhook 风格）
- `T0604` 代理池·住宅代理·数据中心代理 → **住宅代理**（原间隔号串联三概念过长且像分类说明；聚焦住宅代理这一最難识别的代理类型，数据中心代理/隧道代理作为对照保留在 description 中，代理池工具实体已在 AT0098 覆盖）
- `T0603` 协议爬虫 符合惯例，未改。
- 同步更新中英文 title/keywords/aliases/definition/description 与 CHANGELOG 引用，`validate:data` + `data-integrity`（36/36）+ `build` 全绿。

## 2.36.0

吸纳《反爬虫的101种方法》内容，补齐反爬领域"防御有手段、攻击有风险、工具可识别、术语成体系"的闭环。文章中绝大多数具体战术（验证码/设备指纹/限频/代理识别/代码加固/数据脱敏/水印/蜜罐/投毒/接口签名等）现有实体已精确覆盖，本批聚焦三类体系性缺口：

- **新增 2 个独立 Avoidance + 2 个子手段**：
  - `A0223` 设备厂商安全能力集成（AC01）：集成 DeviceCheck/Play Integrity/TEE/getUserRiskRank/SafetyDetect 等厂商背书的硬件级设备可信校验，与 A0013 终端加固（软件层）平级、与 A0021 设备指纹互补。
  - `A0224` 良性爬虫放行（AC03）：IP 白名单 + UA + rDNS 三重校验识别搜索引擎爬虫并放行，避免反爬误伤 SEO。
  - `A0038-003` TLS/HTTP 指纹识别：JA3/JA4、HTTP2、TCP/IP 指纹识别协议爬虫，挂靠 A0038 代理识别。
  - `A0030-001` 动态埋点与蜜罐陷阱：动态埋点/循环陷阱/假时间戳/蜜罐接口/动态 HTTP Header，挂靠 A0030 业务蜜罐。
- **新增 4 个 Risk 子风险（R0027-002~005）**：解决"有规避无绕过"的关系不对称——数据解析干扰绕过、投毒数据识别与清洗、数字水印去除与伪造、业务蜜罐识别与规避，分别对应 A0032/A0031/A0049/A0030 的攻击侧绕过方向。
- **新增 2 个 AttackTool**：`AT0098` 代理池（住宅/数据中心/隧道代理调度系统，区别于 AT0034 风险IP）、`AT0099` GOIP 设备（VoIP↔蜂窝网关，区别于 AT0004 猫池）。
- **新增 4 个 Term**：`T0601` OWASP 自动化威胁（OAT）分类框架、`T0602` Bot Management 机器人管理、`T0603` 协议爬虫、`T0604` 住宅代理。
- **补强 6 个现有条目 keywords/description**：A0021（补 OAID/IDFA/AndroidID）、A0018/A0026（补登录凭证动态更新）、A0003（补非登录请求限制）、A0032（补 JS 参与运算/同形异义字）、A0030（补循环陷阱/假时间戳/动态HTTP Header）。
- **补 Avoidance 反向引用**：R0050/R0050-001 补 A0223（设备厂商能力对抗设备绕过）、R0027 补 A0038-003/A0224、R0126-002 补 A0038-003（协议指纹识别纳入相关风险的防御手段）。
- **未吸纳（超 BREAK 录入边界）**：文章「清晰反爬思维」（防护对象定义、愿景/目标/战略、关卡制 vs 攻城战、宽进严出 vs 严进宽出、防止→感知→识别→处置流程框架）属战略思想而非可枚举具体手段；「持续提升反爬能力」属方法论；DNS 污染/劫持作为反爬手段易误伤合规流量、偏离风控语义——均不录入。
- 中英文翻译同步（新增 8 个 EN 文件 + 8 个现有 EN 文件补强），`sync:lateral-relations` 重算横向关系，`validate:data` + `validate:stix` + `build` 全绿。

## 2.35.4

物流业务场景(BS18)纳入 6 个在物流环节有显著特化形态的通用风险，补全物流场景的风险覆盖：

- **RS29 快递快运与售后滥用（交易维度）新增 4 个**：R0004 虚假发货（配合售后骗赔/盲销诈骗走虚假运单）、R0054 恶意退货（配合到付弃件/售后骗赔的退货侧滥用）、R0064 拆单套利（与三同拆单套利同源的运费/赠品凑单套利）、R0068 售后权益滥用（批量售后骗赔的上位权益滥用概念）。
- **RS30 运力与车辆调度欺诈（运营维度）新增 1 个**：R0141 地理位置欺诈（伪造 GPS 定位配合众包司机刷单抢单、区域运价套利，是运价规则套利 R0265 的实施手段）。
- **RS31 快递重量与货品欺诈（运营维度）新增 1 个**：R0052 低价高邮（卖家压低商品价、抬高运费转嫁成本，物流计费环节典型形态）。
- 均为跨场景归类（Risk 跨 riskScenes 是允许的，区别于 RS 跨 riskDimensions 的错误）：这 6 个风险当前已归 BS00 等通用/电商场景，纳入 BS18 后命中「全场景通用风险与行业专题场景并行复用」自动推断，无需手维护跨场景理由。
- 英文 i18n 文件无需改动（BS18 英文只翻译 title/description，不维护 risks 数组）；`business-scenes` / `business-scene-sub-risks` / `business-scene-dimensions` / `metrics` / `home-counts` 校验全绿，未引入新问题。

## 2.35.3

详情页新增"反馈"入口（直达 GitHub issue 预填）：

- 新增 `src/utils/feedback.ts`（`buildIssueUrl` + `GITHUB_REPO` 常量）与 `src/components/FeedbackLink.vue` 可复用组件：点击在新窗口打开 GitHub issue 新建页，预填 title（`[类型] ID: 标题`）与 body（实体信息表 + 反馈区占位 + 当前页面 URL），labels 预打 `feedback`。实体类型名复用 `relationType.*` i18n，ID 反推走 `inferEntityType`。
- 11 处详情页接入：6 个列表详情 View（Risks/Avoidances/AttackTools/ThreatActors/Terms/CasesView）+ 5 个抽屉组件（Risk/Avoidance/AttackTool/ThreatActor/TermDetail），标题栏/抽屉头各加一个"反馈"按钮。
- 新增 i18n key `feedback`（中：反馈，英：Feedback）；`.detail-heading-actions` 公共样式让反馈按钮与"打开关系图"按钮并排。

## 2.35.2

修复业务场景详情页风险维度折行 bug：

- **根因**：`useHomeSceneLayout.ts` 的非滚动分支（场景数 ≤ 阈值 8）用栅格 `dimension.size` 分配宽度，当 RS 被多个维度复用时（如 BS18 的 RS29/RS30/RS32 各被 2 个维度引用），`Σ(维度场景数) > totalScenes`，按比例算出的 `dimensionSize` 之和超过 24，加上 `remainingRowSize || 24` 在 remainingRowSize=0 时回退到 24 的 bug，导致维度折行。
- **修复**：移除 `SCROLL_THRESHOLD` 阈值判断，所有桌面场景统一走滚动布局分支——`flex-wrap: nowrap` 保证维度始终在同一行，内容宽度 < 容器宽时铺满无滚动条，超出则横向滚动。移动端不受影响（用 `xs/sm=24` 垂直堆叠）。
- `shouldEnableScroll` 改为恒 true（保留导出供桌面/移动端切换）；`sceneLayout` 删非滚动分支；测试断言更新并新增 BS18 RS 跨维度复用回归测试。

## 2.35.1

完善新增物流实体与已有实体之间的关系，补充相关案例：

- **新风险补 relatedRisks 语义关系**：12 个新风险（R0255-R0266）补充与已有风险的共现/变体关系，如批量售后骗赔→售后权益滥用/恶意退货/拒付退款滥用、众包三同拆单→骗取补贴/恶意抢购、C2C到付弃件→恶意拒收、虚假路由套计提/虚假接驳→快递偷重漏重（数据失真共享防篡改与定向抽检）、C2C盲销诈骗→虚假发货、散单专业市场账号套用→自动化养号/刷单、跨考勤月取消套利→骗取补贴/闪退套利、运价规则套利↔快递偷重漏重（计费重量失真）等；新风险之间补拆单套利/计费失真等横向关系。
- **已有风险补规避手段**：R0004 虚假发货新增 A0222-001 信任商家定向抽检（核验信任商家货品一致性，识别借信任资质虚假发货）。
- **新增 2 个物流典型案例**：C1804 广州盲发快递货到付款诈骗案（2022，涉案2000万，关联 R0259）、C1805 安徽刘某团伙冒充司机货主双向诈骗货运运费案（2022-2024，关联 R0258/R0262），中英文同步。
- **已有案例补关联新风险**：C0524 央视曝光免费送手环货到付款诈骗案 补关联 R0259；C0225 退货运费险骗赔案 补关联 R0255。
- `sync:lateral-relations` 重算横向关系，README/README_CN/home.ts/DATA_SCHEMA.md 案例计数同步（1802→1804），`validate:data` + `build` 全绿。

## 2.35.0

新增「物流」业务场景(BS18)，纳入 12 个物流风险文件与 1 个规避手段文件，覆盖快递快运、运力、偷重漏重、商家评估 4 个子领域：

- **新增业务场景 BS18 物流**：新建 RS29 快递快运与售后滥用 / RS30 运力与车辆调度欺诈 / RS31 快递重量与货品欺诈 / RS32 商家与账号治理风险 4 个风险场景，RD01-04 四维度。参照 BS13 出行行业组织模式，只列入有风险的 RS（不预列空通用 RS）。
- **新增 12 个 Risk 文件（R0255-R0266，16 个风险实体）**：
  - 快递快运：R0255 批量售后骗赔、R0256 众包三同拆单套利、R0257 C2C到付弃件、R0258 虚假路由套计提、R0259 C2C盲销诈骗（含子风险 R0259-001 盲销诈骗，盲销黑话并入）、R0260 重货拆小件套取揽派费、R0261 跨考勤月取消套利、R0262 虚假接驳套费、R0263 散单专业市场账号套用
  - 运力：R0264 整车运力虚报与套计（含子风险 R0264-001 一车多车型套费 / -002 京驿整车通道套用 / -003 虚假车次套费）、R0265 运价规则套利
  - 偷重漏重：R0266 快递偷重漏重
- **新增 1 个 Avoidance 文件 A0222 定向抽检**（含子手段 A0222-001 信任商家定向抽检 / -002 快递定向抽检任务）。按 CLAUDE.md 定义边界，「信任商家定向抽检」「快递定向抽检任务」是检测手段(Avoidance)非风险本身。
- **定义边界归一化**：「京驿整车」是京东物流正规产品名，重定义为整车运力虚报套计的子风险「京驿整车通道套用」；「盲销风险」与「C2C盲销诈骗」合并为一族。
- **校验脚本**：`business-scenes.mjs` 的 `defaultCrossSceneReason` 补 R0259 跨 RS29/RS32 理由条目。
- 中英文翻译同步（14 个 EN 文件），`sync:lateral-relations` 重算横向关系，README/README_CN 实体计数更新，`validate:data` + `build` 全绿。

## 2.34.1

case incidentTime 校验加固：

- `breakSchema.ts` 的 `incidentTime` 加正则 `^\d{4}(-\d{2}(-\d{2})?)?$`（允许 YYYY/YYYY-MM/YYYY-MM-DD），堵导入流程中填入"未知"/原文片段等非法值。现有 90 个纯年份 case 数据兼容，`validate:data` + `build` 全绿。

## 2.34.0

移动端新增「点击顶部 banner 标题区滚回顶部」交互：

- 新增 `src/utils/dom.ts` 工具函数 `scrollActiveContainerToTop`：定位 App 主内容区 `.el-main`，在其子树内深度优先查找第一个可见且内容溢出的可滚动元素（overflow-y 为 auto/scroll 且 scrollHeight > clientHeight），平滑滚到顶部；找不到则回退到 `.el-main` 自身或 `window`。滚动容器不在 banner 祖先链上（el-main 是 el-header 的兄弟），故不采用向上找祖先的方式，自动适配各页面不同滚动容器
- `MenuList.vue` 移动端中间 banner（`<h3 class="banner">`）加点击事件调用上述函数，补 `role="button"` / `tabindex="0"` / `title` / 回车键支持；桌面端（≥768px）不响应。文案复用已有 `backtop` i18n key
- 适配各页面滚动容器：首页 / 关系图谱（analysis/sankey/pathExplorer）/ 业务场景由 `.el-main` 滚；知识库列表态由 `.knowledge-list` 滚；详情态由 `.knowledge-detail` 滚

## 2.33.0

知识库实体互引用密度评估与补足，新增文本字段引用测量与自引用检测：

- **互引用密度评估**：新增 `scripts/validate/measure-cross-refs.mjs` 测量脚本，统计各实体文本字段（description/limitation/definition/influence/summary/usageExample）内嵌的实体 ID 互引用密度。基线测量显示 3215 个实体仅 2.5% 有文本引用，但结构化关系里的 20503 个引用多数是"关系罗列"（如一个 Risk 对应 43 个 Avoidance），全塞进文本会破坏可读性
- **4 类知识实体互引用补足**（仅补"语义必要"引用：同类对比缺失 + 直接因果缺 ID，不罗列结构化关系，每实体最多 1-2 个）：
  - Risk：9 个实体补 13 处（如 R0001 点明两个子风险 R0001-001/002、R0032-002 凭证爆破 vs R0032-003 兄弟对比、R0071-010/-011 深度伪造父子归属）
  - Avoidance：A0010 族 5 个 limitation 补同类对抗机制对比（多开/调试器→外挂检测 A0010-004、虚拟机/无头浏览器/HOOK→模拟器检测 A0010-001）；A0006-008 自动AI生成内容识别补深度伪造检测 A0066
  - AttackTool：6 个实体补 6 处易混工具对比（如 AT0016 云手机 vs AT0002 模拟器、AT0014-001 发包工具 vs AT0014 抓包工具、AT0049-001 脱机挂 vs AT0049 游戏外挂）
  - ThreatActor：3 个子角色补父角色归属（TA0001-001 羊头→TA0001 羊毛党、TA0005-001 卡农→TA0005 料商、TA0015-001 金主→TA0015 电诈团伙）
  - 引用密度提升：Risk 6.9%→9.4%、Avoidance 14.0%→16.4%、AttackTool 7.1%→12.5%、ThreatActor 8.2%→12.3%；Term/Case 保持 0（术语定义与事件摘要靠自然语言，硬塞 ID 反而不自然）
- **修复自引用笔误**：A0006-007（自动恶意文本识别）limitation 把"人工内容审核（A0006-001）"误写成自身 ID A0006-007，已修正
- **审计脚本增强**：`audit-text-id-refs.mjs` 新增自引用检测（实体文本引用自身 ID，多需人工判断是否笔误，如 A0006-007 这类；少数合法自指对比句式如 R0041 不阻断），自引用作为提示输出不计入退出码
- 中英文翻译同步，`validate:data` + `build` 全绿

## 2.32.1

修复知识库自由文本字段中实体 ID 引用笔误（共 48 处，中英文同步）：

- **A 类（位数不足笔误，46 处）**：avoidances 多个实体的 `description` / `limitation` 中把 4 位 ID 写成 3 位（如 `A018` 应为 `A0018`、`A006-001` 应为 `A0006-001`、`A022-003` 应为 `A0022-003`），涉及 A0002–A0039 共 19 个 avoidance 文件；此前已修的 A0010 族（`A010-001`/`A010-003`）属同类问题
- **B 类（引用不存在的实体，2 处）**：`AT0053-007`（虚假来电伪装工具）文本中的 `AT0059` 应为 `AT0053-006`（AI语音克隆工具）；`AT0074`（AI Agent劫持工具）文本中的 `AT0057` 应为 `AT0053-004`（LLM自动化攻击工具）
- 上述文本内嵌 ID 不被 `check-entity-relations.mjs` 的结构化关系校验覆盖，新增 `scripts/validate/audit-text-id-refs.mjs` 审计脚本扫描自由文本字段（`description`/`limitation`/`definition`/`influence`/`summary`/`usageExample`）中的实体 ID 引用，检测"格式笔误"与"悬空引用"两类问题
- `C0608` 中的"C114论坛"系中国通信产业社区专有名词，非 Case ID，经核实为审计误报，不修改
- 中英文翻译文件同步修复，确保两侧 ID 引用一致

## 2.32.0

异步加载失败处理与列表空态三态统一：

- `useCases` 新增 `loadError` 状态：案例首次加载失败时不再静默 reject 成未处理异常，改为记录错误态供 UI 反映，并保留“失败即拒绝”契约以便重试
- `KnowledgeSplitView` 新增 `loading` / `loadError` / `errorTextKey` props 与 `retry` emit，列表区统一“加载中 / 加载失败+重试 / 未找到匹配结果”三态空态（失败态优先级最高），失败文案可通过 `errorTextKey` 覆盖（默认通用 `error.dataLoadFailed`，案例传 `error.caseSyncFailed`）
- `CasesView` 采用新三态：加载中显示转圈、加载失败显示“案例数据加载失败”+点击重试，不再误显示“未找到匹配结果”或永久转圈
- `ChangelogView` 改造为复用 `KnowledgeSplitView` 三态：移除外层 `v-if/v-else-if`（此前加载中/失败时侧栏+详情栏布局塌掉只剩一行字），失败时提供重试按钮
- `useDrawerRoute` 的 `validateKey` 包 try/catch：`loadFullBREAK` 失败时（非 chunk 错误）抽屉不再静默打不开，改为跳首页 + 弹错误提示；chunk 加载失败仍由 `main.ts` 全局兜底自动刷新
- 其他 `ensureCases` 调用方（`useEntityResolver` / `useLazyCasesSection` / `SearchDialog`）补 `Promise.resolve(...).catch()` 兜底，消除未处理 Promise rejection
- 新增 6 个测试覆盖加载中、加载失败+重试、失败态优先级、失败文案可定制、validateKey 抛错跳首页等场景
- 修复 `relation-stability` 测试脚本 URL：路由早已从 `/relation/:type/:key` 重构为 `/relations/risk-relation/:entity/:id`，测试 URL 未同步导致该次版本 gate 误失败

## 2.31.3

消除 CI 安装期 deprecation 警告：

- 通过 `package.json` overrides 将 `js-beautify` 顶到 `2.0.3`，连带 `glob` 从已废弃的 `10.5.0` 升级到 `13.0.6`
- 根因：`@vue/test-utils@2.4.11` 依赖 `js-beautify@1.x`，后者锁定 `glob@^10`（已废弃且不再维护）
- `js-beautify@2.0.3` API 与 `@vue/test-utils` 兼容，`npm audit` 无 glob 相关漏洞，533 个测试与构建均通过

## 2.31.2

修复商业场景子风险重复显示：

- 新增 `business-scene-sub-risks.mjs` 校验脚本，检测并修复 riskScenes 中父子风险同时存在的重复问题
- 清理 18 个 BS 文件中 947 处父子重复（子风险由前端 `useSubRiskToggle` 自动展开，无需在数据中显式列出）
- 修复关系图谱商业场景影响分析：`buildBusinessSceneIndex` 自动将父风险的场景归类扩展到子风险
- 集成到 `validate:data` 命令链，防止重复问题再次引入

## 2.31.1

术语实体去重与定义质量修复：

- 合并重复术语实体：查档、库主、强登、手工打扶贫粉、直播虚拟礼物回收渠道、扶贫对象数据
- 对同名但业务场景不同的术语进行消歧：数据查档收单、信贷收单、跑分点位、信贷点位
- 重写 T0522-T0599 术语描述，移除“用于识别相关风险、滥用模式、控制要求及运营信号”类模板化内容
- 同步更新英文 i18n 文本，保持中英文术语 key 和结构一致
- 更新术语统计数量、首页轻量计数、数据 Schema 文档和静态数据导出产物

## 2.31.0

知识库列表增强与应用内更新日志：

- 知识库列表筛选后自动选中第一个匹配条目，修复筛选后右侧详情空白
- 风险列表增加复杂度 badge（绿/琥珀/红 对应 初级/中级/高级）
- 案例列表增加 incidentTime 展示和分类 badge（6 种分类 6 种颜色）
- 术语列表增加分类 badge（35 个分类通过哈希映射到 8 色调色板）
- 所有 badge 颜色通过 CSS 变量定义，亮/暗模式分别适配
- 首页商业场景选择器下方展示场景 description
- 新增应用内更新日志页面（`/changelog`），构建时将 CHANGELOG.md 解析为 JSON，前端异步加载
- 更新日志页面复用 KnowledgeSplitView 双栏布局，支持版本搜索，轻量 markdown 渲染（零依赖）
- 知识库菜单下拉末尾新增「更新日志」入口，桌面端和移动端同步

## 2.30.0

英文 i18n 构建时预合并，修复英文首屏中文残留：

- 新增 `generate-en-full.mjs` 预合并脚本：构建前读取中英文源文件，用 `mergeWithStructure` 逐文件合并，输出到 `src/i18n/en/.generated/` 目录
- 新增 `BREAK-full.ts` barrel：使用 `import.meta.glob` eager 加载预合并的完整英文数据
- `ensureEnLocaleMessages` 改为直接 import 预合并数据，英文 locale 运行时不再加载中文 BREAK 数据
- `useCases.ts` 英文 cases 改为从 `.generated/cases/` 懒加载预合并数据，不再依赖中文 cases 作基底
- `main.ts` 英文 locale 时 await 加载完成后再 mount，消除首屏中文残留
- 逐文件输出结构使 rolldown `maxSize` 自然拆分，所有 chunk 在 900KB 预算内
- 移除运行时 `mergeWithStructure` 依赖，英文加载链路从"中文+英文→客户端合并"简化为"预合并英文→直接注入"

## 2.29.7

Entity Registry 硬编码清理：

- 注册表新增 `listRouteName`、`relationPerspectiveRouteName` 字段，覆盖知识库列表路由和关系图视角路由
- SearchDialog：3 套详情路由映射 + ID 前缀推断 + 首页/业务场景路由集合全部改为 Registry 派生
- EntityLinkSection：`BREAK_KEY_BY_ROUTE_NAME` 映射和 `summaryFieldByEntityType` 映射改为 Registry 派生
- useRelationGraph + relationNodeRouting：2 处重复的关系图视角路由映射合并为 Registry 派生
- 5 个 Detail 组件（RiskDetail/AvoidanceDetail/AttackToolDetail/ThreatActorDetail/TermDetail）：详情路由名+paramKey 改用 `entityDetailHref`，关系图路由名改用 Registry
- HomeView：`businessSceneDrawerRouteNames` 改为 Registry 派生
- relationNote.ts：`translatedEntityTitle` 改为接收 EntityType，消除 breakKey/i18n 路径前缀硬编码

## 2.29.6

架构 Review 改进（完结）：

- Entity Registry 消费扩展：SearchDialog、relationNodeRouting、relationGlobalLines、useRelationNodeActions、relationNetworkLayout、relationTypes 共 6 个文件迁移到 Registry 消费，消除全部散落的 ID 前缀推断（5 处→1 处）、detail 路由映射（5 处→1 处）、BreakKey 映射（3 处→1 处）
- Registry 新增 `relationKey`（kebab-case 映射）和 `childIdPattern`（子编号正则）字段，支持关系图模块消费
- HomeView 接入 composable：布局计算和子风险折叠逻辑迁移到 `useHomeSceneLayout`，HomeView 从 1010 行减少到 904 行（-106 行）
- i18n 模块内部错误提示：`ensureCnLocaleMessages`/`ensureEnLocaleMessages` 失败时直接 ElMessage 提示用户，不再依赖调用方兜底

## 2.29.5

架构 Review 改进（续）：

- Entity Registry 集中注册：新增 `src/BREAK/entityRegistry.ts`，统一管理实体类型元信息（ID 前缀、paramKey、breakKey、i18n 路径、路由名等）。`entityRoute.ts`、`useEntityResolver.ts`、`useSearch.ts` 已迁移到 Registry 消费，消除 3 处重复的类型映射
- 搜索索引按类型独立重建：`useSearch.ts` 的 locale 变化仅重建非 case 索引，cases 变化仅重建 case 索引，避免全量重建 6 类 Fuse 索引
- HomeView 布局逻辑提取：新增 `useHomeSceneLayout` composable（场景布局计算+子风险折叠），含 7 个单元测试
- SearchDialog 组件测试：新增 8 个测试用例覆盖搜索交互、ID 前缀优先排序、多页面路由分发、cases 预加载
- Entity Registry 测试：17 个测试用例覆盖类型推断、i18n 前缀、查找表、ID 正则

## 2.29.4

架构 Review 改进：

- Zod Schema 与 TS 接口合并：所有实体类型（Risk/Avoidance/AttackTool/ThreatActor/Term/CaseEntity 及关系类型）改为由 `z.infer<>` 从 Zod schema 自动推导，消除 `breakSchema.ts` 与 `types.ts` 双重维护。`types.ts` 保留为重导出入口保持向后兼容
- RelationRouteShell 错误兜底：动态 `import()` 添加 `.catch` 处理，加载失败时显示错误提示与重试按钮，不再产生 unhandled rejection
- 路由守卫 i18n 加载失败 UI 反馈：`beforeEach` 中 `initLocaleMessages` 添加 `.catch` + ElMessage 错误提示
- 新增 i18n key：`error.retry`、`error.dataLoadFailed`

## 2.29.3

优化 Case 列表大数据浏览体验：

- Case 知识库列表启用虚拟滚动，只渲染可见窗口与少量缓冲项，避免 1797 条案例全部展开后产生过多 DOM 节点
- 保留现有搜索、分类筛选、路由定位、桌面/移动端选中项滚动逻辑
- 增强知识库列表项 hover 效果，鼠标经过时展示更明显的高亮背景、边框和轻微位移反馈
- 增加 `KnowledgeSplitView` 虚拟列表回归测试，覆盖大量条目下的窗口化渲染与末尾条目定位

关系图谱错误边界与用户可见错误提示：

- ECharts `setOption` 3 处裸调用包裹 try/catch，渲染失败时 ElMessage 提示而非白屏
- 关系图 3 个异步组件（NetworkPane/NodeDetailDrawer/PathExplorerPane）加 `errorComponent`，chunk 加载失败时显示占位提示
- `performInitialRender` 和路由参数 watch 包裹 try/catch，数据异常时提示而非半渲染态
- `initLocaleMessages` 加载失败时 ElMessage 提示用户刷新（不走 i18n，防止循环依赖）
- `useCases` 语言切换失败时 ElMessage 提示
- 新增 i18n 错误提示 key：`error.chartRenderFailed` / `error.componentLoadFailed` / `error.caseSyncFailed`

## 2.29.2

EntityAutoLinker 架构加固——提取核心逻辑并增加两层回归测试：

### 架构优化
- 提取 `autoLinkerCore.ts`：将 `processTextNode`、`isInsideSkipZone`、`scanSubtree` 等纯 DOM 函数从 `EntityAutoLinker.vue` 的 `<script setup>` 中分离到独立模块，隔离副作用与纯逻辑

### 测试增强
- **Vitest 单元测试**（+35 用例）：覆盖 processTextNode 基本功能（文本拆分/多 ID 包裹/子编号识别/重复处理防护）、isInsideSkipZone 全部 17 个排除区域边界、extractEntityId 提取逻辑、scanSubtree 子树扫描、DOM 扫描性能预算（1000 节点 < 200ms）
- **Playwright 浏览器回归测试**（4 场景）：大列表页浏览（350 条风险列表渲染）、抽屉打开/关闭、搜索弹窗交互、关系图 tab 切换——全部断言无运行时错误
- 新增 `npm run test:autolinker-regression` 脚本，集成到 `precommit-browser-regression` 流程

## 2.29.1

修复 EntityAutoLinker 全局提前加载 BREAK 全量数据的性能问题：

### Bug 修复
- 修复 `useEntityResolver` 中 Case 懒加载条件判断错误（`cases.value` 初始值 `{}` 永远 truthy，导致 `ensureCases()` 永远不触发），改用 `loaded` ref 判断

### 性能优化
- 移除 `useEntityResolver` 对 `@/BREAK` 的静态导入，改用 `te()` 判断实体存在性，消除 EntityAutoLinker chunk 对全量知识库数据的级联依赖
- EntityAutoLinker 异步 chunk 不再拉入 BREAK-Risks/Avoidances/AttackTools/ThreatActors/Terms 等数据 chunk，BREAK 数据完全由 i18n 动态加载策略按需加载

## 2.29.0

实体层级关系全面重构——大规模子实体化与去重：

### 新增机制
- 为 Term（行业术语）引入子实体机制，支持 `T0075-001` 格式的子术语 ID

### 术语去重（删除15个重复条目）
- 区块链术语段重复（T0489~T0501）合并到早期条目（T0448~T0455）
- 跨类目重复合并：撸毛、猫池、钓鱼、社工库、杀猪盘、卡商、跑分等

### 术语子实体化（65个术语建立层级）
- "料"族：T0075 下归入 26 个子类型（二手料/泛料/精准料/活料等）
- 电信诈骗受害人族：鱼(6个)、猪(5个)、鸟(3个)、马(3个)
- 收款码族：T0317 下归入 14 个子类型（个码/商家码/聚合码等）
- 非法贷族：T0400 下归入 6 个子类型（高炮/黑户贷/租机贷等）
- 钓鱼特化链：T0505 下归入鱼叉式钓鱼、捕鲸攻击

### 风险降级为子实体（19个）
- R0121 虚拟货币洗钱 → R0060-001、R0151 MFA绕过 → R0036-002
- R0116 AI深度伪造及其子树 → R0071-009~011
- R0131 二维码钓鱼、R0194 协议钓鱼、R0144 域名仿冒 → R0084 子实体
- R0089 用户隐私泄露、R0255 客服数据泄露 → R0078 子实体 等

### 规避手段降级与去重（24个）
- 删除 A0158（与 A0097 智能合约形式化验证完全重复）
- A0084 实时深度伪造检测 → A0066-001
- A0125/A0126/A0127 预言机三件套 → A0098 子实体
- A0197 API速率限制 → A0004-001 等

### 攻击工具降级（24个）
- AT0065 键盘记录器 → AT0064-001（描述中自证从属）
- AT0020 硬改工具 → AT0007-001（改机的一种方式）
- AT0056~AT0059 AI工具族 → AT0053 子实体
- AT0085~AT0099 批量工具 → AT0061/AT0054 子实体 等

### 威胁行为者降级（5个）
- TA0043 电诈技术员 → TA0042-001
- TA0061 车联网攻击者 → TA0049-001
- TA0044 算力黄牛 → TA0002-001
- TA0026/TA0027 游戏代练/演员 → TA0025 子实体

### 全局引用更新
- 152 条 ID 映射，覆盖 754 个文件的交叉引用替换

## 2.28.4

修复关系图中多处 `line.text` 硬编码导致的国际化问题：

- 修复路径探索抽屉中关系类型（如"规避"、"直接造成"、"间接支持"等）在英文模式下未翻译的问题
- 修复"All Relations"关系表格中关系类型标签在英文模式下显示中文的问题
- 修复关系语义解释和攻击路径描述中关系类型嵌入中文的问题
- 修复 CSV 导出中关系类型列未翻译的问题
- 修复关联实体 block 中 `relationText` 未翻译的问题
- 修复首页风险场景标题 tooltip 中文硬编码的问题
- 统一所有关系文本的 i18n 翻译方式：消费侧改用 `t(getRelationLineKey(line))` 替代直接读取 `line.text`

## 2.28.3

项目清理与路径探索体验优化：

- 路径探索视角节点详情抽屉中，关联实体 block 隐藏 3 个操作按钮（查看节点详情、作为根节点打开、查看详情）
- 删除废弃组件 `RelationNodeDrawerInsights.vue`（已被 `RelationNodeInsightBlocks.vue` 替代，零引用）
- 删除废弃 composable `useAnchorTable.ts` 及其对应测试用例和 `.anchor-row` CSS 样式（零引用）
- 删除早期遗留脚本 `src/BREAK/savejson.cjs`（依赖文件已不存在）
- 删除一次性链接重试脚本 `scripts/validate/retry-connection-failed.mjs`（未被引用）
- 清理 `eslint.config.mjs` 中失效的 `savejson.js` 忽略规则

## 2.28.2

英文 references 独立链接准备：

- 为所有英文 i18n 翻译文件的 references 条目添加 link 字段（从中文源复制），涉及 3037 个文件、4328 条 references
- 修改验证脚本（i18n-sync.mjs、references.mjs、english-i18n-quality.mjs）支持并校验英文 references 中的 link 字段
- 更新 mergeWithStructure.mjs 注释，反映英文翻译也维护 references[].link
- 新增批量脚本 scripts/import/add-en-refs-link.mjs
- 更新 CLAUDE.md 和 DATA_SCHEMA.md 文档

## 2.28.1

关系图谱体验优化：

- 关系图谱筛选/布局参数与 URL 双向绑定（节点类型、关系类型、子节点/关联实体开关、布局模式），刷新页面或分享链接保持筛选状态
- 防御覆盖视角 4 个攻击路径筛选框与 URL 参数绑定
- 切换视角时自动丢弃所有筛选参数，使用新视角默认值
- 防御覆盖视角"关系详情"更名为"节点详情"
- 专项洞察各 pane 默认显示 8 条，添加"显示更多"按钮
- 关联实体块中英文关系类型（co-involved 等）翻译为中文
- 移除所有场景下"查看详细描述"按钮
- 分析视角中隐藏关联实体的 3 个操作按钮
- 修复实体 ID 悬浮提示回归（MutationObserver 防抖数据丢失、按钮内部 span 重复弹窗）
- 修复术语详情页业务场景链接多余 hash

## 2.28.0

全站实体 ID 悬浮提示功能：

- 新增全局自动识别：页面中所有实体 ID（R/A/AT/TA/T/C + 编号）自动添加 dashed 虚线下划线，鼠标悬浮弹出信息卡片
- 信息卡片展示：实体类型标签、ID、标题（可点击跳转详情页）、定义/摘要，底部"查看详情"按钮
- 双路径覆盖：纯文本中的 ID 自动拆分包裹；按钮/链接/表格/卡片中的 ID 通过事件委托悬浮触发，不修改 DOM
- 覆盖范围：知识库详情页、详情抽屉、关系图抽屉、EntityLinkSection 表格等全站场景
- 支持子编号识别（如 R0001-001）、中英文切换响应、Case 懒加载
- 新增工具函数 entityRoute.ts、composable useEntityResolver.ts

## 2.27.4

全局实体关系质量提升：

- 9 条断链规避手段补回 Risk.avoidances（A0010-003/005/006/007、A0025-002、A0040、A0086、A0165/A0166）
- 22 条新兴领域薄弱风险各补 2-4 个规避手段（量子/AIGC/eSIM/NFT/API/元宇宙等）
- TA0029(反催收团伙)、TA0060(移动应用仿冒团伙) 补全关系
- 新增 3 个威胁行为者：TA0062 勒索软件团伙、TA0063 APT/国家级攻击者、TA0064 暗网市场运营者
- 新增 2 个攻击工具：AT0098 依赖包投毒工具、AT0099 容器逃逸与K8s攻击工具

## 2.27.3

攻击工具 × 规避手段关系质量提升（新增 65 条关联）：

- P0: 19 个新攻击工具（AT0076-AT0097）接入横向防护体系，补充依法打击、威胁情报、风控策略等通用手段
- P1: 9 个关联不足的攻击工具补充规避手段（AT0010/AT0013/AT0028/AT0052/AT0053/AT0054）
- P3: 20 个攻击工具补充处置类手段（A0020-003 账号封禁、A0046 信用等级限制、A0053 公关危机响应）
- P4: 17 个攻击工具接入高价值孤立规避手段（A0063 密码复杂性、A0068 零信任、A0085 网络分段、A0088 AI溯源、A0092 MTD、A0070 供应链审计、A0025-001 邮件证书）

## 2.27.2

全局搜索体验优化：

- 修复首页/业务场景已打开抽屉时（如 `/#/home/risk/R0003-001`），搜索结果错误跳转到知识库而非替换抽屉的问题
- 搜索实体 ID 时自动将匹配类型的分组提前显示（如搜索 `A0001` 时规避手段排第一位，而非固定的风险→规避→攻击工具顺序）
- 搜索索引新增 `references[].title`（参考资料标题）和 Case 的 `description`（详细背景）字段
- 搜索结果 snippet 前新增字段来源 badge（如「定义」「描述」「关键词」「参考」），帮助用户识别匹配命中的属性

## 2.27.1

工程质量修复：JSON 重复 key 检测 & VSCode 类型提示修复

- 新增 `eslint-plugin-jsonc`，ESLint 覆盖 `.json` 文件并启用 `jsonc/no-dupe-keys` 规则，`npm run lint` / `npm run build` 可自动检测 JSON 重复 key
- 修复中英文 i18n 文件（`src/i18n/zh-CN/index.json`、`src/i18n/en/index.json`）中 `relationView` 下 5 组重复 key（`evidenceLevel`、`relationExplanation`、`relationImpact`、`qualityFlagReview`、`qualityFlagMissingSource`），保留更完整的版本
- 补充 `env.d.ts` 中 `*.vue` 模块类型声明，修复 VSCode 报 `ts(2307) 找不到模块` 的问题

## 2.27.0

全站路由/链接结构统一重构，URL 语义更清晰、关系图视角参数不再串扰：

- 首页抽屉路由统一为 `/home/{entity}/{id}`（原 `/risks/:rKey` 等扁平路径）；业务场景新增 `/business-scene/:bsKey/{entity}/{id}` 支持所有实体类型，关闭抽屉时回到对应业务场景
- 知识库路由统一为 `/knowledges/{entity}/list` 与 `/knowledges/{entity}/detail/{id}`（entity 段单数）；PC 下 list 默认激活第一个条目，`list?selected={id}` 自动跳转 detail，list/detail 同组件互跳；移动端 list 显示列表、detail 两态切换
- 关系图谱拆分为 4 个独立视角路由：`/relations/risk-relation`、`/relations/attack-path`、`/relations/defense-coverage`、`/relations/path-explorer`，选中实体为 `/relations/{视角}/{entity}/{id}`（entity 单数）；视角由路由 name 决定，切换视角时按 query 白名单隔离参数，彻底消除 pathExplorer 的 endType/endKey/maxDepth/maxPaths 残留到其它视角的问题
- 抽屉中跳知识库详情页的链接改为新窗口打开并补充 TopRight 跳转图标；参考链接 references 补充链接图标
- 「打开关系图」按实体主角色映射视角：risk→风险视角、avoidance→防御覆盖、attack-tool/threat-actor→攻击路径
- 旧路由全部删除不做重定向（hash 模式内部工具，catch-all 落首页）

## 2.26.8

- 修复关系图谱节点详情移动端标题区外跳图标换行问题，保持 ID、标题和外跳图标同一行展示
- 为防御覆盖区块中的可点击实体补充外跳图标样式，并与其它节点详情外跳入口保持一致

## 2.26.7

- 修复路径探索节点详情里关联实体/关系的「作为根节点打开」「查看详细描述」对非邻域节点失效的问题：处理函数原先用局部 findNodeById 查节点，全局节点不在局部图中会直接返回；改为按 ID 前缀推断类型兜底
- 关联实体「查看详细描述」、关系列表节点链接增加 TopRight 外链图标提示

## 2.26.6

- 修复从「路径探索」切到其它视角时节点详情仍停留在路径探索中所选节点的问题：切出路径探索时将节点详情复位为顶部 selector 的根节点

## 2.26.5

- 节点详情概览的关联类型 chip（如「风险: 3」）改为点击在新窗口打开该类型关联实体详情页，并在 chip 内增加外链图标提示

## 2.26.4

- 优化关系图谱路径探索移动端适配：桑基图复用攻击路径视角的最小宽度与高度策略，支持横向滚动并避免图形截断
- 调整路径探索筛选交互：最大跳数、最大路径数滑块拖动时仅更新显示值，释放后再触发路径搜索和桑基图重绘
- 路径探索节点详情改用全局 BREAK 关系构建概览、关系列表、关系计数和相关实体，避免非邻域节点关系显示为空
- 移动端路径探索控制区改为类型窄列、实体宽列的两列布局，减少表单占用高度

## 2.26.3

- 将 Vitest 全局覆盖率阈值提升到 80%，并补充关系图、案例懒加载、抽屉路由、主题和知识库分栏等测试
- 覆盖路径探索、业务场景影响、关系摘要、节点覆盖分析、英文案例合并和懒加载案例 section 等关键分支
- 修复关系视图装配中 `RelationType` 仅作为类型导入导致运行时 watcher 访问失败的问题

## 2.26.2

- 路径探索双击非根节点打开详情时，「与根节点关系」改为展示起点实体→被点击节点的子路径（复用现有间接路径预览 UI），不再恒定显示「没有直接连线」
- 仅在路径探索 tab 生效：以起点实体为根，从已发现的路径截取子路径；网络图/攻击路径/防御覆盖视角行为不变

## 2.26.1

- 修复路径探索桑基图在动态切换语言时不刷新实体标题与类型的问题：`setupRelationViewEffects` 漏解构 `renderPathExplorerSankeyChart`，切换语言时抛 `ReferenceError`
- 路径探索起点/终点实体列表与桑基图节点文案改为随语言重算（`startEntityOptions`/`endEntityOptions` 改用 `computed`，`pathExplorerSankeyData` 计算属性建立 `locale` 依赖）
- 路径探索桑基图改用「起点/终点合并为单节点 + 中间实体按位置多节点」方案，消除不同长度路径导致的多终点现象，保证 DAG 无环

## 2.26.0

- 完善路径探索器：终点类型/实体、最大跳数、最大路径数与 URL 查询参数双向同步，刷新后自动恢复
- 修复路径探索桑基图因无向图搜索产生的环检测报错（cycle），改用「同实体多节点」保证 DAG
- 修复刷新页面后终点实体被错误覆盖为列表首项的问题
- 补充 KnowledgeSplitView、useCases、layoutAndCases 等组件与组合式函数的单元测试
- 修复浏览器视觉巡检「切换关系分析 tab」匹配文案（tab 重构为视角系统后标题已变更）

## 2.25.81

- 补强 `C1039`、`C1284` 两条高价值案例 primary 来源，分别切换为重庆长安网和江苏检察网集群页面
- 按大渡口区法院和无锡滨湖区检察院可核验事实修正案情口径，并同步英文摘要与引用标题
- 修复 `C1039`、`C1284` 英文摘要截断问题
- 案例 primary 覆盖提升到 1294，高价值 primary 覆盖提升到 944，primary 覆盖率提升到 72.01%，高价值 primary 覆盖率提升到 87.41%
- 本批复核中 `C0992` 仅找到文章来源为红网的官方普法转载，`C1072` 仅找到媒体账号承载的警方通报，`C1081` 官方微信触发环境验证，均暂不按 strict primary 落库

## 2.25.80

- 补强 `C0957`、`C1056`、`C1086`、`C1099`、`C1136`、`C1248` 共 6 条高价值案例 primary 来源
- 按公安部、黔南州人民政府、思明法院官方澎湃号、杭州公安、腾讯金融研究院和警民直通车上海官方托管页修正案情口径
- 修复 `C1136`、`C1248` 英文摘要截断，并同步英文引用标题
- 扩展案例来源审计识别，补充 `tfri.tencent.com` primary 域名和警民直通车上海礼品卡非法汇兑案精确 URL 白名单
- 案例 primary 覆盖提升到 1292，高价值 primary 覆盖提升到 942，primary 覆盖率提升到 71.90%，高价值 primary 覆盖率提升到 87.22%
- 本批多子代理复核中，`C0566`/`C0574` 疑似同案重复，`C0912`/`C0916` 仅有官方公众号线索但缺少稳定可核验页面，`C1111` 为法规事实来源而非具体判例，均暂不硬补

## 2.25.79

- 补强 `C0179`、`C0379`、`C0733`、`C1080`、`C1104`、`C1105` 共 6 条高价值案例 primary 来源
- 覆盖萧山区政府、中国长安网、广东省高级人民法院 PDF、深圳新闻网承载南山警方发布、南方+承载蕉岭公安发布等已核验来源
- 修复 `C0379`、`C0733`、`C1080`、`C1104`、`C1105` 英文摘要截断，并同步英文引用标题
- 扩展案例来源审计精确 URL 白名单，仅加入已核验的官方或官方托管页面，不放宽整个平台域名
- 案例 primary 覆盖提升到 1286，高价值 primary 覆盖提升到 936，primary 覆盖率提升到 71.56%，高价值 primary 覆盖率提升到 86.67%
- 本批复核中 `C0252` 仅找到司法部治理综述中的同类案例，`C0619` 仅找到官方微信线索但账号归属未稳定核验，暂不按 strict primary 落库

## 2.25.78

- 补强 `C0818`、`C0827` 两条高价值案例 primary 来源，分别切换为北京法院审判信息网裁判文书和拉萨市公安局警务新闻
- 按法院裁判文书修正金某某破坏计算机信息系统案表述，并补全英文摘要
- 扩展案例来源审计精确 URL 白名单，仅加入已核验的法院裁判文书和公安官网页面
- 案例 primary 覆盖提升到 1280，高价值 primary 覆盖提升到 930，primary 覆盖率提升到 71.23%，高价值 primary 覆盖率提升到 86.11%
- 本批复核中 `C0662` 仅找到政府站转载媒体微信公众号来源，暂不按 strict primary 落库

## 2.25.77

- 补强 `C1751` 高价值案例 primary 来源，切换为西藏自治区党委保密办、自治区国家保密局官方保密典型案例页面
- 按官方保密案例修正唐某非法获取国家秘密案表述，并同步英文摘要与引用标题
- 扩展案例来源审计精确 URL 白名单，仅加入已核验的保密系统官方页面
- 案例 primary 覆盖提升到 1278，高价值 primary 覆盖提升到 928，primary 覆盖率提升到 71.12%，高价值 primary 覆盖率提升到 85.93%
- 记录 `C1409`/`C1410`/`C1411` 已找到韩国检方官方来源但属于同案重复，后续应先去重或合并再落库

## 2.25.76

- 补强 `C0646`、`C0976`、`C1093`、`C1128`、`C1195`、`C1255`、`C1258`、`C1259`、`C1274`、`C1279`、`C1599`、`C1611`、`C1621`、`C1626`、`C1710` 共 15 条高价值案例 primary 来源
- 按上海检察、上海高院、检察日报、公安部网安局、成都公安、最高法知识产权法庭、最高检、公安部、海淀法院、江都公安等官方来源修正案情口径，并同步英文摘要与引用标题
- 修复多条英文案例摘要截断问题，避免 i18n 文本停留在二手来源残缺表述
- 扩展案例来源审计精确 URL 白名单，仅加入已核验的官方账号托管页、法院/公安/检察官方页面和涉案厂商官方页面，不放宽整个平台域名
- 案例 primary 覆盖提升到 1277，高价值 primary 覆盖提升到 927，primary 覆盖率提升到 71.06%，高价值 primary 覆盖率提升到 85.83%
- 记录本批暂不硬补的重复案、分类不稳和无官方原文案例，包括 `C1089` 同类不同案、`C1478`/`C1481` 民事人格权重复案、`C1742` 民事版权裁定分类不稳

## 2.25.75

- 补强 `C1138`、`C1311`、`C1373`、`C1724`、`C1725`、`C1739` 共 6 条高价值案例 primary 来源
- 按中国长安网、宁夏法院网、杭州网警、最高检和甘肃省检察院等官方来源修正案情口径，并同步英文摘要与引用标题
- 扩展案例来源审计 primary 识别，补充 `nxfy.gov.cn`、`jcy.gansu.gov.cn` 和杭州网警假冒 imToken 案精确 URL
- 案例 primary 覆盖提升到 1262，高价值 primary 覆盖提升到 912，primary 覆盖率提升到 70.23%，高价值 primary 覆盖率提升到 84.44%
- 记录本批暂不硬补的重复案和需重构案例，包括 `C0631`/`C0633`/`C0636` 平台规则非同案、`C1409`/`C1410`/`C1411` 韩国 DEX Rug Pull 重复案、`C1742` 民事版权裁定分类不稳

## 2.25.74

- 补强 `C1064`、`C1069`、`C1075`、`C1087`、`C1100`、`C1102`、`C1134`、`C1194`、`C1209`、`C1247`、`C1251`、`C1253`、`C1305`、`C1393`、`C1482`、`C1485`、`C1620`、`C1711` 共 18 条高价值案例 primary 来源
- 按最高检、最高法公报、公安部、地方法院/检察院/公安、美国司法部、英国 CPS、Santa Rosa Police 和 Richmond County DA 等官方来源修正案情口径，并修复多条英文摘要截断
- 将 `C1209` 从不可靠的“判 12 年”二手口径修正为美国司法部可证的 18 个月监禁及 20,379,007 美元赔偿口径
- 扩展案例来源审计 primary 域名识别，补充 `cps.gov.uk`、`statenislandda.org`、`page.alertsense.com`、`sdcourt.gov.cn`、`szlhcourt.gov.cn`、`gaj.huangshi.gov.cn`、`gat.hubei.gov.cn`、`hexushui.jcy.gov.cn`、`baoding.jcy.gov.cn`
- 案例 primary 覆盖提升到 1256，高价值 primary 覆盖提升到 906，primary 覆盖率提升到 69.89%，高价值 primary 覆盖率提升到 83.89%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并记录本批多子代理复核后暂不硬补的重复案、分类不稳和无官方原文案例

## 2.25.73

- 将 `C0350` 按最高检第四十七批指导性案例改写为国有银行管理人员违规使用备付金挪用公款案，删除旧来源无法支撑的南京银行和子账号风险表述
- 将 `C0449` 按泰国知识产权厅官方执法报告改写为跨境与线上渠道知识产权侵权商品查处案例，删除旧来源无法支撑的东盟多国、虚假库存和网赌洗钱表述
- 补强 `C0995` 游戏代练诈骗案例 primary 来源，切换为黑龙江法院网原文，并修复英文摘要截断
- 扩展案例来源审计的 primary 域名识别，补充 `spp.gov.cn`、`ipthailand.go.th`、`hljcourt.gov.cn` 和抖音电商官方学习中心域名
- 案例 primary 覆盖提升到 1238，高价值 primary 覆盖提升到 888，primary 覆盖率提升到 68.89%，高价值 primary 覆盖率提升到 82.22%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并记录本批多子代理复核结论

## 2.25.72

- 补强 `C0801` 高价值案例 primary 来源，切换为上海市静安区人民检察院官方页面
- 按静安检察院原文补充方某某帮助外卖商户重复上线、收取 9 万余元分红和法院判决结果，同步英文摘要与引用标题
- 案例 primary 覆盖提升到 1233，高价值 primary 覆盖提升到 884，primary 覆盖率提升到 68.61%，高价值 primary 覆盖率提升到 81.85%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并记录本批已复核但暂不硬补的案例

## 2.25.71

- 补强 `C0466`、`C0490`、`C0737`、`C0738` 四条高价值案例 primary 来源，覆盖钦南法院官方微信、北京政法网、最高检官网和国家税务总局官网
- 将 `C0490` 从二手开发者文章口径改写为北京通州法院法官披露的技术黄牛爬虫抢票案例，删除旧来源无法直接支撑的销售价格和验证码鉴定细节
- 将 `C0738` 聚焦为重庆税务干部全某某为企业出口退税申报提供帮助并收受财物被判二年案例，删除旧来源泛化的“5起典型案件”表述
- 扩展案例来源审计的精确 primary URL 例外，仅加入已核验的钦南法院官方微信原文
- 案例 primary 覆盖提升到 1232，高价值 primary 覆盖提升到 883，primary 覆盖率提升到 68.56%，高价值 primary 覆盖率提升到 81.76%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并记录本批已复核但暂不硬补的案例

## 2.25.70

- 补强 `C0464`、`C0527`、`C0539` 三条高价值案例 primary 来源，覆盖茂县公安官方微信托管页、抖音电商官方治理公告和央视《新闻直播间》节目页
- 将 `C0527` 从二手媒体口径改写为抖音电商 2021 年异常低价预售店铺清退治理公示，避免混用 2025 年二手报道数据
- 补强 `C0336`、`C0452` 两条 news_report 案例的官方规则来源，分别切换为反电信网络诈骗法原文和最高法银行卡司法解释/答记者问
- 修复 `C0179` 英文摘要截断，并同步更新本批案例英文引用标题
- 扩展案例来源审计的精确 primary URL 例外，不扩大微信或媒体域名整体识别范围
- 案例 primary 覆盖提升到 1228，高价值 primary 覆盖提升到 879，primary 覆盖率提升到 68.34%，高价值 primary 覆盖率提升到 81.39%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并记录本批已复核但暂不硬补的案例

## 2.25.69

- 补强 23 条高价值案例 primary 来源，覆盖最高检、法院、检察院、公安、市场监管、央视、厂商公告、原始研究和法院案号入口等来源
- 将 `C0445` 从二手博客改写为纽卡斯尔大学分布式猜测攻击研究与 Visa 账户枚举风险指南
- 将 `C0524`、`C0696`、`C0249`、`C0256`、`C0687` 分别改写为央视《焦点访谈》、千牛官方治理公告、最高检典型案例、北京法院网通报和最高检指导性案例支撑的事实口径
- 将 `C0595` 补充为 Santa Clara County 法院案号入口与 Apple v. Andrew Aude 诉状/撤诉文件镜像支撑的安全事件
- 扩展案例来源审计的 primary 识别规则，仅加入本批确认的官方/原始来源域名和精确 URL，不把镜像站整体升级为 primary
- 案例 primary 覆盖提升到 1224，高价值 primary 覆盖提升到 877，primary 覆盖率提升到 68.11%，高价值 primary 覆盖率提升到 81.20%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并用当前审计 Top 50 刷新下一批待补队列

## 2.25.68

- 将 `C1022` 从新浪二手来源改写为浙江检察网披露的杭州萧山检察机关办理 AI 换脸淫秽视频侵害个人信息案
- 将 `C0905`、`C0906`、`C1030`、`C1057` 分别改写为中国法院网、四川长安网、石嘴山市中级人民法院、国资委/中国联通官方页可支撑的事实口径
- 删除旧来源无法由官方原文直接支撑的案情细节，并同步英文内容
- 案例 primary 覆盖提升到 1201，高价值 primary 覆盖提升到 856，primary 覆盖率提升到 66.83%，高价值 primary 覆盖率提升到 79.33%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并从待补 primary 队列移除本批已落库案例

## 2.25.67

- 将 `C0258` 从腾讯二手调查报道改写为上海市公安局官网披露的“净网2024”打击网络黑灰产非法引流推广犯罪通报
- 删除旧来源无法由官方通报直接支撑的美女主播、招嫖广告、虚假招聘兼职等调查细节，并同步英文内容
- 案例 primary 覆盖提升到 1196，高价值 primary 覆盖提升到 851，primary 覆盖率提升到 66.56%，高价值 primary 覆盖率提升到 78.87%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并从待补 primary 队列移除本批已落库案例

## 2.25.66

- 将 `C0130` 从中华网二手来源改写为中国警察网/人民公安报披露的上海普陀女子虚构酒店卫生问题索赔被刑拘案
- 将 `C0587` 从中国消费网二手来源改写为商洛市人民政府官网披露的六家酒店涉嫌价格违法被立案调查案
- 修正 `C0595` 的分类和叙述口径，从刑事判决调整为苹果起诉前 iOS 工程师泄露未发布产品与敏感信息的安全事件
- 案例 primary 覆盖提升到 1195，高价值 primary 覆盖提升到 850，primary 覆盖率提升到 66.50%，高价值 primary 覆盖率提升到 78.78%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并从待补 primary 队列移除本批已落库案例

## 2.25.65

- 将 `C0558` 从搜狐二手来源改写为中国法院网披露的上海青浦法院虚假退货骗取平台退款案，并将关联风险修正为退货造假
- 将 `C0624` 从网易二手来源改写为上海市公安局官网披露的涉消费券虚假交易骗补案
- 删除旧来源无法由官方页直接支撑的到付拒收、金华跨省收网和 830 万元扣押等事实口径，并同步英文内容
- 案例 primary 覆盖提升到 1193，高价值 primary 覆盖提升到 848，primary 覆盖率提升到 66.39%，高价值 primary 覆盖率提升到 78.59%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并从待补 primary 队列移除本批已落库案例

## 2.25.64

- 将 `C0138` 从上观新闻二手来源改写为上海市公安局官网披露的游戏外挂黑灰产业链案，并将关联风险从团伙代充修正为外挂
- 将 `C0147` 从网易二手来源改写为湖南公安厅转载公安部典型案例中的湘潭骗取网络账号出售牟利案
- 删除旧来源无法由官方页直接支撑的松江黑代充、高密跨省账号团伙等事实口径，并同步英文内容
- 案例 primary 覆盖提升到 1191，高价值 primary 覆盖提升到 846，primary 覆盖率提升到 66.28%，高价值 primary 覆盖率提升到 78.41%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并从待补 primary 队列移除本批已落库案例

## 2.25.63

- 将 `C0133` 从腾讯二手来源改写为中国长安网披露的上海警方查处网络游戏代币非法换汇案
- 删除旧来源无法由官方页直接支撑的 140 亿元、师某团伙、境外服务器和手续费比例等事实口径，并同步英文内容
- 案例 primary 覆盖提升到 1189，高价值 primary 覆盖提升到 844，primary 覆盖率提升到 66.17%，高价值 primary 覆盖率提升到 78.22%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并从待补 primary 队列移除本批已落库案例

## 2.25.62

- 将 `C0399` 从网易二手来源改写为中国长安网披露的微信“养号”出售给境外诈骗团伙案
- 补充深圳市福田区人民法院官网托管《人民法院报》文章作为裁判层面参考，并同步英文内容
- 删除旧来源无法由官方页直接支撑的 3300 余个微信号、400 余万元获利、境外电话卡和伪装金融人士等事实口径
- 案例 primary 覆盖提升到 1188，高价值 primary 覆盖提升到 843，primary 覆盖率提升到 66.11%，高价值 primary 覆盖率提升到 78.13%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并从待补 primary 队列移除本批已落库案例

## 2.25.61

- 将 `C0531` 从搜狐二手来源改写为广州市南沙区人民法院官方页面披露的恶意呼叫软件破坏计算机信息系统案
- 删除旧来源无法由法院原文支撑的网店贩卖“电话叫不停”、验证码轰炸和传授犯罪方法等事实口径，并同步英文内容
- 案例 primary 覆盖提升到 1187，高价值 primary 覆盖提升到 842，primary 覆盖率提升到 66.05%，高价值 primary 覆盖率提升到 78.04%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并从待补 primary 队列移除本批已落库案例

## 2.25.60

- 将 `C0601` 从云南网二手来源改写为最高法典型案例中的王某等人通过虚拟币交易转移电诈赃款案
- 将 `C0604` 从厦门网二手来源改写为最高法典型案例中的朱某某提供银行卡参与跑分洗钱并行刑衔接处理案
- 将 `C0882` 从上观新闻二手来源改写为最高法典型案例中的有组织提供账号解封等技术支持案
- 删除旧来源无法直接支撑的云南南华跑分团伙、同安水房团伙、批量自媒体引流等事实口径，并同步英文内容
- 案例 primary 覆盖提升到 1186，高价值 primary 覆盖提升到 841，primary 覆盖率提升到 66.00%，高价值 primary 覆盖率提升到 77.94%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并从待补 primary 队列移除本批已落库案例

## 2.25.59

- 将 `C0034` 从网易二手来源改写为中国法院网披露的黄牛购买个人信息并用 AI 换脸抢购茅台案
- 将 `C0893` 从千龙网二手来源改写为中国法院网披露的四人将“养肥”的微信号卖给境外诈骗集团获刑案
- 删除旧来源无法支撑的千账号抢购、扫号软件撞库等事实口径，并同步英文内容
- 案例 primary 覆盖提升到 1183，高价值 primary 覆盖提升到 838，primary 覆盖率提升到 65.83%，高价值 primary 覆盖率提升到 77.66%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并从待补 primary 队列移除本批已落库案例

## 2.25.58

- 将 `C0240` 从网易二手来源改写为新华网转载法院审理结果的高校学生利用境外隐藏网络传播儿童淫秽视频获刑案
- 将 `C0292` 从光明网转载页改写为晋江新闻网法院通讯员稿支撑的丰泽法院“呼死你”软件产业链案
- 将 `C0457` 从腾讯二手来源改写为深圳公安发布托管页支撑的福田警方打击涉诈手机黑卡产业链案
- 删除本批来源未直接支撑的点击量、回复数、VIP 等细节，并同步英文内容
- 为本批新华网、晋江新闻网法院通讯员稿和深圳公安发布托管页增加精确 primary 白名单，不扩大泛域名口径
- 案例 primary 覆盖提升到 1181，高价值 primary 覆盖提升到 836，primary 覆盖率提升到 65.72%，高价值 primary 覆盖率提升到 77.48%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并从待补 primary 队列移除本批已落库案例

## 2.25.57

- 将 `C1249` 从腾讯新闻二手来源改写为央视 3·15 晚会官方视频页披露的同程金融礼品卡变相现金贷曝光案
- 将 `C1632` 从二手新闻改写为 larrylawliet.eth 本人 X 原帖和 Etherscan 地址页支撑的假 mint 链接 NFT 被盗案
- 删除来源未直接支撑的礼品卡 70% 回收价、非法放贷等精确口径，并同步英文内容
- 删除 `C1632` 来源未直接支撑的私钥泄露和损失金额估算口径，并同步英文内容
- 为央视 3·15 晚会视频页、larrylawliet.eth 原帖和 Etherscan 地址页增加精确 primary 白名单，不扩大泛域名口径
- 案例 primary 覆盖提升到 1178，高价值 primary 覆盖提升到 833，primary 覆盖率提升到 65.55%，高价值 primary 覆盖率提升到 77.20%
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.56

- 将 `C0841` 从腾讯云二手报道改写为西班牙国民警卫队和 Group-IB 官方披露的 GXC Team AI 增强钓鱼工具网络案例
- 按官方来源补充 GXC Team 钓鱼套件、Android 短信窃取木马、AI 语音诈骗和一次性验证码诱导事实，并同步英文内容
- 为 Guardia Civil 和 Group-IB 官方页面增加精确 primary 白名单，不扩大泛域名口径
- 案例 primary 覆盖提升到 1176，高价值 primary 覆盖提升到 831，primary 覆盖率提升到 65.44%，高价值 primary 覆盖率提升到 77.02%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并从待补 primary 队列移除本批已落库案例

## 2.25.55

- 将 `C0479` 绵阳手机积分兑换诈骗案替换为央视新闻客户端 primary 来源，并按央视原文修正摘要口径
- 为央视新闻客户端移动页增加精确 primary 白名单，不扩大 `m.news.cctv.com` 泛域名口径
- 案例 primary 覆盖提升到 1175，高价值 primary 覆盖提升到 830，primary 覆盖率提升到 65.39%，高价值 primary 覆盖率提升到 76.92%
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.54

- 将 `C0904` 外挂黑产案替换为腾讯《绝地求生》官方公告来源，并同步英文引用标题
- 将 `C0911` 跨境赌博跑分案替换为银联商务转载中国支付清算协会案例来源，并同步英文内容
- 将 `C0913` 商户收款码非法套现案替换为来源江都警方的中国青年报客户端页面，并同步英文内容
- 将 `C0925` 虚假招聘诈骗案替换为山东能源枣矿集团官网转载枣西公安微信公众号来源，修正案发时间为 2024 年 4 月，并同步英文内容
- 将 `C0929` 直播打赏洗钱案替换为上海市人民检察院来源，并按检察机关口径补充公诉和检察建议事实
- 将 `C0932` 从不匹配的代理维权二手口径改写为乌兰浩特市人民法院官方澎湃号披露的贷款过程中伪造国家机关印章案，并同步英文内容
- 为本批官方托管页和官方转载页增加精确 primary 白名单，不扩大泛域名口径
- 案例 primary 覆盖提升到 1174，高价值 primary 覆盖提升到 829，primary 覆盖率提升到 65.33%，高价值 primary 覆盖率提升到 76.83%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并从待补 primary 队列移除本批已落库案例

## 2.25.53

- 将 `C0541`、`C0542`、`C0543`、`C0544`、`C0545`、`C0547`、`C0548`、`C0549` 统一改写为央视网转载平安北京/朝阳分局披露的调包退货诈骗案，删除 primary 无法支撑的 `121件` 等精确数字口径，并同步英文内容
- 将 `C0564` 七天无理由退货掉包手机案补强为上海静安官方账号托管页，并修复英文摘要截断
- 将 `C0623` 从十堰二手报道改写为最高检披露的宁波虚假交易套取消费券补贴行政检察监督案，并同步英文内容
- 将 `C0627` 租机贷非法经营案替换为上海市静安区政府门户来源，并同步英文引用标题
- 为上海静安官方托管页和央视网转载平安北京/朝阳分局页面增加精确 primary 白名单，不扩大腾讯新闻或央视网域名口径
- 案例 primary 覆盖提升到 1168，高价值 primary 覆盖提升到 823，primary 覆盖率提升到 65.00%，高价值 primary 覆盖率提升到 76.27%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并记录退货调包同案后续去重提醒

## 2.25.52

- 将 `C0499`、`C0500` 点餐优惠券漏洞同案案例从二手来源替换为警民直通车上海官方账号托管页，并同步英文引用标题
- 修复 `C0499`、`C0500` 英文摘要截断问题，补完整非法获利和批捕事实
- 为警民直通车上海腾讯新闻官方托管页增加精确 primary 白名单，不扩大 `news.qq.com` 域名口径
- 案例 primary 覆盖提升到 1157，高价值 primary 覆盖提升到 812，primary 覆盖率提升到 64.39%，高价值 primary 覆盖率提升到 75.25%
- 更新升级计划中的 P0-2 案例来源覆盖统计，并保留 `C0499` 与 `C0500` 后续同案去重提醒

## 2.25.51

- 将 `C0261` 从腾讯新闻二手来源改写为福建省公安厅发布的电诈“吸粉引流”犯罪团伙打击案例，并同步英文内容
- 案例 primary 覆盖提升到 1155，高价值 primary 覆盖提升到 810，primary 覆盖率提升到 64.27%，高价值 primary 覆盖率提升到 75.07%
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.50

- 将 `C0204` 从法治日报二手报道改写为长沙县政府门户发布的网络水军非法经营案，并同步英文内容
- 将 `C0376` 从《星空》钓鱼二手报道改写为 Google TAG 官方披露的 YouTube 创作者钓鱼与 Cookie 窃取攻击，并同步英文内容
- 将 `blog.google` 纳入案例来源审计 primary 域名，用于 Google 官方安全研究和事件披露
- 案例 primary 覆盖提升到 1154，高价值 primary 覆盖提升到 809，primary 覆盖率提升到 64.22%，高价值 primary 覆盖率提升到 74.98%
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.49

- 将 `C0161` 从二手报道的《原神》外挂案改写为辽宁省阜新市中级人民法院发布的游戏外挂卡密加价销售获刑案，并同步英文内容
- 将 `C0184` 从二手报道的刷差评案改写为中国法院网发布的开化县人民法院有偿删除差评非法经营案，并同步英文内容
- 将 `C0396` 从二手报道的养号案改写为贵阳市花溪区人民检察院发布的买卖手机号并运营抖音账号牟利案，并同步英文内容
- 案例 primary 覆盖提升到 1152，高价值 primary 覆盖提升到 807，primary 覆盖率提升到 64.11%，高价值 primary 覆盖率提升到 74.79%
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.48

- 将 `C0579` 替换为连云区人民法院 primary 来源，保留刷单炒信虚假广告罪案情
- 将 `C0522` 从二手报道的“组团偷源码卖盗版”改写为岳麓区人民法院发布的半导体公司高管下载核心技术资料侵犯商业秘密案，并同步英文内容
- 将 `C0330` 从二手报道的停车券团伙案改写为最高检发布的上海商场停车积分虚假用户诈骗案，并修复英文摘要截断
- 案例 primary 覆盖提升到 1149，高价值 primary 覆盖提升到 804，primary 覆盖率提升到 63.94%，高价值 primary 覆盖率提升到 74.51%
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.47

- 将 `C0537` 从二手新闻改写为江苏检察网发布的“仅退款”恶意下单破坏生产经营案，并同步英文标题、关键词、摘要和引用标题
- 将 `C0571` 替换为韶关市浈江区人民法院 primary 来源，并修复英文摘要截断问题
- 将 `sgzjfy.gov.cn` 纳入案例来源审计 primary 域名
- 案例 primary 覆盖提升到 1146，高价值 primary 覆盖提升到 801，primary 覆盖率提升到 63.77%，高价值 primary 覆盖率提升到 74.24%
- 复核 `C0061`、`C0093`、`C0191`、`C0447`、`C0449`、`C0527`、`C0545`、`C0571` 等候选，仅对有法院或检察官网直达且完整支撑案情的案例落库
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.46

- 将 `C0485` 从二手浏览器资讯来源替换为平安浙江网/浙江法治报 primary 来源
- 按宁波中院审理口径将 `C0485` 修正为 B服游戏账号和接码平台绕过防沉迷不正当竞争案，并将“罚款80万元”改为“判赔80万元”
- 同步 `C0485` 英文标题、关键词、摘要和引用标题
- 案例 primary 覆盖提升到 1144，高价值 primary 覆盖提升到 799，primary 覆盖率提升到 63.66%，高价值 primary 覆盖率提升到 74.05%
- 复核 `C0527`、`C0825` 等候选时，因官方规则页不能单独支撑完整案情或来源仍为媒体报道暂不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.45

- 为 `C0712` 替换射洪长安网/遂宁公安 primary 来源，并按官方原文修正为 AI 造谣获利 15 元行政处罚案
- 为 `C0902` 替换《三角洲行动》官方账号托管页 primary 来源，删除来源无法支撑的仓库物资、哈夫币和 14 天资产找回表述
- 将 `suiningpeace.gov.cn` 纳入案例来源审计 primary 域名，并为《三角洲行动》官方托管页增加精确 primary 白名单
- 案例 primary 覆盖提升到 1143，高价值 primary 覆盖提升到 798，primary 覆盖率提升到 63.61%，高价值 primary 覆盖率提升到 73.96%
- 复核 `C0179`、`C0191`、`C0252`、`C0261`、`C0485`、`C0527`、`C0587`、`C0592`、`C0825` 等候选时，因原始官方页缺失、来源只支撑规则不支撑案情或需另案改写暂不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.44

- 将 Vite 依赖声明升级到 `^8.1.0`，并确认生产构建链使用 `vite v8.1.0` 通过
- 为 `C0684` 替换青海省司法厅转载公安部新闻传媒 primary 来源，并按警方回应弱化酒店整体涨价口径
- 为 `C0866` 替换公安部网安局官方微信 primary 来源，修正烟台莱山勒索病毒案时间为 2025 年 12 月
- 为 `C0871`、`C0874` 增加新浪承载公安部网安局通报 primary 白名单，并同步英文引用标题
- 案例 primary 覆盖提升到 1141，高价值 primary 覆盖提升到 796，primary 覆盖率提升到 63.49%，高价值 primary 覆盖率提升到 73.77%
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.43

- 将 `C0112` 从二手报道的杭州宇佑直播减肥宣传案改写为市场监管总局发布的杭州杰福文化传媒直播虚假宣传商品性能典型案例
- 替换 `C0112` 的市场监管总局 primary 来源，并同步英文标题、关键词、摘要和引用标题
- 案例 primary 覆盖提升到 1137，高价值 primary 覆盖提升到 792，primary 覆盖率提升到 63.27%，高价值 primary 覆盖率提升到 73.40%
- 复核 `C0061` 时，仅确认到石景山区市场监管处罚公示入口但未确认到冠游时空精确处罚明细，因此不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.42

- 将 `C0027` 从云晁科技二手来源案例改写为天津面兜兜“一键搬家”爬取商品数据不正当竞争案，替换天津市政府门户 primary 来源
- 将 `tj.gov.cn` 纳入案例来源审计 primary 域名
- 案例 primary 覆盖提升到 1136，高价值 primary 覆盖提升到 791，primary 覆盖率提升到 63.22%，高价值 primary 覆盖率提升到 73.31%
- 复核 `C0061`、`C0112`、`C0179`、`C0587`、`C0592`、`C1154`、`C1291` 等候选时，因原案官方明细未确认、官方原文缺失或媒体汇总口径不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.41

- 为 `C0593` 增加南京市场监管相关官方微信托管页 primary 白名单，确认秦淮区市场监管局酒店价格欺诈典型案例
- 为 `C1041` 替换梧州市应急管理局官网 primary 来源，确认烟花爆竹装卸违规和管理人员处罚事实
- 为 `C1740` 替换兰州市卫健委情况通报 primary 来源，并按官方通报修正为核酸检测异常人员名单误录入阴性信息包事件
- 将 `yjj.wuzhou.gov.cn`、`wjw.lanzhou.gov.cn` 纳入案例来源审计 primary 域名
- 案例 primary 覆盖提升到 1135，高价值 primary 覆盖提升到 790，primary 覆盖率提升到 63.16%，高价值 primary 覆盖率提升到 73.22%
- 复核 `C0587`、`C0592`、`C0644`、`C0837`、`C0902`、`C1057`、`C1082`、`C1091`、`C1154`、`C1159`、`C1632` 等候选时，因官方原文缺失、当前案情不匹配或只能支撑部分链上/公司状态事实暂不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.40

- 为 `C0561`、`C0568`、`C0736`、`C0766`、`C0802` 替换法院、检察院、公安部网安局或检察白皮书 primary 来源，并按官方口径修正摘要和英文翻译
- 为 `C0401` 替换 Microsoft Tycoon2FA 原始技术报告 primary 来源，删除来源无法支撑的医疗科技公司损失细节，改写为 Tycoon2FA 中间人钓鱼套件通用案例
- 为 `C1172` 替换人民法院刑事判决书文本来源，按判决书口径修正为淘宝客户信息被非法爬取 11.8 亿条
- 为 `C0779`、`C1151`、`C1289`、`C1292` 替换公安部网安局、欧洲议会和中国人民银行广东省分行 primary 来源，并将汇总媒体口径改写为可由单一官方来源支撑的监管案例
- 将 `europarl.europa.eu` 纳入案例来源审计 primary 域名，并为央视网、法律教育网、FreeBuf、四川在线、北京日报客户端和新浪承载的可核官方/原始页面增加精确 primary 白名单
- 案例 primary 覆盖提升到 1132，高价值 primary 覆盖提升到 787，primary 覆盖率提升到 62.99%，高价值 primary 覆盖率提升到 72.94%
- 复核 `C0191`、`C0447`、`C0449`、`C0485`、`C0527`、`C0585`、`C0631`、`C0636`、`C0684`、`C0696`、`C0712`、`C0866`、`C0871`、`C0874`、`C1249`、`C1290`、`C1291` 等候选时，因官方原文缺失、与已补案例重复、当前案情不匹配或只能支撑托管线索暂不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.39

- 为 `C0484` 替换消费日报《20款手游未成年人保护测评报告》PDF primary 来源，按报告口径修正为购买 QQ 账号绕过《王者荣耀》注册阶段实名认证
- 为 `C0559` 替换北京政法网快递员“拒收主品留赠品”诈骗案 primary 来源，并按丰台检察院公诉和法院判决口径修正摘要、时间和英文翻译
- 为 `C0978` 替换新浪电竞承载的 DOTA2 官方公告 primary 来源，将 Newbee 案修正为 2021 年官方永久禁赛事实，删除来源无法支撑的比赛过程和动机描述
- 为 `C1623` 替换 Murphy Campbell 本人声明 primary 来源，按本人声明修正为 AI 冒充其声音上传流媒体平台事件
- 将 `dzb.xfrb.com.cn` 纳入案例来源审计 primary 域名，并为 DOTA2 官方公告承载页、艺人本人声明增加精确 primary 白名单
- 案例 primary 覆盖提升到 1120，高价值 primary 覆盖提升到 775，primary 覆盖率提升到 62.33%，高价值 primary 覆盖率提升到 71.83%
- 复核 `C0027`、`C0061`、`C0112`、`C0179`、`C0252`、`C0261`、`C0587`、`C0592`、`C0593`、`C1041`、`C1082`、`C1154`、`C1740`、`C0401`、`C0644`、`C0650`、`C0841`、`C0879`、`C0902`、`C1057`、`C1091`、`C1159`、`C1172`、`C1324`、`C0034`、`C0100`、`C0138`、`C0147`、`C0161`、`C0184`、`C0187`、`C0204`、`C0306`、`C0330`、`C0379`、`C0457`、`C0476`、`C0479`、`C0522`、`C0524`、`C0571`、`C0619`、`C0623` 等候选时，因官方原文不可稳定核验、同案事实不匹配、承载页非官方或只能支撑部分口径不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.38

- 为 `C0591` 替换泉州市市场监督管理局官网划线价价格欺诈 primary 来源，并按监管原文补充处罚时间与事实口径
- 为 `C1287`、`C1288` 替换中国人民银行广东省分行行政处罚信息公示表及附件 primary 来源，并按罚单原文修正罚没金额、处罚事由和案发时间
- 为 `C1176`、`C1178` 替换 SoundCloud 官方说明与 Have I Been Pwned primary 来源，移除来源无法支撑的 API 枚举表述
- 为 `C1414` 替换 Polymarket 官方市场页 primary 来源，将“操纵事件”降调为“UMA 预言机争议性结算事件”
- 为 `C1663` 替换字节跳动官方账号澄清来源，按官方口径修正为实习生恶意干扰模型训练任务事件
- 将 `scjgj.quanzhou.gov.cn`、`pbc.gov.cn`、`soundcloud.com`、`haveibeenpwned.com` 纳入案例来源审计 primary 域名，并为 Polymarket 官方市场页和字节跳动官方澄清页增加精确 primary 白名单
- 案例 primary 覆盖提升到 1116，高价值 primary 覆盖提升到 771，primary 覆盖率提升到 62.10%，高价值 primary 覆盖率提升到 71.46%
- 复核 `C0292`、`C0396`、`C0451`、`C0464`、`C0579`、`C0601`、`C0604`、`C0624`、`C0685`、`C0179`、`C0587`、`C0592`、`C0593`、`C0959`、`C1041`、`C1082`、`C1289`、`C1290`、`C1291`、`C1292`、`C1740`、`C0376`、`C0439`、`C0644`、`C0841`、`C0902`、`C0978`、`C1057`、`C1323`、`C1632`、`C1015` 等候选时，因官方原文不可稳定核验、同案事实不匹配、主体证明不足或只能支撑媒体汇总口径不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.37

- 为 `C1096` 替换柳林县人民政府门户网站转载的山西省市场监督管理局违法广告典型案例 primary 来源，并同步英文引用标题
- 按政府门户来源将 `C1096` 从媒体“11起”口径修正为“山西省市场监督管理局发布部分违法广告典型案例”
- 将 `liulin.gov.cn` 纳入案例来源审计 primary 域名
- 案例 primary 覆盖提升到 1109，高价值 primary 覆盖提升到 764，primary 覆盖率提升到 61.71%，高价值 primary 覆盖率提升到 70.81%
- 复核 `C0191`、`C0527`、`C0712`、`C0779`、`C0866`、`C0871`、`C0874`、`C1015` 等候选时，因只找到媒体转述、转载教程、官方原文不可稳定核验或同案证据不足不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.36

- 为 `C1171` 规范化 VulnTech 速率限制绕过原始技术笔记 URL，并将 `vulntech.com` 纳入案例来源审计 primary 域名
- 为 `C1451` 替换 OWASP Smart Contract Top 10 时间戳依赖 primary 来源，按 OWASP 口径修正标题、摘要和英文翻译，去除来源无法支撑的具体损失表述
- 案例 primary 覆盖提升到 1108，高价值 primary 覆盖提升到 763，primary 覆盖率提升到 61.66%，高价值 primary 覆盖率提升到 70.71%
- 复核 `C0401`、`C0439`、`C0731`、`C1323`、`C1414` 等候选时，因来源为媒体转述、支持论坛旧帖不匹配或官方原始链接不可稳定核验不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.35

- 为 `C0956` 替换中国互联网联合辟谣平台转述的成都警方摆拍相亲视频通报 primary 来源，并同步英文引用标题
- 为 `C1163` 替换柏林数据保护与信息自由专员官网 DeepSeek 应用通报 primary 来源，按官方口径修正标题、摘要和案发时间
- 将 `datenschutz-berlin.de` 纳入案例来源审计 primary 域名
- 案例 primary 覆盖提升到 1106，高价值 primary 覆盖提升到 761，primary 覆盖率提升到 61.55%，高价值 primary 覆盖率提升到 70.53%
- 复核 `C0866`、`C0871`、`C0874`、`C1057`、`C0825` 等候选时，因只找到媒体转载、官方原文 URL 不稳定或同案 primary 不足不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.34

- 为 `C1199`、`C1200` 替换公安部网安局官方微信 primary 来源，并同步英文引用标题
- 将该公安部网安局官方微信精确 URL 纳入案例来源审计 primary 白名单，不扩展整个平台或公众号域名规则
- 案例 primary 覆盖提升到 1104，高价值 primary 覆盖提升到 759，primary 覆盖率提升到 61.44%，高价值 primary 覆盖率提升到 70.34%
- 复核 `C0485`、`C0527`、`C0587`、`C0591`、`C1154`、`C1287`、`C1288` 等候选时，因官方正文不可稳定核验、页面主体为媒体稿或附件正文未核不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.33

- 为 `C1126` 替换上海市杨浦区人民政府转载的上海警方打击网络谣言专项行动 primary 来源，并同步英文引用标题
- 为 `C1198`、`C1201` 替换中国互联网联合辟谣平台转载“山西省公安厅”微信公众号的 AI 造谣传谣典型案例 primary 来源，并同步英文引用标题
- 清理 `C1201` 标题中的媒体平台痕迹，改为按山西公安通报口径描述
- 将 `shyp.gov.cn`、`piyao.org.cn` 纳入案例来源审计 primary 域名
- 案例 primary 覆盖提升到 1102，高价值 primary 覆盖提升到 757，primary 覆盖率提升到 61.32%，高价值 primary 覆盖率提升到 70.16%
- 复核 `C1154`、`C1199`、`C1200`、`C1287`、`C1288` 等候选时，因官方原文不可稳定核验、现有官方页面仅支撑部分口径或附件正文未核不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.32

- 为 `C1169` 追加 PortSwigger Research 原始 HTTP/2 研究来源，并保留 HackTricks 作为补充引用
- 按 VicOne 原始研究口径修正 `C1471` 的标题、摘要和案发时间，将其调整为 V2X “幽灵车辆”伪造消息攻击场景分析，而非未经原文支撑的具体路测事故
- 将 `portswigger.net`、`vicone.com` 纳入案例来源审计 primary 域名
- 案例 primary 覆盖提升到 1099，高价值 primary 覆盖提升到 754，primary 覆盖率提升到 61.16%，高价值 primary 覆盖率提升到 69.88%
- 复核 `C0191`、`C0401`、`C0712`、`C0731`、`C1176`、`C1178`、`C1414`、`C1451`、`C1663` 等候选时，因来源为媒体转述、只能支撑部分技术背景或案情不匹配不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计

## 2.25.31

- 为 `C0689`、`C0704`、`C0735`、`C0744`、`C0791`、`C1095`、`C1127`、`C1226`、`C1232`、`C1236` 追加或替换中国长安网、英国司法机构、Peel Regional Police、安徽纪检监察网、最高检、市场监管局和政府托管年度报告 primary 来源，并同步英文引用标题
- 按官方口径修正 `C1222`、`C1227`、`C1788` 的标题、摘要和引用来源，去除评论性或媒体统计式表述
- 将 `judiciary.uk`、`peelpolice.ca` 纳入案例来源审计 primary 域名
- 案例 primary 覆盖提升到 1097，高价值 primary 覆盖提升到 752，primary 覆盖率提升到 61.05%，高价值 primary 覆盖率提升到 69.69%
- 复核 `C0685`、`C0697`、`C0706`、`C0719`、`C0733`、`C0736`、`C0737`、`C0738`、`C0739`、`C0740`、`C0764`、`C0766`、`C1287`、`C1288`、`C1289`、`C1290`、`C1291`、`C1292`、`C1740` 等候选时，因缺官方原文、仅有附件未核、媒体统计口径或来源支撑不足不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.30

- 为 `C0322`、`C0703`、`C0968`、`C1032`、`C1034`、`C1281`、`C1353` 追加或替换 Barracuda、Imperva、法院、检察机关、中国长安网、公安部和国家网信办 primary 来源，并同步英文引用标题
- 按市场监管总局官方处罚结果修正 `C1230` 的标题、摘要和案发时间口径，替换媒体预测式表述；按 SolidityScan 原始分析修正 `C1415` 的攻击时间、闪电贷金额和获利口径
- 将 `imperva.com`、`barracuda.com` 纳入案例来源审计 primary 域名
- 案例 primary 覆盖提升到 1084，高价值 primary 覆盖提升到 739，primary 覆盖率提升到 60.32%，高价值 primary 覆盖率提升到 68.49%
- 复核 `C0376`、`C0401`、`C0634`、`C0956`、`C0978`、`C0993`、`C1022`、`C1035`、`C1126`、`C1176`、`C1178`、`C1199`、`C1200`、`C1414`、`C1471` 等候选时，因来源只能部分支撑、官方原始 URL 不足或案情不精确不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.29

- 为 `C0085`、`C0250` 追加或替换抖音官方治理公告、商务部知识产权栏目转载执法案例 primary 来源，并同步英文引用标题
- 同步整理 `C0408` 的 IEEE 原始论文引用标题和更新时间
- 将商务部知识产权栏目承载的常熟市场监管跨平台盗图处罚案例按精确 URL 纳入案例来源审计 primary 白名单
- 案例 primary 覆盖提升到 1075，高价值 primary 覆盖提升到 732，primary 覆盖率提升到 59.82%，高价值 primary 覆盖率提升到 67.84%
- 复核 `C0027`、`C0034`、`C0054`、`C0061`、`C0087`、`C0093`、`C0100`、`C0112`、`C0130`、`C0132`、`C0133`、`C0138`、`C0147`、`C0161`、`C0179`、`C0184`、`C0187`、`C0191`、`C0204`、`C0209`、`C0218`、`C0240`、`C0252`、`C0258`、`C0261`、`C0292`、`C0306`、`C0330`、`C0350`、`C0376`、`C0377`、`C0379`、`C0391`、`C0396`、`C0399`、`C0401`、`C0439`、`C0445`、`C0447` 等候选时，未找到高置信同案 primary、事实不匹配、缺官方原始 URL 或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.28

- 为 `C0832`、`C0839`、`C0914`、`C0945` 追加或替换公安部网安局官方托管页、保山市保密局、福田法院和湖南省纪委监委 primary 来源，并同步英文引用标题
- 将公安部网安局支付弱密码盗刷案官方托管页按精确 URL 纳入案例来源审计 primary 白名单
- 案例 primary 覆盖提升到 1073，高价值 primary 覆盖提升到 730，primary 覆盖率提升到 59.71%，高价值 primary 覆盖率提升到 67.66%
- 复核 `C0770`、`C0778`、`C0779`、`C0801`、`C0802`、`C0818`、`C0825`、`C0827`、`C0834`、`C0835`、`C0837`、`C0838`、`C0841`、`C0865`、`C0866`、`C0870`、`C0871`、`C0874`、`C0879`、`C0882`、`C0893`、`C0902`、`C0904`、`C0905`、`C0906`、`C0908`、`C0909`、`C0911`、`C0912`、`C0913`、`C0916`、`C0917`、`C0919`、`C0921`、`C0924`、`C0925`、`C0929`、`C0930`、`C0932`、`C0934`、`C0937`、`C0938`、`C0939`、`C0942`、`C0956`、`C0957`、`C0959` 等候选时，未找到高置信同案 primary、事实不匹配、缺官方原始 URL 或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.27

- 为 `C0641`、`C0642`、`C0648`、`C0649`、`C0677`、`C0680`、`C0720`、`C0757`、`C0758`、`C0759`、`C0761`、`C0763`、`C0998` 追加或替换检察机关、司法部、网信上海、原始技术分享、官方托管页和厂商官方动态 primary 来源，并同步英文引用标题
- 按官方来源修正 `C0642` 的罪名口径为破坏生产经营罪，修正 `C0720` 为“一键脱衣”软件制作、贩卖淫秽物品牟利被公诉案
- 将司法部 `moj.gov.cn` 纳入 primary 域名；将株洲警方官方托管页、虹吸工作室官方动态、凤凰网托管公安部网安局通报按精确 URL 纳入 primary 白名单
- 案例 primary 覆盖提升到 1069，高价值 primary 覆盖提升到 727，primary 覆盖率提升到 59.49%，高价值 primary 覆盖率提升到 67.38%
- 复核 `C0624`、`C0627`、`C0631`、`C0633`、`C0636`、`C0662`、`C0670`、`C0671`、`C0673`、`C0675`、`C0684`、`C0712`、`C0719`、`C0731`、`C0733`、`C0736`、`C0737`、`C0738`、`C0739`、`C0740`、`C0744`、`C0762`、`C0764`、`C0766`、`C0994` 等候选时，未找到高置信同案 primary、官方主体证明不足、事实覆盖不足或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.26

- 为 `C0536`、`C0594` 替换正义网/检察日报体系和最高检官网 primary 来源，并同步英文引用标题
- 按官方来源修正 `C0536` 为 AI 伪造烂果图片恶意“仅退款”诈骗案，更新摘要、标题和案发时间口径
- 将 `ipaguard.com` 纳入厂商官方技术来源，使 `C0517` 的既有厂商来源可被案例来源审计识别为 primary
- 案例 primary 覆盖提升到 1058，高价值 primary 覆盖提升到 716，primary 覆盖率提升到 58.88%，高价值 primary 覆盖率提升到 66.36%
- 复核 `C0516`、`C0518`、`C0522`、`C0524`、`C0526`、`C0527`、`C0530`、`C0531`、`C0537`、`C0539`、`C0585`、`C0587`、`C0591`、`C0592`、`C0593`、`C0595`、`C0597`、`C0600`、`C0601`、`C0604`、`C0619`、`C0623` 等候选时，未找到高置信同案 primary、当前案情不匹配、URL 不稳定、账号证明不足或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.25

- 为 `C0188`、`C0232`、`C0458`、`C0472`、`C0800`、`C0815` 追加中国长安网、温州市中级人民法院托管页、昆明长安网、江苏检察系统、新疆法院网和上海杨浦区政府 primary 来源，并同步英文引用标题
- 按官方来源修正 `C0800`、`C0815`、`C0232` 的摘要事实和案发时间口径；`C0472` 保留澎湃旧引用以支撑 7 亿积分/671 万元细节，同时追加检察系统 primary
- 将光明网托管温州市中级人民法院/龙湾法院案例按精确 URL 纳入案例来源审计 primary 白名单
- 案例 primary 覆盖提升到 1055，高价值 primary 覆盖提升到 714，primary 覆盖率提升到 58.71%，高价值 primary 覆盖率提升到 66.17%
- 复核 `C0161`、`C0179`、`C0184`、`C0187`、`C0191`、`C0204`、`C0209`、`C0218`、`C0240`、`C0250`、`C0252`、`C0258`、`C0261`、`C0449`、`C0451`、`C0461`、`C0462`、`C0464`、`C0466`、`C0473`、`C0476`、`C0479`、`C0485`、`C0490`、`C0491`、`C0495`、`C0496`、`C0499`、`C0500`、`C0801`、`C0802`、`C0818`、`C0825`、`C0827`、`C0832`、`C0834`、`C0835`、`C0837`、`C0838`、`C0839`、`C0841`、`C0865`、`C0866`、`C0870`、`C0871`、`C0874`、`C0879`、`C0882` 等候选时，未找到高置信同案 primary、当前案情不匹配、官方主体证明不足或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.24

- 为 `C0287`、`C0572` 追加武宣县委宣传部官方澎湃号、北京日报托管公安部网安局/陕西网警 primary 来源，并同步英文引用标题
- 将上述两个同案页面按精确 URL 纳入案例来源审计 primary 白名单，避免放宽普通托管平台规则
- 案例 primary 覆盖提升到 1049，高价值 primary 覆盖提升到 708，primary 覆盖率提升到 58.38%，高价值 primary 覆盖率提升到 65.62%
- 复核 `C0457` 等候选时，因当前案情不匹配不硬补；复核 `C0522`、`C0524`、`C0527`、`C0530`、`C0531`、`C0536`、`C0537`、`C0539`、`C0541`、`C0542`、`C0543`、`C0544`、`C0545`、`C0546`、`C0547`、`C0548`、`C0549`、`C0551`、`C0558`、`C0559`、`C0561`、`C0564`、`C0565`、`C0566`、`C0567`、`C0568`、`C0571`、`C0574`、`C0579` 等候选时，未找到高置信同案 primary 或仅有媒体转述的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.23

- 为 `C0749`、`C0886`、`C0887`、`C0907`、`C0935`、`C0948` 追加河北省通信管理局、学习通官方微博存档、广州市政府门户、中央政法委中国长安网和马上消费金融官网 primary 来源，并同步英文引用标题
- 将学习通官方微博存档、马上消费金融官网同案页面按精确 URL 纳入案例来源审计 primary 白名单
- 案例 primary 覆盖提升到 1047，高价值 primary 覆盖提升到 706，primary 覆盖率提升到 58.26%，高价值 primary 覆盖率提升到 65.43%
- 复核 `C0893`、`C0902`、`C0904`、`C0905`、`C0906`、`C0908`、`C0909`、`C0911`、`C0912`、`C0913`、`C0914`、`C0916`、`C0917`、`C0919`、`C0921`、`C0924`、`C0925`、`C0929`、`C0930`、`C0932`、`C0934`、`C0937`、`C0938`、`C0939`、`C0942`、`C0945` 等候选时，未找到高置信同案 primary、当前案情不匹配、账号证明不足或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.22

- 为 `C0663`、`C0665`、`C0666`、`C0682`、`C0683`、`C0836` 追加上海高院、最高法、北京政法网、福建省生态环境厅、国家版权局和公安部网安局相关 primary 来源，并同步英文引用标题
- 修正 `C0683` 云盘盗版案例事实口径，使摘要与国家版权局典型案件一致；修正 `C0836` 数据泄露案例，将“系统测试未加密”改为官方通报可支撑的“弱口令测试账号导致泄露”
- 将上海高院官方微信同案页面、北京日报托管公安部网安局通报页面按精确 URL 纳入案例来源审计 primary 白名单
- 案例 primary 覆盖提升到 1041，高价值 primary 覆盖提升到 700，primary 覆盖率提升到 57.93%，高价值 primary 覆盖率提升到 64.87%
- 复核 `C0644`、`C0646`、`C0648`、`C0649`、`C0650`、`C0662`、`C0664`、`C0684`、`C0685`、`C0686`、`C0712`、`C0720`、`C0731`、`C0735`、`C0749`、`C0841`、`C0865`、`C0870` 等候选时，未找到高置信同案 primary、当前案情不匹配、仅有媒体转述或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.21

- 为 `C0146`、`C0277`、`C0285` 追加最高检、中国信通院报告和 Acer 官方可持续发展报告 primary 来源，并同步英文引用标题
- 将 Acer 官网 `acer.com` 纳入案例来源审计 primary 域名，按厂商官方来源处理
- 案例 primary 覆盖提升到 1035，高价值 primary 覆盖提升到 694，primary 覆盖率提升到 57.60%，高价值 primary 覆盖率提升到 64.32%
- 复核 `C0027`、`C0034`、`C0054`、`C0061`、`C0085`、`C0087`、`C0093`、`C0100`、`C0112`、`C0130`、`C0132`、`C0133`、`C0138`、`C0147`、`C0287`、`C0292`、`C0306`、`C0330`、`C0350`、`C0376`、`C0379`、`C0391`、`C0396`、`C0399`、`C0401`、`C0439`、`C0447` 等候选时，未找到高置信同案 primary、当前案情不匹配、仅有媒体转述或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.20

- 为 `C0489`、`C0497`、`C0560`、`C0602`、`C0614`、`C0616` 追加公安部、公安部网安局官方微信、最高检、央视新闻客户端、中国法院网和广发银行信用卡官方公告 primary 来源，并同步英文引用标题
- 将广发银行信用卡官网 `cgbchina.com.cn` 纳入案例来源审计 primary 域名；将公安部网安局官方微信和央视新闻客户端同案页面按精确 URL 纳入 primary 白名单
- 案例 primary 覆盖提升到 1032，高价值 primary 覆盖提升到 691，primary 覆盖率提升到 57.43%，高价值 primary 覆盖率提升到 64.04%
- 复核 `C0495`、`C0496`、`C0499`、`C0500`、`C0522`、`C0524`、`C0527`、`C0530`、`C0531`、`C0536`、`C0537`、`C0539`、`C0541`、`C0542`、`C0543`、`C0544`、`C0545`、`C0546`、`C0547`、`C0548`、`C0549`、`C0551`、`C0558`、`C0559`、`C0564`、`C0565`、`C0566`、`C0567`、`C0568`、`C0571`、`C0572`、`C0579`、`C0585`、`C0587`、`C0591`、`C0592`、`C0593`、`C0594`、`C0595`、`C0597`、`C0600`、`C0601`、`C0604`、`C0619`、`C0623`、`C0624`、`C0627`、`C0631`、`C0633`、`C0636`、`C0641`、`C0642` 等候选时，未找到高置信同案 primary、当前案情不匹配、罪名口径冲突或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.19

- 为 `C0136`、`C0318`、`C0344`、`C0353`、`C0423` 追加政府、法院系统政务稿、检察机关相关稿件和抖音黑板报托管页 primary 来源，并同步英文引用标题
- 将浙江法院系统政务稿、《方圆》杂志托管页、抖音黑板报托管页按精确 URL 纳入案例来源审计 primary 白名单
- 案例 primary 覆盖提升到 1026，高价值 primary 覆盖提升到 685，primary 覆盖率提升到 57.10%，高价值 primary 覆盖率提升到 63.48%
- 复核 `C0027`、`C0034`、`C0054`、`C0061`、`C0085`、`C0087`、`C0093`、`C0100`、`C0112`、`C0130`、`C0132`、`C0133`、`C0138`、`C0146`、`C0147`、`C0161`、`C0179`、`C0184`、`C0187`、`C0188`、`C0191`、`C0204`、`C0209`、`C0218`、`C0232`、`C0240`、`C0250`、`C0252`、`C0258`、`C0261`、`C0277`、`C0285`、`C0287`、`C0292`、`C0306`、`C0330`、`C0350`、`C0376`、`C0379`、`C0391`、`C0396`、`C0399`、`C0401`、`C0439`、`C0447`、`C0449` 等候选时，未找到高置信同案 primary、现有来源只能证明侦办阶段或案情不匹配的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.18

- 为 `C0814`、`C0880`、`C0881`、`C0888`、`C0889`、`C0891`、`C0898`、`C0901`、`C0903`、`C0915`、`C0936`、`C0958`、`C0966`、`C0989`、`C1028`、`C1029`、`C1036` 追加法院、检察、公安、政府、企业官方、官方微博和美国法院 primary 来源，并同步英文引用标题
- 将维信金科官网 `vcredit.com` 纳入案例来源审计 primary 域名；将腾讯 QQ 官方微博回应、延津县人民法院官方澎湃号按精确 URL 纳入 primary 白名单
- 案例 primary 覆盖提升到 1021，高价值 primary 覆盖提升到 680，primary 覆盖率提升到 56.82%，高价值 primary 覆盖率提升到 63.02%
- 复核 `C0800`、`C0801`、`C0802`、`C0815`、`C0818`、`C0825`、`C0827`、`C0834`、`C0835`、`C0836`、`C0838`、`C0841`、`C0866`、`C0870`、`C0871`、`C0874`、`C0879`、`C0882`、`C0886`、`C0887`、`C0893`、`C0902`、`C0904`、`C0905`、`C0906`、`C0907`、`C0908`、`C0909`、`C0911`、`C0912`、`C0913`、`C0914`、`C0916`、`C0917`、`C0919`、`C0921`、`C0924`、`C0925`、`C0929`、`C0930`、`C0932`、`C0934`、`C0935`、`C0937`、`C0938`、`C0939`、`C0942`、`C0945`、`C0948`、`C0956`、`C0957`、`C0959`、`C0968`、`C0976`、`C0978`、`C0990`、`C0992`、`C0993`、`C0994`、`C0995`、`C0996`、`C0998`、`C1013`、`C1014`、`C1015`、`C1020`、`C1022`、`C1025`、`C1030`、`C1032`、`C1034`、`C1035`、`C1037`、`C1038`、`C1039` 等候选时，未找到高置信同案 primary 或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.17

- 为 `C0734`、`C0768`、`C0769`、`C0776`、`C0777`、`C0780`、`C0819` 追加法院、韩国个人信息保护委员会、中国长安网、公安部和国家网信办 primary 来源，并同步英文引用标题
- 将韩国个人信息保护委员会官网 `pipc.go.kr` 纳入案例来源审计 primary 域名；将乐山市人民政府新闻办公室官方账号页面按精确 URL 纳入 primary 白名单
- 案例 primary 覆盖提升到 1004，高价值 primary 覆盖提升到 663，primary 覆盖率提升到 55.87%，高价值 primary 覆盖率提升到 61.45%
- 复核 `C0712`、`C0719`、`C0720`、`C0731`、`C0733`、`C0736`、`C0737`、`C0738`、`C0739`、`C0740`、`C0744`、`C0749`、`C0757`、`C0758`、`C0759`、`C0761`、`C0762`、`C0763`、`C0764`、`C0766`、`C0770`、`C0778`、`C0779` 等候选时，未找到高置信同案 primary 或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.16

- 为 `C0672`、`C0674`、`C0690`、`C0692`、`C0693` 追加中国政府网、韩国国家人权委员会和北京互联网法院供稿 primary 来源，并同步英文引用标题
- 将韩国国家人权委员会官网 `humanrights.go.kr` 纳入案例来源审计 primary 域名
- 识别 `C0690`、`C0692`、`C0693` 与 `C0222` 为同一北京互联网法院无货源经营伪造证据案，并复用已确认的法院供稿来源
- 案例 primary 覆盖提升到 997，高价值 primary 覆盖提升到 656，primary 覆盖率提升到 55.48%，高价值 primary 覆盖率提升到 60.80%
- 复核 `C0662`、`C0670`、`C0671`、`C0673`、`C0675`、`C0677`、`C0680`、`C0682`、`C0683`、`C0684` 等候选时，未找到高置信同案 primary 或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.15

- 为 `C0620`、`C0622`、`C0638`、`C0653`、`C0659`、`C0661`、`C0669` 追加法院、检察、审计、公安和北京法院官方账号 primary 来源，并同步英文引用标题
- 修正 `C0638` 采购拆单案例的预算、实际采购金额和主体表述，使案例事实与许昌市审计局官方来源一致
- 将江苏检察官网索引指向的仪征检察官方微信原文、北京法院审判信息发布账号页面按精确 URL 纳入案例来源审计 primary 白名单
- 案例 primary 覆盖提升到 992，高价值 primary 覆盖提升到 653，primary 覆盖率提升到 55.20%，高价值 primary 覆盖率提升到 60.52%
- 复核 `C0600`、`C0601`、`C0602`、`C0604`、`C0614`、`C0623`、`C0648`、`C0649`、`C0662` 等候选时，未找到高置信同案 primary、官方原文缺失、账号证明不足或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.14

- 为 `C0552`、`C0554`、`C0556`、`C0598` 追加法院、北京法律服务网、检察机关和最高检 primary 来源，并同步英文引用标题
- 将上海市长宁区人民检察院官网索引指向的官方微信原文按精确 URL 纳入案例来源审计 primary 白名单
- 案例 primary 覆盖提升到 985，高价值 primary 覆盖提升到 646，primary 覆盖率提升到 54.81%，高价值 primary 覆盖率提升到 59.87%
- 复核 `C0551`、`C0564`、`C0565`、`C0571`、`C0579` 等候选时，未找到高置信同案 primary、官方原文缺失、账号证明不足或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.13

- 为 `C0340`、`C0482` 追加大悟发布政务微信和国家新闻出版署 primary 来源，并同步英文引用标题
- 将大悟县人民政府办公室情况通报对应的政务微信原文按精确 URL 纳入案例来源审计 primary 白名单
- 案例 primary 覆盖提升到 981，高价值 primary 覆盖提升到 642，primary 覆盖率提升到 54.59%，高价值 primary 覆盖率提升到 59.50%
- 复核 `C0100`、`C0138`、`C0147`、`C0161`、`C0179`、`C0204`、`C0250`、`C0261`、`C0287`、`C0353`、`C0451`、`C0457`、`C0472`、`C0479`、`C0497` 等候选时，未找到高置信同案 primary、官方原文缺失、账号证明不足或来源支撑不足的不硬补
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.12

- 为 `C0617`、`C0621`、`C0625` 追加江都警方官方微信和公安部典型案例 primary 来源，并同步英文引用标题
- 将江都警方官方微信同案页面按精确 URL 纳入案例来源审计 primary 白名单，避免放宽普通微信平台规则
- 案例 primary 覆盖提升到 979，高价值 primary 覆盖提升到 640，primary 覆盖率提升到 54.48%，高价值 primary 覆盖率提升到 59.31%
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.11

- 为 `C0504`、`C0599`、`C0603`、`C0612` 追加中国长安网、广东政法网、武汉市政府门户和公安部典型案例 primary 来源，并同步英文引用标题
- 复核 `C0527`、`C0530`、`C0531`、`C0536`、`C0537`、`C0539`、`C0543`、`C0544`、`C0545`、`C0546`、`C0547`、`C0548`、`C0549`、`C0558`、`C0559`、`C0560`、`C0561`、`C0566`、`C0567`、`C0568`、`C0572`、`C0574` 等候选时，未找到高置信同案 primary、官方原文缺失、口径冲突或来源支撑不足的不硬补
- 案例 primary 覆盖提升到 976，高价值 primary 覆盖提升到 637，primary 覆盖率提升到 54.31%，高价值 primary 覆盖率提升到 59.04%
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.10

- 为 `C0596`、`C0732`、`C0787`、`C0926` 追加政府门户、辟谣平台、国家安全部官方微信和福建省工信厅转载的 primary 来源，并同步英文引用标题
- 将国家安全部官方微信共享充电宝窃密提醒按精确 URL 纳入案例来源审计 primary 白名单，避免放宽普通微信平台规则
- 复核 `C0780`、`C0839`、`C0886`、`C0891`、`C0902`、`C0978`、`C1057`、`C1176`、`C1323`、`C1414` 等候选时，未找到高置信同案 primary、官方原文缺失或案情支撑不足的不硬补
- 案例 primary 覆盖提升到 972，高价值 primary 覆盖提升到 633，primary 覆盖率提升到 54.09%，高价值 primary 覆盖率提升到 58.67%
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.9

- 修正 `C0434` 烟台公安官方微信 primary 白名单 URL，解决大小写归一后仍因短链字符缺失被误归为 mirror 的问题
- 复核 `C0258`、`C0318`、`C0447`、`C0449`、`C0451`、`C0457`、`C0461`、`C0462`、`C0464`、`C0466`、`C0585`、`C0592`、`C0593`、`C0597` 等候选时，未找到高置信同案 primary、官网索引缺失、账号证明不足或案情不匹配的不硬补
- 案例 primary 覆盖提升到 968，高价值 primary 覆盖提升到 629，primary 覆盖率提升到 53.87%，高价值 primary 覆盖率提升到 58.29%
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.8

- 为 `C0368`、`C0441`、`C0519` 追加 Hack The Box 官方靶机页、Nilson Report 官方统计页和 GitHub DMCA 仓库中的 Anthropic 通知 primary 来源，并同步英文引用标题
- 将 `hackthebox.com` 和 `nilsonreport.com` 纳入案例来源审计 primary 域名，按原始平台和原始统计报告来源处理
- 复核 `C0285`、`C0401`、`C0439`、`C0445`、`C0447`、`C0449`、`C0451`、`C0457`、`C0461`、`C0462`、`C0464`、`C0466`、`C0516`、`C0517`、`C0518`、`C0585`、`C0592`、`C0593`、`C0597` 等候选时，未找到高置信同案 primary、官方原文缺失、账号证明不足或案情不匹配的不硬补
- 案例 primary 覆盖提升到 967，高价值 primary 覆盖提升到 628，primary 覆盖率提升到 53.81%，高价值 primary 覆盖率提升到 58.20%
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.7

- 为 `C0315` 追加广州市人民政府门户转载广州市公安局新闻办公室“断卡”行动通报 primary 来源，并同步英文引用标题
- 复核 `C0277`、`C0292`、`C0306`、`C0318`、`C0330`、`C0344`、`C0350`、`C0353`、`C0379`、`C0495`、`C0499`、`C0579`、`C0587`、`C0591`、`C0604` 等候选时，未找到高置信同案 primary、官方原文缺失、当前案情不匹配或来源支撑不足的不硬补
- 案例 primary 覆盖提升到 964，高价值 primary 覆盖提升到 627，primary 覆盖率提升到 53.64%，高价值 primary 覆盖率提升到 58.11%
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.6

- 为 `C0199`、`C0211`、`C0265`、`C0398` 追加最高法案例评选通报、裁判文书网、常州市委政法委和莆田长安网 primary 来源，并同步英文引用标题
- 将法信网纳入案例来源审计 primary 域名；将莆田长安网检察院栏目同案页面按精确 URL 纳入 primary 白名单，避免放宽普通平台规则
- 复核 `C0027`、`C0034`、`C0054`、`C0061`、`C0085`、`C0087`、`C0093`、`C0100`、`C0112`、`C0130`、`C0188`、`C0191`、`C0204`、`C0209`、`C0218`、`C0232`、`C0240`、`C0250`、`C0252`、`C0261`、`C0287`、`C0315`、`C0340`、`C0396` 等候选时，未找到高置信同案 primary、官方原文缺失、URL 不稳定或案情不匹配的不硬补
- 案例 primary 覆盖提升到 963，高价值 primary 覆盖提升到 626，primary 覆盖率提升到 53.59%，高价值 primary 覆盖率提升到 58.02%
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.5

- 为 `C0397`、`C0450`、`C0488`、`C0525`、`C0581`、`C0589` 追加公安部、广州公安、最高检、福建省纪委监委、四川高院和延安市政府 primary 来源，并同步英文引用标题
- 将福建省纪委监委官网纳入案例来源审计 primary 域名，按政务官网处理
- 复核 `C0399`、`C0423`、`C0439`、`C0447`、`C0449`、`C0451`、`C0457`、`C0458`、`C0461`、`C0462`、`C0464`、`C0466`、`C0469`、`C0473`、`C0479`、`C0485`、`C0489`、`C0490`、`C0491`、`C0497`、`C0524`、`C0541`、`C0542`、`C0591`、`C0592`、`C0593`、`C0597`、`C0601`、`C0603` 等候选时，未找到高置信同案 primary、官方原文缺失或案情不匹配的不硬补
- 案例 primary 覆盖提升到 959，高价值 primary 覆盖提升到 622，primary 覆盖率提升到 53.37%，高价值 primary 覆盖率提升到 57.65%
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.4

- 为 `C0370`、`C0381`、`C0384`、`C0470`、`C0471` 追加或识别河南高院、最高人民法院、青海公安官方澎湃号和上海静安区政府 primary 来源，并同步英文引用标题
- 将青海公安官方澎湃号精确 URL 纳入案例来源审计 primary 白名单，避免放宽普通澎湃平台规则
- 复核 `C0391`、`C0396`、`C0398`、`C0401`、`C0472`、`C0476`、`C0482`、`C0488`、`C0489`、`C0490`、`C0491`、`C0495`、`C0496`、`C0497`、`C0499`、`C0500`、`C0522`、`C0524`、`C0525`、`C0526` 等候选时，未找到高置信同案 primary、官方原文缺失或案情不匹配的不硬补
- 案例 primary 覆盖提升到 953，高价值 primary 覆盖提升到 616，primary 覆盖率提升到 53.03%，高价值 primary 覆盖率提升到 57.09%
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.3

- 为 `C0150`、`C0217`、`C0273`、`C0562` 追加中央政法委门户、审计署、公安部和检察机关 primary 来源，并同步英文引用标题
- 复核 `C0132`、`C0133`、`C0136`、`C0138`、`C0146`、`C0147`、`C0161`、`C0184`、`C0187`、`C0199`、`C0204`、`C0209`、`C0218`、`C0232`、`C0240`、`C0250`、`C0277`、`C0287`、`C0292`、`C0306`、`C0315`、`C0330`、`C0340`、`C0344`、`C0368`、`C0485`、`C0541`、`C0542` 等候选时，未找到高置信同案 primary、官方原文缺失或案情不匹配的不硬补
- 案例 primary 覆盖提升到 948，高价值 primary 覆盖提升到 611，primary 覆盖率提升到 52.75%，高价值 primary 覆盖率提升到 56.63%
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.2

- 为 `C0380`、`C0386`、`C0395`、`C0422`、`C0431`、`C0432`、`C0434`、`C0446`、`C0460`、`C0509` 追加政法、检察、公安、工信部和越南政府电子报 primary 来源，并同步英文引用标题
- 将正义网、越南政府电子报纳入案例来源审计 primary 域名；将昌南公安、烟台公安、石门县人民法院官方微信原文按精确 URL 纳入 primary 白名单
- 复核 `C0379`、`C0397`、`C0399`、`C0423`、`C0439`、`C0447`、`C0449` 等候选时，未找到高置信同案 primary、账号证明不足或案情不匹配的不硬补
- 案例 primary 覆盖提升到 944，高价值 primary 覆盖提升到 607，primary 覆盖率提升到 52.53%，高价值 primary 覆盖率提升到 56.26%
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.1

- 为 `C0345`、`C0352`、`C0375`、`C0378`、`C0400`、`C0402`、`C0405`、`C0410`、`C0535`、`C0555` 追加公安、法院、检察、厂商或漏洞披露平台 primary 来源，并同步英文引用标题
- 按江阴市人民检察院官网来源将 `C0535`、`C0555` 的案情口径修正为“破坏生产经营罪”，并同步中英文摘要和关键词
- 将公安部网安局官方微信短链和武汉市委网信办官网纳入案例来源审计识别，仅按精确 URL 或政务官网处理，未放宽普通平台整站规则
- 复核 `C0350`、`C0353`、`C0376`、`C0377`、`C0401`、`C0408`、`C0571` 等候选时，未找到高置信同案 primary、来源层级不足或案情支撑不足的不硬补
- 案例 primary 覆盖提升到 935，高价值 primary 覆盖提升到 598，primary 覆盖率提升到 52.03%，高价值 primary 覆盖率提升到 55.42%
- 更新升级计划中的 P0-2 案例来源覆盖统计和已复核队列

## 2.25.0

### 路径探索交互面板（P2-1）

- 新增关系图谱"路径探索"tab，支持用户选择任意起点/终点实体，以桑基图展示所有发现路径
- 支持参数调节：最大跳数（1-6）、最大路径数（1-30）
- 复用现有 BFS 路径发现算法（`findRelationPaths`）和桑基图渲染控制器
- 新增 `relationPathExplorerSankey.ts`：将发现路径转为桑基图 nodes/links 数据
- 新增 `RelationPathExplorerPane.vue`：路径探索面板，包含实体选择器、参数滑块、桑基图、统计信息
- `createSankeyChartController` 支持 `viewModeKey` 参数，允许多实例共存
- pathExplorer tab 独立于三大分析视角系统，切换不干扰视角联动
- 桑基图节点支持双击查看详情、右键打开操作菜单
- 移动端响应式布局

## 2.24.0

### 架构与代码质量改进

- **[P0-A] 修复 i18n 英文 Promise 永久缓存 bug**：`cnBreakMessagePromise` 和 `enBreakMessagePromise` 失败后重置为 null，防止英文模式功能永久瘫痪
- **[P0-B] 修复 HomeView fullBreakPromise 永久缓存 bug**：失败后重置缓存，防止抽屉详情功能永久失效
- **[P1-A] 路由 meta 标记替代硬编码集合**：删除 `routesNeedFullLocaleMessages` 硬编码集合，改用 `meta.needsBreakData` 声明式标记，新增路由不再需要手动同步
- **[P1-B] HomeView 抽屉管理重构**：新增 `useDrawerRoute` composable，5 个抽屉的路由感知状态管理从 150 行重复代码缩减为 50 行声明式配置
- **[P1-C] 统一 Element Plus 样式引入**：移除 12 个文件中 32 行冗余的手动 `import "element-plus/es/components/*/style/css"`，统一由 unplugin-vue-components 的 ElementPlusResolver 自动处理
- **[P1-D] 抽屉详情组件样式去重**：抽取 `drawer-detail-shared.css` 公共样式文件，5 个抽屉详情组件共享，消除 130 行重复 CSS
- **[P1-E] 加强异步错误处理**：`useCases.ts` 英文翻译单文件加载容错、locale 切换 try-catch、全局 watcher 单例化防止重复注册

### 数据质量与工程化

- **[P2-A] 构建管线优化**：新增 `build:validate`（lint + type-check + validate:data + coverage）和 `build:fast`（跳过 lint/test 的快速构建）命令
- **[P2-C] references 中英文对齐门禁**：`i18n-sync.mjs --strict` 新增 references 数组长度一致性检查，发现并修复 C1316、C1553 两处已有的 references 错配
- **[P2-D] updated 字段日期格式校验**：`breakSchema.ts` 中 7 处 `updated` 字段增加 `YYYY-MM-DD` 正则约束

### 统计

- 22 个文件修改，2 个新文件（`useDrawerRoute.ts`、`drawer-detail-shared.css`）
- 净减 218 行代码（169 insertions, 387 deletions）

## 2.23.102

- 为 `C0023` 追加中国长安网/山东长安网政法系统官方来源，并同步英文引用标题
- 按官方来源将 `C0023` 标题、关键词和摘要修正为“发展近4000人、涉案7000万元、3名主要嫌疑人被采取刑事强制措施”的口径
- 复核 `C0027`、`C0034`、`C0054`、`C0061`、`C0087`、`C0100`、`C0112`、`C0132`、`C0133`、`C0136`、`C0250` 等候选时，未找到高置信同案 primary 或案情不匹配的不硬补
- 案例 primary 覆盖提升到 910，高价值 primary 覆盖提升到 575，primary 覆盖率提升到 50.64%，高价值 primary 覆盖率提升到 53.29%
- 更新升级计划中的 P0-2 案例来源覆盖统计和下一批候选

## 2.23.101

- 为 `C0224` 追加最高人民检察院官网来源，并同步英文引用标题
- 复核 `C0130`、`C0179`、`C0188`、`C0191`、`C0211`、`C0217`、`C0218`、`C0261` 等候选时，未找到高置信同案 primary 的不硬补
- 案例 primary 覆盖提升到 909，高价值 primary 覆盖提升到 574，primary 覆盖率提升到 50.58%，高价值 primary 覆盖率提升到 53.20%
- 更新升级计划中的 P0-2 案例来源覆盖统计和下一批候选

## 2.23.100

- 为 `C0120` 追加抖音黑板报官方治理公告入口，并同步英文引用标题
- 将该抖音官方公告精确纳入案例来源审计 primary 白名单，避免扩大到普通抖音视频来源
- 案例 primary 覆盖提升到 908，高价值 primary 覆盖提升到 573，primary 覆盖率提升到 50.53%，高价值 primary 覆盖率提升到 53.10%
- 更新升级计划中的 P0-2 案例来源覆盖统计和下一批候选

## 2.23.99

- 为 `C0231` 追加中国法院网官方来源，并同步英文引用标题
- 案例 primary 覆盖提升到 907，高价值 primary 覆盖提升到 572，primary 覆盖率提升到 50.47%，高价值 primary 覆盖率提升到 53.01%

## 2.23.98

- 修复关系图空白区域无法拖拽的问题，将 Graph 漫游触发范围扩展到整张画布
- 恢复节点单击后的立即选中行为，并允许合法实体 ID 在当前图数据未加载时打开节点详情抽屉
- 调整关系图筛选优先级，使子节点优先于关联实体，关闭关联实体时仍可显示已开启的子节点

## 2.23.97

- 为 `C0727`、`C1340`、`C1405`、`C1456`、`C1513` 补充论文、研究机构或原始攻击复盘来源，并同步英文引用标题
- 为 `C0101` 追加人民法院案例库官方来源，并同步英文引用标题
- 将 CVF Open Access、IACR ePrint/TCHES、MDPI、Chainlink、KU Leuven 新闻和 `view.inews.qq.com` 纳入案例来源审计识别
- 案例 primary 覆盖提升到 906，高价值 primary 覆盖提升到 571，primary 覆盖率提升到 50.42%，高价值 primary 覆盖率提升到 52.92%

## 2.23.96

- 为关系页节点洞察计算增加节点索引、邻接索引和路径展开上限，修复点击高连接 Risk 节点时浏览器主线程卡死的问题
- 复用攻击路径全量计算结果，并为网络布局的节点度数与连线节点查询建立索引，降低选中节点、Sankey 和力导布局的重复同步计算
- 补充密集关系路径发现回归测试，确保高分支关系图不会在一次节点选择中无限展开
- 收窄关系图悬浮工具栏并调整筛选面板避让位置，减少 PC 端图谱操作控件遮挡

## 2.23.95

- 为 `C0239`、`C1189` 追加武汉公安官方通报和 RedLock 原始研究存档来源，并同步英文引用标题
- 收紧 `C0436`、`C0440` 对 PayPal/HUMAN Security 原文的描述措辞，避免把官方文章泛化为报告结论
- 将 PayPal、HUMAN Security、F5、Greip 和 RedLock 原始研究存档纳入案例来源质量审计识别，案例 primary 覆盖提升到 897，高价值 primary 覆盖提升到 570

## 2.23.94

- 移除关系页重复的任务型分析视角控件，改由主标签直接承载风险、攻击路径和防御覆盖视角，并同步视角预设
- 将 PC 端分析面板的规避覆盖与攻击路径列表默认收敛为 10 条，保留“更多/收起”增量展示
- 拆分关系图请求分发逻辑为 `relationGraphRequestDispatcher`，补充关系页装配、选择器、增量列表和分发器测试
- 为 `C0272`、`C0280`、`C0406`、`C0421` 补充案例来源并同步英文引用标题

## 2.23.93

- 提取 CI 公共初始化流程，新增 `setup-node-env` 和 `setup-playwright` composite action，统一 Node 24、`npm ci`、Playwright 缓存、Chromium 安装和站点构建 artifact 下载
- 将 5 个浏览器回归 job 合并为 matrix strategy，并让 `build` 复用 `data-export` 产出的静态数据 artifact，减少 workflow 重复步骤
- 更新升级规划，移除已完成的 CI workflow DRY 待办，保留内容治理与可视化推理后续任务

## 2.23.92

- 为 `C0194` 追加广州市公安局“净网2022”官方来源，并同步英文引用标题
- 案例 primary 覆盖提升到 887，高价值 primary 覆盖提升到 564，primary 覆盖率提升到 49.36%，高价值 primary 覆盖率提升到 52.27%

## 2.23.91

- 为 `C0024` 追加公安部“上海闵行全链条打击倒卖医院号源违法犯罪”官方来源，并同步英文引用标题
- 按公安部官方口径将涉案人员描述修正为抓获 10 名犯罪嫌疑人；案例 primary 覆盖提升到 886，高价值 primary 覆盖提升到 563，高价值 primary 覆盖率提升到 52.18%

## 2.23.90

- 继续补强高价值案例 primary source，为 `C0274`、`C0276`、`C0316`、`C0321`、`C0326`、`C0327`、`C0329`、`C0332`、`C0339`、`C0342` 追加公安、法院、检察、税务和政法系统官方来源，并同步英文引用标题
- 案例 primary 覆盖提升到 885，高价值 primary 覆盖提升到 562，primary 覆盖率提升到 49.25%，高价值 primary 覆盖率提升到 52.09%

## 2.23.89

- 拆分 `RelationNodeDrawerRelations` 的关系筛选逻辑，新增 `relationNodeDrawerRelationFilters` 承载筛选匹配、候选项构建、自然排序去重和无效筛选清理
- 新增节点关系抽屉筛选 helper 单测，覆盖组合筛选、级联候选项、排序去重和筛选清理；当前测试规模为 49 个测试文件、306 个测试
- 更新升级规划，标记节点关系抽屉筛选规则已拆分，后续继续收敛关系分组渲染和节点跳转控制

## 2.23.88

- 继续拆分 `RelationAnalysisPane`，新增 `RelationAnalysisDetailColumn` 承载右侧详情列，父组件收敛为三列编排、筛选与滚动保留逻辑
- 补强分析面板子列测试，覆盖右侧详情空态、抽屉专属块关闭状态和详情事件透传；当前测试规模为 48 个测试文件、302 个测试
- 更新升级规划，将 P1-3 关系页工程债剩余重点收敛到节点关系抽屉、分析面板更细粒度卡片和图构建分发逻辑

## 2.23.87

- 拆分 `RelationAnalysisPane` 左侧覆盖/专项洞察列和中间路径列，新增 `RelationAnalysisCoverageColumn`、`RelationAnalysisPathColumn`，降低分析面板主组件模板复杂度
- 新增分析面板子列 contract 测试，覆盖覆盖项筛选、专项洞察筛选、路径选择和移动端展开事件；当前测试规模为 48 个测试文件、299 个测试
- 更新升级规划，移除已完成的 P1-4 任务型分析视角待办，并将 P1-3 剩余工程债收敛到右侧详情组合、节点关系抽屉和图构建分发逻辑

## 2.23.86

- 新增关系页任务型分析视角配置，支持风险总览、攻击路径和防御覆盖三类公开视角，并按视角自动切换默认图表、节点类型、关系线类型、子节点/相关实体筛选和网络布局
- 在关系页选择栏增加分析视角切换控件，同步支持 URL `perspective` 查询参数，便于分享和恢复当前分析任务
- 补强 `RelationSelectorBar`、`RelationView`、`relationViewState` 和 `relationViewAssembly` 测试，覆盖视角归一化、组件事件转发、页面组合暴露和视角应用链路；当前测试规模为 47 个测试文件、295 个测试

## 2.23.85

- 新增 `relationSpecialInsightBuilders` 直接分支测试，覆盖缺失实体、规避手段无覆盖复核建议、风险与工具重叠覆盖、攻击工具无 gap 使用建议和威胁行为者防御优先项
- 将 Vitest coverage 全局阈值从 72% 提升到 74%；当前测试规模为 47 个测试文件、291 个测试，coverage 为 statements 89.19%、branches 74.46%、functions 89.19%、lines 91.79%

## 2.23.84

- 继续拆分 `relationCoverageAnalysis`，新增 `relationSpecialInsightBuilders` 承载规避手段、攻击工具和威胁行为者专项洞察构建逻辑
- 将 `relationCoverageAnalysis` 主文件收敛为 selected node 覆盖摘要和专项洞察选择层，保留现有覆盖分析测试验证行为不回退

## 2.23.83

- 继续拆分 `relationCoverageAnalysis`，新增 `relationNodeCoverageBuilders` 承载风险、规避手段、攻击工具和威胁行为者的节点覆盖摘要构建逻辑
- 保留 `relationCoverageAnalysis` 主模块负责 selected node 组合和专项洞察组合，降低主文件职责密度，并通过既有覆盖分析测试验证行为不回退

## 2.23.82

- 将 `C0677` 的先知社区作者原始云存储接管复盘加入精确 primary 白名单，修正该高价值安全事件被审计为 secondary only 的问题
- 案例 primary 覆盖提升到 875，高价值 primary 覆盖提升到 552，primary 覆盖率提升到 48.69%，高价值 primary 覆盖率提升到 51.16%

## 2.23.81

- 拆分 `relationCoverageAnalysis` 通用 helper，抽出节点 item builder、规避手段排序、洞察 section builder、按风险反查威胁行为者、按工具反查风险、按风险和工具反查规避手段等纯组合逻辑
- 保持 `relationCoverageAnalysis` 现有行为不变，定向测试覆盖风险、规避手段、攻击工具、威胁行为者覆盖摘要和专项洞察分支
- 更新升级规划，将 P1 关系页工程债的剩余重点收敛到分析面板、节点关系抽屉和覆盖分析 helper 的继续拆分

## 2.23.80

- 继续补强高价值 Web3 安全事件 primary source，为 `C1483` 追加 SharkTeam 周杰伦 BAYC #3738 钓鱼盗窃链上分析 PDF，并同步英文引用标题
- 案例 primary 覆盖提升到 874，高价值 primary 覆盖提升到 551，primary 覆盖率提升到 48.64%，高价值 primary 覆盖率提升到 51.07%

## 2.23.79

- 新增 `RelationNodeDrawerRelations` 组件 contract 测试，覆盖多实体关系渲染、空关系列表、方向/关系类型/直接性过滤、清空筛选、方向筛选暴露方法、关系数据变化重置、复制事件、节点详情跳转和增量展开折叠
- 将 Vitest coverage 全局阈值从 70% 提升到 72%；当前测试规模为 46 个测试文件、286 个测试，coverage 为 statements 88.59%、branches 73.77%、functions 87.77%、lines 91.33%
- 更新升级规划，标记 `RelationNodeDrawerRelations` 主要展示状态、空状态和交互事件测试已补齐，后续重点转向分析面板/节点关系抽屉小步拆分和 `relationCoverageAnalysis` helper 拆分

## 2.23.78

- 补强关系页网络图控制器测试，覆盖 inactive、缺失容器、异步过期渲染、移动端选项、tooltip 转义、拖拽、点击早退、滚动容器、全屏和销毁清理等分支
- 补强关系页 Sankey 控制器测试，覆盖 inactive、缺失容器、空数据、零尺寸重试、移动端延迟渲染、tooltip、非法事件、指针事件、右键菜单和销毁清理等分支
- 新增 `RelationAnalysisPane` 组件 contract 测试，覆盖空态、三列分析内容、筛选重置、规避覆盖筛选、路径选择、专项洞察筛选、移动端展开折叠和详情事件转发
- 将 Vitest coverage 全局阈值从 65% 提升到 70%，并同步升级规划中关系页工程债的剩余拆分重点

## 2.23.77

- 继续补强高价值案例 primary source，为 `C0420`、`C0454`、`C0694`、`C0748`、`C0750`、`C0830`、`C0949`、`C1193`、`C1246`、`C1375`、`C1425`、`C1783` 追加或识别公安、检察、法院、平台、监管、司法部、安全厂商和项目官方来源，并同步英文引用标题
- 修正 `C0830`、`C1425` 的案发时间文本，避免将 2023 年 OpenAI 空投钓鱼和 2019 年 ETC 51% 攻击误标为 2024 年事件
- 案例 primary 覆盖提升到 873，高价值 primary 覆盖提升到 550，primary 覆盖率提升到 48.58%，高价值 primary 覆盖率提升到 50.97%

## 2.23.76

- 继续补强高价值案例 primary source，为 `C0511`、`C0575`、`C1523` 追加国家网络安全通报中心、江苏网信和 SlowMist 官方来源，并同步英文引用标题
- 案例 primary 覆盖提升到 861，高价值 primary 覆盖提升到 538，primary 覆盖率提升到 47.91%，高价值 primary 覆盖率提升到 49.86%

## 2.23.75

- 补强 `relationGraphBuilder` 分支测试，覆盖根节点、图数据重建、渲染跳过、图例过滤和各实体关系构建分发
- 清理升级规划中的已完成项，将 P1 关系页工程债待办聚焦到图表控制器、分析面板和节点关系抽屉
- 忽略 TypeScript 编译配置文件时生成的 vite/vitest 配置产物

## 2.23.74

- 补强关系覆盖分析测试，覆盖空选择、未知实体、孤立规避手段、有效性排序、攻击工具缺口和威胁行为者缺口等分支
- 更新升级规划，将关系页工程债治理拆为独立 P1 项，明确 graph builder、图表控制器、分析面板和节点关系抽屉的测试与拆分路线
- 优化 CI 浏览器回归链路，由 build job 上传静态站产物并供 browser-smoke、relation-stability、Lighthouse、性能和视觉巡检 job 复用，同时增加 Playwright Chromium 缓存

## 2.23.73

- 案例详情页参考部分改为列表样式展示，与风险、规避手段等其他实体详情页保持一致

## 2.23.72

- 修复全局搜索（⌘K）无法通过案例编号检索的问题：搜索对话框打开时触发案例懒加载，确保案例数据纳入搜索索引

## 2.23.71

- 继续补强高价值安全事件 primary source，为 `C0781` 追加 GitHub 官方事件说明，为 `C1678` 追加国家网络安全通报中心供应链投毒官方原文，并同步英文引用标题
- 案例 primary 覆盖提升到 858，高价值 primary 覆盖提升到 535，primary 覆盖率提升到 47.75%，高价值 primary 覆盖率提升到 49.58%

## 2.23.70

- 继续补强高价值 Web3 安全事件 primary source，为 `C1550` 追加 Multichain 官方停运说明，并同步英文引用标题
- 案例 primary 覆盖提升到 856，高价值 primary 覆盖提升到 533，primary 覆盖率提升到 47.63%，高价值 primary 覆盖率提升到 49.40%

## 2.23.69

- 继续补强高价值监管、平台竞争和境外司法案例 primary source，为 `C1160`、`C1233`、`C1235`、`C1392` 追加 CNPD、市场监管总局、上海市场监管局和美国司法部官方来源，并同步英文引用标题
- 案例 primary 覆盖提升到 855，高价值 primary 覆盖提升到 532，primary 覆盖率提升到 47.58%，高价值 primary 覆盖率提升到 49.30%

## 2.23.68

- 继续补强高价值境外司法案例 primary source，为 `C1212`、`C1389`、`C1406` 追加美国司法部 SIM swapping、Mirai 僵尸网络和 Frosties NFT Rug Pull 官方公告，并同步英文引用标题
- 案例 primary 覆盖提升到 851，高价值 primary 覆盖提升到 528，primary 覆盖率提升到 47.36%，高价值 primary 覆盖率提升到 48.93%

## 2.23.67

- 继续补强高价值公安执法案例 primary source，为 `C0459` 追加公安部打击整治侵犯公民个人信息犯罪发布会专题页，为 `C0429` 追加湘潭市政府门户发布的湘潭公安常态化扫黑除恶成效原文，并同步英文引用标题
- 案例 primary 覆盖提升到 848，高价值 primary 覆盖提升到 525，primary 覆盖率提升到 47.19%，高价值 primary 覆盖率提升到 48.66%

## 2.23.66

- 继续补强高价值司法和行政监管案例 primary source，为 `C0455` 追加公安部涉银行卡犯罪典型案例原文，为 `C0523` 追加广东省通信管理局 App 监管通报原文，并同步英文引用标题
- 案例 primary 覆盖提升到 846，高价值 primary 覆盖提升到 523，primary 覆盖率提升到 47.08%，高价值 primary 覆盖率提升到 48.47%
- 补充 `HomeView` 和 `RelationView` 页面级组合测试，覆盖首页统计、详情路由、非法路由回退、业务场景关闭、关系页预加载、卸载清理、详情抽屉和网络面板事件转发
- 补充布局、主题和案例相关 composables 测试，覆盖 `useBreakpoints`、`useTheme`、`useDrawerWidth`、`useCasesByRisk`、`useLazyCasesSection`、`useRelationGraph`
- 将 Vitest coverage 阈值从 62% 提升到 65%；当前测试规模为 44 个测试文件、248 个测试，coverage 为 statements 81.11%、branches 65.06%、functions 81.19%、lines 83.68%
- 为浏览器视觉巡检增加 `knownWarnings` 分类，区分首页英文矩阵受控横向滚动、移动端关系图画布和抽屉打开态等已知复核项；本地巡检 unknown warning 已降为 0
- 为 CI、deploy 和 link-check workflow 增加 job 级超时上限，降低 hard-fail 浏览器链路挂死风险

## 2.23.64

- 继续补强高价值游戏账号黑产案例 primary source，为 `C0317`、`C0338` 追加检察系统发布的上海网络检察案例合集，并同步英文引用标题
- 案例 primary 覆盖提升到 844，高价值 primary 覆盖提升到 521，primary 覆盖率提升到 46.97%，高价值 primary 覆盖率提升到 48.29%

## 2.23.63

- 修复案例来源质量审计中精确 primary 白名单的大小写归一化，确保 Manta Network、Aztec Labs、Scam Sniffer、PeckShield 等 X 原始公告链接按精确 URL 正确识别
- 案例 primary 覆盖提升到 842，高价值 primary 覆盖提升到 519，primary 覆盖率提升到 46.86%，高价值 primary 覆盖率提升到 48.10%

## 2.23.62

- 更新升级规划，将已完成的浏览器回归 hard-fail 收紧从未完成 P0 项中移除，改为后续测试覆盖和视觉巡检噪声治理任务
- 明确当前 PR CI 已覆盖 browser-smoke、relation-stability、lighthouse-baseline、site-performance、visual-review 独立阻断门禁，后续重点转向 `RelationView`、`HomeView` 和关键交互测试深度
- 继续补强高价值案例 primary source，为 `C0492` 追加公安部人民公安报来源，为 `C0521` 追加营口法院案例来源，并同步英文引用标题

## 2.23.61

- 将浏览器视觉巡检提升为 PR CI 独立 hard-fail job，覆盖 3 档视口、知识库页面、关系图/Sankey/Analysis 交互、搜索、导航、主题语言切换、异常路由回退和移动端关键路径
- 移除 major/minor 条件浏览器回归 gate/job；slow browser 链路已拆为 `browser-smoke`、`relation-stability`、`lighthouse-baseline`、`site-performance`、`visual-review` 独立阻断 job
- 本地执行 `npm run test:visual-review` 通过，生成 78 张截图报告；当前报告仍保留布局 warning 作为人工复核线索，不作为失败条件

## 2.23.60

- 将静态站性能预算提升为 PR CI 独立 hard-fail job，覆盖首页、风险列表和关系 Sankey 的加载耗时、总传输、脚本传输和资源数量预算
- 从条件浏览器回归 job 中移除重复 performance 执行，保留视觉复核继续按 major/minor 版本变化运行
- 本地执行 `npm run test:performance` 通过，最重页面 relation-sankey load=1275ms、transfer=2118.44kB、scripts=1827.92kB、resources=71，低于当前预算

## 2.23.59

- 扩展 `RelationNodeDetailDrawer` 组件测试，覆盖桌面/移动端抽屉尺寸、空节点不渲染、关闭同步和详情内容所有操作事件转发
- 关系页测试规模提升到 40 个测试文件、233 个测试，coverage 为 statements 77.66%、branches 62.33%、functions 77.15%、lines 80.39%
- 继续补强高价值游戏安全案例 primary source，为 `C0980`、`C0986`、`C0988` 追加《和平精英》官网坐挂车、外挂和观战透视处罚公告，并同步英文引用标题
- 案例 primary 覆盖提升到 836，高价值 primary 覆盖提升到 513，primary 覆盖率提升到 46.52%，高价值 primary 覆盖率提升到 47.54%

## 2.23.58

- 将 Lighthouse 基线提升为 PR CI 独立 hard-fail job，强制覆盖首页、风险列表和关系 Sankey 在桌面/移动端的性能、可访问性、最佳实践、SEO、LCP 和 CLS 预算
- 从条件浏览器回归 job 中移除重复 Lighthouse 执行，保留 performance 与视觉复核继续按 major/minor 版本变化运行
- 本地强制执行 `BREAK_FORCE_BROWSER_REGRESSION=1 npm run test:lighthouse` 通过，最弱移动端关系 Sankey perf=65、LCP=6870ms，仍高于当前预算

## 2.23.57

- 扩展 `RelationSelectorBar` 组件测试，覆盖 idle 延迟加载、fallback timer、关系类型切换、缺失类型映射、空闲回调清理和定时器卸载清理
- 将 Vitest coverage 阈值从 61% 提升到 62%；当前测试规模为 40 个测试文件、231 个测试，coverage 为 statements 77.48%、branches 62.23%、functions 76.51%、lines 80.20%
- 更新升级规划中 P0-3 自动化回归状态，明确 RelationSelectorBar 关键生命周期与选项加载逻辑已纳入组件测试

## 2.23.56

- 继续补强高价值平台治理、反诈和游戏安全案例 primary source，为 `C0268`、`C0480`、`C0927`、`C0981`、`C0984`、`C0987`、`C1155`、`C1158` 追加微信安全中心、公安部、《和平精英》官网和国家网络安全通报中心等官方来源，并同步英文引用标题
- 扩充案例来源质量审计的 primary 精确链接识别，纳入微信安全中心和国家网络安全通报中心官方微信原文
- 案例 primary 覆盖提升到 833，高价值 primary 覆盖提升到 510，primary 覆盖率提升到 46.36%，高价值 primary 覆盖率提升到 47.27%

## 2.23.54

- 补充关系图实体构建器单测，覆盖 shared helper、风险、规避手段、攻击工具、威胁行为者和术语关系构建，包含子实体、相关实体、缺失关联跳过、实体反查术语和跨实体连线
- 将 Vitest coverage 阈值从 58% 提升到 61%；当前测试规模为 40 个测试文件、226 个测试，coverage 为 statements 77.02%、branches 61.69%、functions 75.98%、lines 79.76%
- 更新升级规划中 P0-3 自动化回归状态，明确关系实体 builder 已覆盖，下一阶段继续收紧组件、视图模型和 Lighthouse 门禁

## 2.23.53

- 继续补强账号矩阵治理、停车优惠滥用和低俗直播治理案例 primary source，为 `C0049`、`C0128`、`C0237` 追加抖音官方治理规则、最高检案例通报和网信北京处罚通报，并同步英文引用标题
- 扩充案例来源质量审计的 primary 识别，纳入抖音 `amemv.com` 官方页面，并以精确 URL 白名单识别网信北京官方微信

## 2.23.52

- 补充 `useRelationGraphData` 轻量 helper 单测，覆盖节点创建复用、标题/类型映射、关系图例、字段 tooltip 转义、标签换行、可见图刷新调度和选中路径判断
- 将 Vitest coverage 阈值从 57% 提升到 58%；当前测试规模为 39 个测试文件、220 个测试，coverage 为 statements 71.80%、branches 58.76%、functions 66.84%、lines 74.23%

## 2.23.51

- 补充 `relationNodeClipboard` 单测，覆盖上下文关系 CSV 输出、字段转义、解释/证据/质量标记写入、缺失节点失败和 clipboard 写入失败
- 将 Vitest coverage 阈值从 56% 提升到 57%；当前测试规模为 38 个测试文件、216 个测试，coverage 为 statements 69.27%、branches 57.85%、functions 64.18%、lines 71.70%

## 2.23.50

- 补充 `relationNodeContextMenu` 单测，覆盖菜单定位夹取、全局 pointerdown 关闭、隐藏状态保护、节点类型菜单禁用策略和当前根节点不可重复作为根打开
- 将 Vitest coverage 阈值从 55% 提升到 56%；当前测试规模为 37 个测试文件、213 个测试，coverage 为 statements 68.43%、branches 56.94%、functions 63.23%、lines 70.85%

## 2.23.49

- 继续补强高价值账号安全、数据泄露、AIGC 合规和 AI 版权案例 primary source，为 `C0355`、`C0358`、`C0360`、`C0361`、`C0363`、`C0367`、`C0387`、`C0407`、`C0710`、`C0711`、`C0713`、`C0714`、`C0715`、`C0718` 追加法院、检察院、公安、网信、Uber/Cisco 官方、法院诉讼文件和越南公安部等官方或原始来源，并同步英文引用标题
- 扩充案例来源质量审计的 primary 识别，纳入雨花台区法院、五华公安、CourtListener、越南公安部等官方或原始域名，并以精确 URL 白名单识别公安部网安局官方微信
- 案例 primary 覆盖提升到 822，高价值 primary 覆盖提升到 499，primary 覆盖率提升到 45.74%，高价值 primary 覆盖率提升到 46.25%

## 2.23.48

- 补充 `useRelationNodeActions` 单测，覆盖右键菜单、触屏操作、节点准备、关系/详情跳转、详情抽屉、筛选切换、复制成功/失败反馈和抽屉反馈清理
- 将 Vitest coverage 阈值从 54% 提升到 55%；当前测试规模为 36 个测试文件、209 个测试，coverage 为 statements 66.14%、branches 56.25%、functions 62.59%、lines 68.41%

## 2.23.47

- 补充 `relationViewEffects` 单测，覆盖非法关系路由重定向、首次挂载初始化、路由/语言/视图/主题变化刷新、选中节点同步和卸载清理
- 将 Vitest coverage 阈值从 52% 提升到 54%；当前测试规模为 35 个测试文件、204 个测试，coverage 为 statements 63.06%、branches 54.54%、functions 59.82%、lines 65.22%

## 2.23.46

- 补充 `useRelationViewModel` 和 `relationViewAssembly` 单测，覆盖关系页组合入口、颜色解析、装配依赖、控制器桥接、Sankey 节点交互和关系详情状态
- 将 Vitest coverage 阈值从 50% 提升到 52%；当前测试规模为 34 个测试文件、200 个测试，coverage 为 statements 60.42%、branches 53.04%、functions 57.59%、lines 62.44%
- 将复杂关系图谱稳定性测试提升为 PR CI 独立 hard-fail job，并为 `relation-stability` 增加 CI 强制运行开关；major/minor 门控回归继续保留 performance、视觉复核和 Lighthouse

## 2.23.45

- 补充 `relationSankeyChartController` 单测，覆盖 Sankey 图 ECharts 懒加载渲染、节点详情、右键操作、移动端长按、主题刷新、tooltip 隐藏、resize 和 dispose 清理
- 将 Vitest coverage 阈值从 48% 提升到 50%；当前测试规模为 32 个测试文件、196 个测试，coverage 为 statements 58.42%、branches 52.61%、functions 55.89%、lines 60.29%

## 2.23.44

- 补充 `relationNetworkChartController` 单测，覆盖网络图 ECharts 懒加载渲染、节点选择、详情打开、右键操作、拖拽位置持久化、移动端长按、下载、全屏切换和 dispose 清理
- 将 Vitest coverage 阈值从 45% 提升到 48%；当前测试规模为 31 个测试文件、192 个测试，coverage 为 statements 55.38%、branches 49.83%、functions 53.98%、lines 56.97%

## 2.23.43

- 继续批量补强高价值司法、行政处罚和公安网安案例 primary source，为 `C0214`、`C0222`、`C0229`、`C0233`、`C0238`、`C0247`、`C0271`、`C0288`、`C0320`、`C0331`、`C0359` 追加宁波公安、北京互联网法院、最高法知识产权法庭、上海检察、成都公安、国新办、静安检察、公安部和中国警察网等官方或准官方来源，并同步英文引用标题
- 扩充案例来源质量审计的 primary 精确链接识别，纳入宁波公安、成都公安官方微信、北京互联网法院供稿、汾阳市场监管政务通报、上城区法院案件通报，并将中国警察网主站纳入窄口径公安系统来源识别
- 案例 primary 覆盖提升到 808，高价值 primary 覆盖提升到 488，primary 覆盖率提升到 44.96%，高价值 primary 覆盖率提升到 45.23%

## 2.23.42

- 补充关系页节点路由和 view model 桥接层单测，覆盖实体详情跳转、详情锚点、新窗口打开、网络图渲染桥和交互桥替换
- 关系页测试增至 30 个测试文件、188 个测试，coverage 提升到 statements 50.44%、branches 46.20%、functions 51.00%、lines 51.62%

## 2.23.41

- 继续补强行政处罚和公安网安案例 primary source，为 `C0228`、`C0262`、`C0283` 追加北京市市场监管局、钦州网警、公安部网安局等官方来源，并同步英文引用标题
- 扩充案例来源质量审计的 primary 精确链接识别，纳入钦州网警和公安部网安局官方微信来源
- 案例 primary 覆盖提升到 797，高价值 primary 覆盖提升到 477，primary 覆盖率提升到 44.35%，高价值 primary 覆盖率提升到 44.21%

## 2.23.39

- 补充 `relationViewState` 状态单测，覆盖关系页视图模式、Sankey 响应式尺寸、节点选择、网络缩放和布局切换，并将 Vitest coverage 阈值从 40% 提升到 45%

## 2.23.38

- 收紧自动化回归门禁：PR CI 新增无条件 `browser-smoke` hard-fail job，major/minor 版本门控回归保留 performance、视觉复核、关系稳定性并补入 Lighthouse，README 与升级计划同步更新当前状态
- 继续补强国内执法、司法和平台治理案例 primary source，为 `C0044`、`C0113`、`C0157`、`C0178`、`C0212`、`C0215`、`C0225` 追加抖音黑板报、贵州公安、宁波公安、内蒙古公安、众安保险和上海高院等官方或涉案主体原始来源，并同步英文引用标题
- 扩充案例来源质量审计的 primary 识别，纳入贵州公安、宁波公安、内蒙古公安官方域，并用精确 URL 白名单识别抖音黑板报、众安保险和上海高院官方微信原文
- 高价值案例 primary 覆盖提升到 474，primary 覆盖率提升到 44.18%，高价值 primary 覆盖率提升到 43.93%

## 2.23.37

- 扩展浏览器视觉巡检覆盖，新增三档视口、全局搜索、导航菜单、主题/语言切换、知识库搜索与空状态、分类筛选、异常路由回退、关系实体切换、关系图 hover/拖动/筛选/详情、Sankey hover、Analysis 过滤器和移动端交互截图，并修复非法关系路由重定向前的运行时错误
- 并行补强下一批高价值案例 primary source，为 `C0084`、`C0213`、`C0219`、`C0220`、`C0221`、`C0226`、`C0230`、`C0234`、`C0246`、`C0253`、`C0255`、`C0259`、`C0263`、`C0269`、`C0270`、`C0289`、`C1272`、`C1299`、`C1475`、`C1661` 补充或识别政府门户、政法网、海关、最高检、公安部、工信部、作者原始披露、原始研究、平台官方治理公示和安全研究人员原始披露来源，并同步英文引用标题
- 扩充案例来源质量审计的 primary 识别，纳入北京政法网、威胁猎人、研究者个人论文站点，并以精确 URL 白名单识别 X/Medium/先知作者原始披露、徐汇官方托管页和抖音黑板报政府转载页
- 高价值案例 primary 覆盖提升到 467，primary 覆盖率提升到 43.80%，高价值 primary 覆盖率提升到 43.28%

## 2.23.36

- 继续补强国内司法、执法与行政监管案例 primary source，为 `C0153`、`C0216`、`C0433`、`C0430`、`C0206`、`C0264`、`C0025`、`C0235`、`C0760`、`C0260` 追加广东政法、广西税务、最高检、公安部、广州政法、成都公安、四川长安网及政务微信等官方来源，并同步英文引用标题
- 扩充案例来源质量审计的 primary 识别，纳入广东/广州/四川政法、成都公安、税务系统官方域和快手处罚、网信上海等政务微信精确链接
- 高价值案例 primary 覆盖提升到 447，primary 覆盖率提升到 42.68%，高价值 primary 覆盖率提升到 41.43%

## 2.23.35

- 继续批量补强高价值安全事件与漏洞案例 primary source，为 `C0417`、`C0708`、`C0716`、`C1210`、`C1270`、`C1332`、`C1354`、`C1359`、`C1364`、`C1369`、`C1396`、`C1423`、`C1656`、`C1658`、`C1758`、`C1767` 追加或识别 Sekoia、Cisco、Oligo、Twitter/X 官方、Push Security、Microsoft、PeckShield、Venus Protocol、Thetanuts Finance、Multichain、Akamai、Horizen、CloudSEK、Appknox、Cisco Talos、Youstin 等官方、厂商研究、原始论文或精确社媒公告来源，并同步英文引用标题
- 严格跳过 Reddit 个体陈述等不稳定来源，并将 `C1423` 的事件时间修正为官方资料对应的 2018-06
- 扩充案例来源质量审计的 primary 识别，纳入 Sekoia、Cisco/Talos、Oligo、Push Security、Akamai、Horizen、CloudSEK、Youstin、PeckShield Medium 原始分析和若干官方 X 精确链接
- 高价值案例 primary 覆盖提升到 436，primary 覆盖率提升到 42.07%，高价值 primary 覆盖率提升到 40.41%
- 收紧浏览器回归链路：新增次版本以上升级门控、视觉人工复核截图报告和关键交互巡检，本地 pre-commit 与 PR CI 仅在 major/minor 版本变化时运行慢速回归并阻断失败，deploy 阶段不再重复运行 Playwright/Lighthouse
- 精简 deploy 构建链路：新增 `deploy:build` 只生成发布所需的静态站点、STIX/JSON-LD 和数据包产物，不再重复执行 PR CI 已覆盖的 lint、类型检查、数据校验、单元测试和覆盖率

## 2.23.34

- 继续集中补强链上、僵尸网络和企业攻击案例 primary source，为 `C1361`、`C1374`、`C1376`、`C1390`、`C1394`、`C1413`、`C1422`、`C1424`、`C1426`、`C1436`、`C1455`、`C1522`、`C1525`、`C1540`、`C1543` 追加或识别 xToken、PeckShield、BitFloor、USENIX、CertiK、Qubic、Bitcoin Gold、Messari、Manta Network、Aztec Labs、SlowMist、Scam Sniffer、Microsoft、Balancer 等官方、原始研究或链上分析来源，并同步英文引用标题
- 严格核对来源与案例事实口径，未采纳只能部分支撑细节的 Terra Google Ads 钓鱼来源，并修正 BitFloor、Balancer、UXLINK、Hyperliquid、Aztec Connect 等案例的事件时间元数据
- 扩充案例来源质量审计的 primary 识别，纳入 Qubic、Bitcoin Gold、Messari、CERT/CC、GitHub Gist 原始研究和若干官方 X / Medium / forum 精确链接
- 高价值案例 primary 覆盖提升到 420，primary 覆盖率提升到 41.18%，高价值 primary 覆盖率提升到 38.92%

## 2.23.33

- 继续补强安全事件、平台与链上案例 primary source，为 `C0786`、`C0842`、`C1293`、`C1330`、`C1433`、`C1439`、`C1441`、`C1631` 追加或识别 Cloudsmith、Okta、Koi Security、Cybereason、Solana、Binance、CertiK 等官方或原始研究来源，并同步英文引用标题
- 扩充案例来源质量审计的 primary 识别，纳入 Solana、Binance、Okta、Cybereason、Cloudsmith 等官方或原始研究来源
- 高价值案例 primary 覆盖提升到 408，primary 覆盖率提升到 40.51%，高价值 primary 覆盖率提升到 37.81%

## 2.23.32

- 集中补强下一批安全事件、漏洞与链上案例 primary source，为 `C0807`、`C0872`、`C1018`、`C1019`、`C1135`、`C1183`、`C1184`、`C1294`、`C1316`、`C1334`、`C1357`、`C1463`、`C1470`、`C1539`、`C1541`、`C1551`、`C1696`、`C1757` 追加或识别 Socket、c/side、Volex、Fujitsu、BlockSec、StepSecurity、Wiz、Invariant Labs、Blackpanda、Microsoft、SolidityScan、Forescout、NHTSA、Chainalysis、SlowMist、Uber 等官方或原始研究来源，并同步英文引用标题
- 扩充案例来源质量审计的 primary 识别，纳入 Volex、Fujitsu、NHTSA、Forescout、c/side、Bitdefender、BlockSec、SolidityScan、Socket、Wiz、Blackpanda、Chainalysis、CertiK、SlowMist、PeckShield，并对白名单方式识别 SlowMist Medium 原始链上分析
- 高价值案例 primary 覆盖提升到 400，primary 覆盖率提升到 40.07%，高价值 primary 覆盖率提升到 37.07%

## 2.23.31

- 继续集中补强国外安全事件与链上事件 primary source，为 `C1358`、`C1360`、`C1363`、`C1365`、`C1507`、`C1518`、`C1553`、`C1679`、`C1680`、`C1686` 补充或识别 Halborn、PeckShield、Kudelski Security、Unit 42、Lightning AI、Elliptic、Endor Labs、StepSecurity 等原始研究、官方说明或链上分析来源，并同步英文引用标题
- 扩充案例来源质量审计的 primary 识别，纳入 Lightning AI、Elliptic、StepSecurity、Kudelski Security、Halborn，并对白名单方式识别 PeckShield Medium 原始链上分析
- 高价值案例 primary 覆盖提升到 381，primary 覆盖率提升到 38.79%，高价值 primary 覆盖率提升到 35.31%

## 2.23.30

- 集中合并国外官方与原始研究补源结果，为 `C1269`、`C1298`、`C1300`、`C1366`、`C1454`、`C1473`、`C1484`、`C1519`、`C1675`、`C1676` 追加 HackerOne、Truffle Security、Unit 42、FBI、Parity、Eclypsium、Koi Security、LiteLLM 官方、GitHub Advisory 等 primary source，并同步英文引用标题
- 扩充案例来源质量审计的 primary 识别，纳入 Unit 42、Eclypsium、Truffle Security、LiteLLM 官方文档，并对白名单方式识别 Parity 官方 Medium 事后分析
- 高价值案例 primary 覆盖提升到 371，primary 覆盖率提升到 38.23%，高价值 primary 覆盖率提升到 34.38%

## 2.23.29

- 一次性复核并补充高价值安全事件 primary source，为 `C0294`、`C0782`、`C0795`、`C0803`、`C0806`、`C0811`、`C0812` 追加 Osmosis 官方社区、NSFOCUS、Notepad++ 官方公告、Endor Labs、Sonatype、Checkmarx、CERT-EU 等官方或原始研究来源，并同步英文引用标题
- 扩充案例来源质量审计的 primary 识别，纳入 CERT-EU、Sonatype、Endor Labs、NSFOCUS、Notepad++ 官方域，并对白名单方式识别 Osmosis 官方社区 Medium 原文
- 高价值案例 primary 覆盖提升到 361，primary 覆盖率提升到 37.67%，高价值 primary 覆盖率提升到 33.46%

## 2.23.28

- 并行复核缺 primary 的安全事件、漏洞公告和司法执法案例，为 `C0203`、`C0284`、`C0307`、`C0792`、`C0822`、`C0892`、`C1173`、`C1271`、`C1302`、`C1303`、`C1381`、`C1506`、`C1520`、`C1789` 补充最高检、FTC、Europol、AT&T、Fortinet、Checkmarx、FDA、NVD 等官方或原始来源，并同步英文引用标题
- 扩充案例来源质量审计的 primary 识别，纳入 `.gov.au`、IC3、AT&T、Sam Curry、Fortinet、Checkmarx、Securelist、Koi Security 等官方或原始研究来源
- 高价值案例 primary 覆盖提升到 354，primary 覆盖率提升到 37.28%，高价值 primary 覆盖率提升到 32.81%

## 2.23.27

- 并行复核下一批高价值缺 primary 案例，为 `C0119`、`C0142`、`C0155`、`C0169`、`C0351`、`C0409`、`C0783`、`C0794`、`C0809`、`C0864`、`C1188`、`C1228`、`C1234`、`C1301`、`C1467`、`C1591`、`C1635` 补充公安、法院、政法、监管、NVD、厂商公告和原始安全研究来源，并同步英文引用标题
- 扩充案例来源质量审计的 primary 域名识别，纳入江西政法网、Uber、Truffle Security、Proofpoint、Palo Alto Networks、Invariant Labs 等官方或原始研究来源
- 高价值案例 primary 覆盖提升到 340，primary 覆盖率提升到 36.51%，高价值 primary 覆盖率提升到 31.51%

## 2.23.26

- 为 `C0060`、`C0064`、`C0110`、`C0143`、`C0158`、`C0186`、`C0305`、`C0337`、`C0804`、`C1161`、`C1162`、`C1187`、`C1229`、`C1419`、`C1689`、`C1698` 补充市场监管、公安、法院、平台、执法机构、监管机构、漏洞库和厂商原始来源，并同步英文引用标题
- 修正 `C0110` 的办案地口径，由媒体摘要中的重庆更正为安庆公安官方来源确认的安庆经开公安
- 案例来源质量审计新增精确 URL 白名单，只识别已核验的官方账号/官方站点指向页面，不泛化整站或整个平台
- 高价值案例 primary 覆盖提升到 323，primary 覆盖率提升到 35.45%

## 2.23.25

- 并行复核下一批高价值缺 primary 案例，为 `C0072`、`C0156` 补充中国长安网和长沙长安网准官方来源，并同步英文引用标题
- 复核 `C0044`、`C0119`、`C0120`、`C0153`、`C0211`、`C0212`、`C0213` 等候选时，未找到能完整覆盖同案事实的稳定官方原文不硬补
- 高价值案例 primary 覆盖提升到 306，primary 覆盖率提升到 34.50%

## 2.23.24

- 并行复核高价值缺 primary 案例，为 `C0045`、`C0051`、`C0160`、`C0165`、`C0180`、`C0202`、`C0208`、`C0210` 补充公安、检察、平台和公安系统媒体来源，并同步英文引用标题
- 将公安部网安局官方微信、中国警察网答安栏目和人民公安报电子版纳入窄口径 primary source 识别，用于覆盖可核验的官方/准官方案例页面
- 高价值案例 primary 覆盖提升到 304，primary 覆盖率提升到 34.39%

## 2.23.23

- 并行复核高价值缺 primary 案例，为 `C0073`、`C0134`、`C0135`、`C0140`、`C0141`、`C0154`、`C0159`、`C0167`、`C0183` 补充检察、法院、厂商官方和游戏平台 primary source，并同步英文引用标题
- 将 SEGA、Square Enix 与《燕云十六声》游戏官网纳入案例 primary source 识别，覆盖游戏内不正课金和游戏外挂治理原始来源
- 高价值案例 primary 覆盖提升到 297，primary 覆盖率提升到 34.00%

## 2.23.22

- 并行复核高价值缺 primary 案例，为 `C0009`、`C0010`、`C0033`、`C0057`、`C0062`、`C0065`、`C0066`、`C0071`、`C0078`、`C0089`、`C0095` 批量补充法院、检察、网信、政法、政府和平台治理相关 primary source
- 将陕西省网络举报中心 `shaanxijubao.cn` 纳入案例 primary source 识别，覆盖公安部网安局转载的网络安全宣传案例
- 高价值案例 primary 覆盖提升到 288，primary 覆盖率提升到 33.50%

## 2.23.21

- 为 `C0111` 补充河南省高级人民法院“刷单炒信”典型司法案例来源，并同步英文引用标题
- 复核 `C0009`、`C0024`、`C0034` 等高价值候选时，未找到同案官方来源的不硬补
- 高价值案例 primary 覆盖提升到 276，primary 覆盖率提升到 32.83%

## 2.23.20

- 为 `C0038` 补充山东法院网“空包”快递单号犯罪工具来源，保留腾讯新闻用于覆盖亿元交易量等扩展事实
- 为 `C0059` 补充中国法院网虚假退货诈骗案来源，并同步英文引用标题
- 高价值案例 primary 覆盖提升到 275，primary 覆盖率提升到 32.78%

## 2.23.19

- 为 `C0079` 补充工信部 APP 信息窗口跳转治理官方来源，为 `C0139` 补充公安部天津游戏账号诈骗团伙来源
- 为 `C0145` 补充 Flare 账户与会话接管经济报告原始来源，并将 `flare.io` 纳入案例 primary source 识别
- 高价值案例 primary 覆盖提升到 273，primary 覆盖率提升到 32.67%

## 2.23.18

- 为 `C0200`、`C0205`、`C0207`、`C0236` 补充中央网信办/CAC 官方来源，并同步英文引用标题
- 为 `C0067` 补充深圳市互联网信息办公室“清朗”典型处置案例通报来源
- 高价值案例 primary 覆盖提升到 271，primary 覆盖率提升到 32.50%

## 2.23.17

- 为 `C0164` 补充腾讯游戏安全中心《三角洲行动》外挂案官方来源，并同步英文引用标题
- 为 `C0166` 补充《和平精英》官网转载央视法治在线的全球最大外挂组织覆灭记来源，为 `C0168` 补充江西政法网全国首例 AI 外挂案法院宣判来源
- 高价值案例 primary 覆盖提升到 266，unknown only 降到 361

## 2.23.16

- 为 `C0114` 补充市场监管总局 2026 年一季度新闻发布会实录，覆盖 3·15 晚会曝光问题处置的监管 primary source
- 为 `C0123`、`C0131` 补充上海市人民检察院“利用退款时间差薅羊毛”同案来源，为 `C0129` 补充上海奉贤检察院虚假退货诈骗案来源，并同步英文引用标题
- 高价值案例 primary 覆盖提升到 263，primary 覆盖率超过 32%

## 2.23.15

- 为 `C0026`、`C0056`、`C0063` 补充杭州公安、上海奉贤检察院、市场监管总局等同案 primary source，并同步英文引用标题
- 复核 `C0057`、`C0073`、`C0079`、`C0111` 等相近条目时，未确认同案官方来源的不补入，继续保留在后续复核队列
- 高价值案例 primary 覆盖提升到 259，覆盖率达到 24.00%

## 2.23.14

- 为 `C0013`、`C0031`、`C0032`、`C0036`、`C0041`、`C0047`、`C0077`、`C0081`、`C0086`、`C0096` 补充公安部、最高法、中国法院网、市场监管总局等 primary source，并同步英文引用标题
- 为 `C0023` 补充环球网稳定媒体来源；复核 `C0045`、`C0111` 等相近案例时，未确认同案 primary 的不硬补
- 案例来源质量分类新增 `chinacourt.cn` primary 识别，并将 FreeBuf、安全客、先知、Secrss、腾讯云开发者社区等安全分析站点归入 secondary；高价值 primary 覆盖提升到 256，unknown only 降到 363

## 2.23.13

- 为 `C0201` 补充中国法院网转载的公安部网络水军典型案例来源，并同步英文引用标题
- 扩充案例来源质量分类规则，将环球网、光明网、解放日报、南方网、羊城晚报、法治日报、中国新闻网、中国食品安全网、财新等稳定媒体归入 secondary
- 将 Microsoft、腾讯游戏安全/公告、京东规则、Kaspersky、HackerOne、奇安信、Forcepoint 等厂商或平台原始来源归入 primary；高价值 primary 覆盖提升到 246，unknown only 降到 444

## 2.23.12

- 扩充案例来源质量分类规则，将新华社、央广网、中国日报、人民网客户端等稳定媒体来源归入 secondary，减少 unknown 来源噪声
- 为 `C0024`、`C0025` 补充央广网、新华网稳定报道来源，并同步英文引用标题
- 案例 unknown only 从 540 降到 527；高价值司法案例未找到同案法院/检察院/公安 primary 时保留待复核，不用相似案例硬补

## 2.23.11

- 扩充案例来源质量分类规则，将 OWASP、Cloudflare、GEETEST、AWS 中国、AppsFlyer、Fraudlogix、AdGuard、Chrome Web Store、PeerJ 等英文原始/学术/厂商来源纳入 primary 识别
- 为 `C0039`、`C0043`、`C0046` 补充检察院或法院来源，并同步英文引用标题
- 案例 primary 覆盖从 507 提升到 512，unknown only 从 545 降到 540；高价值 primary 覆盖保持 210，后续继续补法院、检察院、公安、监管等来源

## 2.23.10

- 复核 `mps.gov.cn` 521 引用，确认浏览器复核仍为 521 后，优先替换为新华社、中国政府网、央视网、中国警察网、使领馆、光明网、解放日报等可访问来源
- 将 `mps.gov.cn` 问题链接从 23 条收敛到 7 条，剩余案例因未找到高置信替代源继续保留在 P1 复核队列
- 同步更新受影响案例、风险、攻击工具、威胁行为者和术语的英文引用标题，保持中英文展示一致

## 2.23.9

- 浏览器复核工具新增 `--ignore-https-errors`，并记录复核报告是否忽略 HTTPS 证书错误
- 对 `justice.gov`、`moj.gov.cn` connection_error 进行 Chromium 复核，确认 7 条链接在浏览器忽略证书错误后均可访问
- 引用健康策略新增 `browser_review_preserve`，将官方/学术域名连接错误优先归入浏览器复核保留流程，而不是直接替换来源
- 域名治理计划同步生成浏览器复核命令，支持 connection_error 场景的可重复验证

## 2.23.8

- 修正 `references-health` 筛选复测报告统计，保留筛选范围内恢复为 ok 的链接，避免复测摘要只显示剩余问题项
- 对 P1 官方域名批量长超时复测，确认 `chinacourt.org`、`microsoft.com` 等大量 timeout 可恢复，剩余问题集中在 `mps.gov.cn`、`justice.gov`、`moj.gov.cn`
- 将 521 源站错误纳入官方/学术域名保留复核策略，并让域名治理计划对 manual review 类策略附带浏览器复核命令

## 2.23.7

- 将旧的一次性 403 检查脚本升级为通用浏览器复核工具，可读取 `reference-health-filtered.json` 并输出浏览器可访问性报告
- 对 `cisa.gov` 进行长超时复测和 Chromium 复核，确认脚本 403 多数为浏览器可访问的反爬/权限站表现
- 修复 CISA IoT 旧引用 404，将 AT0082、TA0048 的 CISA IoT 参考链接替换为当前可访问页面

## 2.23.6

- 新增 `audit:reference-domain-plan`，基于引用健康 `domainGroups` 生成域名治理计划，输出 P1/P2 批次、影响链接数、引用数和建议执行命令
- `references-health` 支持按 `--domains`、`--priority`、`--action`、`--limit` 筛选复测范围，筛选结果写入独立 `reference-health-filtered.*`，避免覆盖全量基线报告
- 引用治理计划将 `retry_with_long_timeout_preserve`、`manual_review_preserve`、`replace_or_add_primary` 等策略转成可执行命令，便于后续分批复测和补源

## 2.23.5

- 引用健康审计新增域名级复核分组，按 issue、HTTP 状态、实体类型和引用数量汇总待处理域名
- 为引用健康报告补充自动策略分类，区分 `manual_review_preserve`、`retry_with_long_timeout_preserve`、`replace_or_add_primary` 等处理动作
- 新增 `audit:references-health:cached`，可基于已有 `reference-health.json` 快速重建域名分组和 Markdown 报告，避免本地频繁触发网络复测
- 质量报告的 `sourceReports.referenceHealth` 同步暴露 `domainGroups`，npm 数据包类型定义同步新增域名策略结构

## 2.23.4

- 扩展 `audit:quality-report`，将引用健康和案例来源质量纳入统一质量报告，输出来源报告摘要、域名分组和 Top 待复核项
- `quality-report.json` 新增 `sourceReports`、`referenceHealthIssues`、`caseSourceIssues` 和 `embeddedIssueLimit`，并同步 public、dist、manifest 与 npm 数据包校验
- 更新 npm 数据包类型定义，补充质量报告新增字段，方便外部消费者读取治理信号
- 调整质量报告控制台摘要和导出校验，确保新增治理维度进入构建链保护

## 2.23.3

- 修复案例懒加载和语言切换后全文搜索 case 索引不可靠刷新的问题，cases 更新改为替换 ref 值以触发下游浅监听
- `useCases` 的 locale watcher 改为模块级单次注册，避免多个组件同时使用案例数据时重复监听和重复合并
- 补充 `useSearch` 与 `useCases` 回归测试，覆盖案例加载后重建索引、替换后清理旧索引和 watcher 单次注册
- 更新升级计划，移除已完成的 P1-1 响应式刷新清理项

## 2.23.2

- 新增 `RelationEntityType` 强类型别名和实体类型常量，收紧关系页 `Node.type`、`GraphNode.type`、Sankey 节点和分析摘要的类型边界
- 关系图构建、布局、攻击路径、覆盖分析和业务场景影响模块改用实体类型别名，减少 `as RelationType` 和冗余实体类型守卫
- 更新关系页相关单测类型签名，覆盖强类型节点在攻击路径、覆盖分析、业务场景影响和边 fixture 中的使用

## 2.23.1

- 拆分关系页关系解释规则到独立配置模块，统一维护关系线的解释、语义说明、影响提示、证据等级、来源字段和排序优先级
- 关系解释主流程改为规则表驱动，保留端点类型相关的来源字段特判，降低新增关系类型时的重复分支维护成本
- 补充关系解释规则单测，覆盖 coverage 派生、证据等级、直接关系判断和排序优先级

## 2.23.0

- 新增 STIX 2.1 标准化导出，支持将全部 7 类实体（Risk/Avoidance/AttackTool/ThreatActor/Term/Case/BusinessScene）及 26,000+ 关系边映射为合法 STIX 2.1 Bundle
- 新增 JSON-LD 语义网导出，面向知识图谱和 RDF/SPARQL 消费场景
- 中英文双 Bundle 导出，STIX UUID 确定性生成（UUID v5），中英文共享相同 ID
- 新增实体级 `version` 字段（可选整数），支持追踪实体变更版本
- 新增 `auto-version.mjs` 脚本，自动检测实体文件变更并递增 version
- 新增三层 STIX 校验（结构校验 + 引用完整性 + BREAK 业务规则），含 JSON-LD 校验
- 新增 `STIX_MAPPING.md` 映射规范文档
- npm 数据包 `@jdarmy/break-data` 包含 STIX/JSON-LD 产物
- build 链集成 `export:stix`、`export:jsonld`、`validate:stix` 步骤
- 新增 npm scripts：`export:stix`、`export:jsonld`、`validate:stix`、`version:bump`

## 2.22.12

- 拆分关系页攻击路径构建与索引逻辑到独立 builder 模块，进一步收窄 `relationAttackPath` 职责
- 优化攻击路径规避手段交集计算，避免重复过滤相同候选集合
- 补充 builder 模块单测，覆盖攻击工具、风险、规避手段和术语根节点路径构建

## 2.22.11

- 拆分关系页攻击路径防御覆盖汇总到独立模块，降低 `relationAttackPath` 职责复杂度
- 拆分攻击路径解释与分组逻辑到独立模块，保留主文件路径构建和装配职责
- 补充覆盖汇总与路径解释模块单测，固定来源分类、证据字段和缺失规避质量标记

## 2.22.10

- 拆分关系页攻击路径 Sankey 构建逻辑到独立模块，降低 `relationAttackPath` 职责复杂度
- 补充 Sankey 模块单测，覆盖节点聚合、重复链接计数和移动端高度计算
- ESLint 忽略本地 `.claude` 工作区，避免本地辅助 worktree 污染主项目 lint

## 2.22.9

- 统一知识库相关实体链接跳转到列表详情路由，避免进入列表页 hash 定位
- 修复抽屉详情中的 ID 链接和"查看详情"按钮仍跳转 hash 列表页的问题
- 更新相关实体链接单测，覆盖详情路由跳转行为

## 2.22.8

- 拆分关系页攻击路径筛选逻辑到独立模块，降低 `relationAttackPath` 的职责复杂度
- 攻击路径筛选归一化改为逐维度保留仍有效的筛选条件，避免无效筛选连带清空有效筛选
- 补充攻击路径筛选模块单测，覆盖匹配、选项计数和失效筛选清理

## 2.22.7

- 抽出 `useIncrementalVisibleList`，统一关系页"点击显示更多/收起"的增量展示逻辑
- 让分析解读、攻击路径、防御覆盖、关系明细和关联实体复用同一套显示更多行为
- 补充增量展示 composable 单测，覆盖初始展示、每次增量、收起和数据源变化重置

## 2.22.6

- 统一"点击显示更多"列表行为，每次最多增量展示 50 条，避免大列表一次性展开过多内容
- 移动端分析解读 pane 中规避覆盖默认显示前 6 条、全部路径默认显示前 8 条
- 优化"点击显示更多"相关中英文文案，隐藏内部批量加载数量细节

## 2.22.5

- 关系网络抽屉节点详情新增"关联实体"区块，展示与当前节点相连的同类型横向关联实体
- 关联实体区块支持定位节点、作为根节点打开和查看详情，便于从抽屉继续分析同类实体关系
- 补充关系洞察单测，覆盖关联实体摘要生成

## 2.22.4

- 关系网络节点筛选新增"关联实体"开关，可独立控制风险/规避手段/攻击工具/威胁行为者的同类横向关联节点
- 横向关联节点增加 `isRelatedEntity` 标记，筛选关闭时隐藏对应节点及其关系边，但保留根节点和其他同类型实体
- 补充关系网络布局单测，覆盖关联实体筛选行为

## 2.22.3

- 增强 link-check workflow，改用引用健康报告并上传 JSON/Markdown artifact
- 链接健康失败时按固定标题创建或更新同一个 Issue，避免重复刷屏，并在恢复后自动关闭
- 更新升级计划，移除已完成的 link-check Issue 去重与明细输出事项

## 2.22.2

- 优化 PR CI workflow，将静态校验、单元测试、数据导出校验、构建和浏览器回归拆为并行 job
- Deploy workflow 改为复用 `npm run build`，减少部署链路与本地构建脚本的重复命令维护
- 更新升级计划，保留 CI workflow 优化中仍未完成的可复用 workflow 和 link-check 联动事项

## 2.22.1

- 更新 README 和 README_CN，补充 BREAK Skill 的位置、直接使用方式、打包方式和英文静态数据说明
- 从未完成升级计划中移除已完成的 i18n-sync 字段级校验与英文结构字段清理项，重新整理 P1 待办顺序
- 在 CI 和 Deploy workflow 中补充 `export:data-en`，确保英文静态数据包随校验链路生成
- 调整 `.gitignore`，忽略本地 `.agents/` 配置目录

## 2.22.0

- 新增 BREAK 知识库 Claude Code / Codex Skill，支持关键词搜索、ID 精确查询和问答咨询模式
- 新增 `SKILL.md`（中文）和 `SKILL_en.md`（英文）Skill 定义文件
- 新增 `scripts/skill/break_search.py` Python 搜索引擎，零外部依赖，支持中英文自动检测
- 新增 `scripts/skill/export_en_data.mjs` 英文数据预构建脚本，生成 `public/data/break-data-en.json`
- 新增 `scripts/skill/package_skill.sh` 一键打包脚本，输出可分发的 Skill 目录
- 构建链集成 `export:data-en`，确保每次构建同步生成英文数据包
- 抽出 `src/utils/mergeWithStructure.mjs`，让前端 i18n 与英文数据导出共用同一套结构合并规则
- 英文 i18n 质量脚本改为直接校验翻译层字段，避免复制合并逻辑造成规则漂移

## 2.21.28

- 增强 `i18n-sync --strict`，校验英文 i18n 不包含结构字段、关系字段、ID 数组、`updated` 和引用链接等结构数据
- 清理英文 i18n 中误写的结构字段，保留中文 `src/BREAK/` 作为唯一结构和关系数据源
- 将英文数据导出纳入 `npm run build`，确保英文合并产物随构建校验
- 更新 `DATA_SCHEMA.md` 和升级计划，明确英文翻译字段白名单与校验边界

## 2.21.27

- 新增 `ThreatActor.relatedThreatActors` 威胁行为者横向关系，按共同风险和共同攻击工具连接派生 top6
- 将威胁行为者横向关系纳入同步脚本、数据校验、关系覆盖审计、schema 文档和数据包类型导出
- 前端威胁行为者详情页、抽屉和关系图展示相关威胁行为者，并补齐中英文关系说明

## 2.21.26

- 修复风险、规避手段和攻击工具横向关系说明在英文界面仍显示中文的问题
- 新增关系说明运行时本地化格式化，派生数字说明按当前语言输出，风险语义说明按模板转为英文
- 为无法识别的个性化风险关系说明提供英文通用兜底，避免英文界面出现中文残留

## 2.21.25

- 将规避手段和攻击工具横向关系改为按共同连接数派生 top6，避免人工维护顺序和说明数字漂移
- 新增 `sync:lateral-relations` 脚本，统一生成 `relatedAvoidances` 与 `relatedAttackTools` 的关系和 note
- 强化关系校验：`validate:data` 校验横向关系列表是否为派生 top6，并校验 note 中的共同覆盖/共同关联数字

## 2.21.24

- 新增 `AttackTool.relatedAttackTools` 攻击工具横向关系模型，支持前置、组合使用、替代和能力升级四类语义
- 全量补齐 110 个攻击工具的相关攻击工具关系，覆盖率达到 100%，并纳入关系审计和 schema 文档
- 前端攻击工具详情页、抽屉详情页和关系图展示相关攻击工具，数据包类型同步暴露新字段

## 2.21.23

- 新增 `Avoidance.relatedAvoidances` 规避手段横向关系模型，支持前置、互补、替代、补短板四类语义
- 全量补齐 300 个规避手段的相关规避手段关系，覆盖率达到 100%，并纳入关系审计和 schema 文档
- 前端规避手段详情页、抽屉详情页和关系图展示相关规避手段，数据包类型同步暴露新字段

## 2.21.22

- 全量扩展 `Risk.relatedRisks` 覆盖：350 个风险均补充相关风险关系，每个风险最多 6 条
- 保留关系说明文本，优先保证知识关系完整性，不再为 bundle 预算裁剪事实关系
- 拆分 bundle 预算审计：应用 JS chunk 与 BREAK/i18n 数据 chunk 分别计入预算

## 2.21.21

- 将 Risk complexity 从中英文展示文案迁移为 `basic` / `intermediate` / `advanced` 结构 key，并通过 i18n 映射展示

## 2.21.20

- 补齐风险间关联模型：新增 `Risk.relatedRisks` 结构、关系类型校验和关系图展示
- 强化规避手段模型：强约束 Avoidance category 枚举，并新增 effectiveness 有效性分级
- 优化风险详情页展示：新增相关风险行内卡片，调整复杂度/影响信息块，并在规避手段详情展示有效性
- 更新数据 schema 文档和升级计划，移除已完成的知识模型结构短板项

## 2.21.19

- 修复 Deploy workflow 的浏览器审计变更检测：`github.event.before` 不存在时回退到 `HEAD^`，仍不可用则保守运行审计，避免 `fatal: bad object` 中断发布

## 2.21.18

- 补充 `EntityLinkSection` 单元测试中的 `ElTooltip` stub，消除 coverage 阶段的组件解析警告

## 2.21.17

- 保留质量治理在审计链路中执行：`audit:quality-report` 直接生成 `public/data/quality-report.json` 和 `research/search-reports/quality-report.json`
- 移除关系页“质量治理”前端视图，避免对外页面暴露内部数据维护入口
- 清理质量治理面板组件、前端加载逻辑和对应 i18n 文案

## 2.21.16

- 新增前端可消费质量报告导出：`export:data` 同步生成 `public/data/quality-report.json`，包含弱关系、缺覆盖、业务场景异常和 i18n 异常四类稳定结构
- 将质量报告纳入静态数据 manifest、GitHub Pages 导出校验和 npm 数据包评估产物
- 回写 `UPGRADE_PLAN.md` 的 A6 状态：质量报告 JSON 第一阶段已完成，后续作为审计报告和内部数据治理输入

## 2.21.15

- 知识库 PC 端侧栏支持拖拽调整宽度，拖到极值自动收起、从收起态拖出恢复，宽度通过 localStorage 持久化
- 补充 `KnowledgeSplitView` 侧栏拖拽、收起与持久化的单元测试

## 2.21.14

- 修复知识库分栏详情切换时保留上一条滚动位置的问题：切换选中项后自动回到详情顶部，并保留 `detailAnchor` 锚点跳转场景
- 补充 `KnowledgeSplitView` 滚动重置回归测试

## 2.21.13

- 新增案例来源质量审计脚本 `audit:case-source-quality`，按 `primary`、`secondary`、`mirror`、`weak`、`unknown` 派生来源等级，并输出高价值案例 primary 覆盖率、secondary-only、weak-source 和 unknown-only 待复核清单
- 回写 `UPGRADE_PLAN.md` 的 A4 状态：来源质量分级审计第一阶段已落地，单源率继续仅作为观察指标

## 2.21.12

- 知识库相关实体改为表格展示，统一显示 ID、标题和简介；相关案例改用懒加载案例数据渲染标题与摘要
- 优化相关实体表格交互：简介单行省略并提供主题一致的延迟 tooltip，修复 Vite dev server 端口静默漂移问题

## 2.21.11

- 清理剩余真实 broken 引用：替换案例、风险、规避手段、攻击工具和威胁行为者中的 14 条失效来源，并同步英文引用标题
- 引用健康审计复扫确认 broken 链接归零，保留反爬、超时和连接错误为后续待复核项

## 2.21.10

- 完成关系图可视化算法第一阶段：新增 BFS 路径发现、force 度数感知初始布局和实体语义化 tooltip，并取消点击连线时的重复详情面板

## 2.21.9

- 修复首批真实 404 引用：替换 AT0083、TA0049、AT0084、TA0050、R0211、R0217、R0218、A0006-005 中已下线或迁移的来源，并同步英文引用标题
- 优化引用可达性审计：将 412/521 等站点防护状态归为待复核，避免把反爬拦截误计为 broken
- 完成可视化算法第一阶段：新增关系图 BFS 路径发现、force 专用初始布局和实体语义化关系解释，并补充对应单测

## 2.21.8

- 案例多源化第二批治理：为 C0162、C0168、C0201、C0210、C0275 补充同案第二/第三来源，并同步英文 references 标题
- 内容质量审计中案例单源数由 1789 降至 1784

## 2.21.7

- 案例多源化首批治理：为 C0010、C0012、C0014、C0032、C0046、C0090、C0106、C0139 补充第二/第三来源，并同步英文 references 标题
- 内容质量审计中案例单源数由 1797 降至 1789，保留按高置信来源分批治理的节奏

## 2.21.6

- 治理风险内容质量断层：补强 R0081、R0193-R0255 的中文 description、keywords、influence，并同步英文翻译字段，消除风险实体中 definition 与 description 完全相同、单关键词和通用模板 influence 问题
- 补齐 R0160-R0192 英文风险关键词，避免英文检索侧仍存在单关键词条目
- 新增内容质量审计脚本 `audit:content-quality`，输出风险 def==desc、单关键词、模板 influence 和案例单源率指标到 `research/search-reports/content-quality.*`
- 新增引用 URL 可达性审计脚本 `audit:references-health`，批量检查引用链接状态并输出 `reference-health.*` 报告
- 修正 `fix:keywords` 兼容脚本行为，使其与 `audit:keywords` 等价，仅审计不写入
- 修订 `UPGRADE_PLAN.md`：基于 v2.21.5 现状校准升级计划，增加 Phase 0 前置校准和脚本规范修复

## 2.21.5

- 优化关系覆盖审计报告的待复核输出：无待复核项时显示通过状态，避免空清单造成误判；控制台同步输出 `待复核项: 0`

## 2.21.4

- 项目运行时基线提升到 Node 24：同步更新 package.json/package-lock.json 的 engines、GitHub Actions 的 setup-node 版本以及 .nvmrc，修复 vue-i18n 11.4.5 / @intlify 依赖要求 Node >=22 时在 Node 20.19.0 下 npm ci 出现 EBADENGINE 警告的问题

## 2.21.3

- 修复关系图/桑基图目标节点详情抽屉的节点详情块显示控制：抽屉显式显示"作为根节点打开"、与根节点关系、防御覆盖、攻击路径分析，分析解读右侧详情显式隐藏这些操作/块，避免可选 prop 透传导致入口行为不一致
- 修复防御覆盖按根节点而非目标节点计算的问题：`selectedNodeCoverageSummary` 改为依据当前选中节点 ID 和类型生成，非根节点在关系图/桑基图抽屉中也能显示自身覆盖分析，并新增回归测试
- 防御覆盖块增加无可计算覆盖时的空态文案，避免支持范围外节点的 block 静默消失

## 2.21.2

- 停止跟踪本地协作说明文件 AGENTS.md：从 Git 索引移除并加入 .gitignore，保留本地文件供代理工具读取，避免个人/环境相关协作规则进入仓库

## 2.21.1

- 修复首页业务场景风险列表的 i18n key not found 警告：HomeView 风险表格 aria-label 直接用 $t(`BREAK.risks.${rKey}.title`)，首页轻量数据入口首屏未注入全部 risks title，中英文环境批量报 "[intlify] Not found 'BREAK.risks.R0003.title'" 等警告（英文环境约 3904 条）；aria-label 改用既有 getRiskTitle，并将 getLocalizedText 英文分支改为先用 te 检查 key 是否存在、不存在则用中文兜底，彻底消除中英文环境的 not found 警告
- 移动端子风险显示切换按钮组填满整行：HomeView 的 subrisk-toggle（显示/隐藏所有子风险）在移动端虽有 width:100%+flex，但 el-radio-button 的 inner 未撑满 label，两个按钮收缩在左侧未填满整行；移动端给 el-radio-button 加 display:flex、inner 加 width:100%，使两个按钮平分整行宽度

## 2.21.0

- 抽取知识库详情页横向共享小件，消除 5 抽屉 + 6 View 的重复代码（约 2400 行涉及）：
  - 新增 EntityLinkSection 组件：相关实体链接 section 模板重复 20+ 次，抽出后封装 PC/移动端 router-link 三目、i18n 标题、data-detail-anchor；6 个 View 共用
  - 新增 useRelatedEntities 反查工厂：遍历 BREAK 表 filter 含 targetKey 的条目，支持单字段/多字段 OR，返回 ComputedRef；消除 10+ 个反查 computed
  - 新增 useRelatedCases 懒加载封装：RisksView/AttackToolsView/ThreatActorsView 逐字重复的相关案例 3 行样板收敛
  - 新增 useRelationGraph：4 个 View 逐字重复的 openRelationGraph 收敛
  - 新增 useRelatedEntities/useRelatedCases 单测（11 个用例）
- 顺带修复 5 个不一致 bug：
  - AvoidancesView 漏传 detail-route-name，移动端点列表项不跳独立详情路由
  - RisksView/AvoidancesView 的 route.params watch 缺 typeof 守卫，与其他 3 View 不一致
  - 5 个 BREAK View 的 route.params watch immediate 不一致，统一去掉（getInitialKey 已覆盖初始场景）
  - ThreatActorDetail references 标签误用 riskReference i18n key，改为 references
  - KnowledgeSplitView.getParamKey cases 分支返回 "key" 应为 "cKey"，移动端 cases 点列表项路由 param 名错误
- 不做 monolithic useEntityDetail / detail layout 组件（各实体字段组合差异大，横向小件优于纵向大 composable）

## 2.20.7

- 移动端首页标题缩小字体确保一行显示：home-title 在移动端由 1.5rem 缩至 1.05rem，避免"业务风险枚举与规避知识 v2.20.x"换行

## 2.20.6

- 移动端页脚收敛为一行：footer 在移动端改为 flex 布局，"在 PC 下查看效果更佳"提示、版权、GitHub 图标横向排列，节约垂直空间（此前三项各占一行）

## 2.20.5

- 首页统计区新增典型案例卡片：此前首页统计卡片只有风险/规避手段/攻击工具/威胁行为者/行业术语 5 项，缺少案例（1797）；新增案例卡片链接到 /cases
- 首页实体计数改为脚本生成，消除硬编码：新增 scripts/validate/generate-home-counts.mjs 扫描 src/BREAK 各实体目录生成 src/BREAK/home.ts 的 entityCounts（含 cases），配套 validate:home-counts 校验门禁（build 链 + CI + docs-consistency 五处联动）；此前 entityCounts 为硬编码，数据变化时易遗忘导致首页数字与实际不符
- 新增 husky pre-commit hook：每次提交前自动刷新 home.ts 计数并纳入提交，彻底防止计数过时；package.json 新增 prepare 脚本，协作者 npm ci 后自动安装 hook
- references 链接质量治理：85 条 http 链接逐条验证 https 可达性，50 条确认可达的升级为 https（35 条 https 不可达保留 http，避免引入死链）
- 修复 C0363/C1233 两条失效/可疑 reference：C0363 原含中文路径的 huc.me 链接已 404，替换为腾讯新闻同题报道；C1233 原 ipforefront.com 链接连接拒绝，替换为财新网同事件报道；中英文 title 同步更新
- threathunter 综述报告共用优化：1 篇《2024年上半年互联网黑灰产研究报告》被 149 个 term 共用作 reference（其中 145 个已有更精准的专属源，综述属冗余），移除 148 处冗余引用，仅保留 T0440（黑灰产，综述是其合适参考）
- 澄清：调研中发现的"知乎电话占位符 URL"经字符码核实为显示环境对数字 ID 的脱敏渲染，文件内实际是正常知乎数字 ID 链接，非脏数据，无需处理

## 2.20.4

- HomeView 的 subRisks/hideSubRisks 由 ref(Object()) 反模式改为 ref<Record<string, ...>>({})，消除动态键访问的脆弱写法
- useTheme/useAnchorTable 补 SSR window/localStorage 守卫，与 useBreakpoints 对齐：matchMedia/innerHeight/localStorage 在无 window 环境下安全降级
- export-static-data.mjs 的 generatedAt 加 fallback：git log 取提交时间在新文件/无历史/无 git 时返回空，new Date('') 崩溃，改为回退当前时间
- i18n-sync.mjs 非 strict 模式有差异时不再静默 exit(0)，改为打印 ⚠️ 提示避免手动调用误判为同步
- tsconfig.node.json 移除 cypress/nightwatch/playwright 三个死 glob（项目无对应配置文件）
- .prettierrc trailingComma 由 es5 改为 all，与 TS 项目习惯一致
- VISUAL_ANALYSIS_EXPLAINABILITY_PLAN.md 删除已废弃的 validate:docs-build 脚本引用（该脚本随 docs 入库机制一并移除）

## 2.20.3

- CI workflow 仅在 PR 时触发：ci.yml 去掉 push:main 触发，只保留 pull_request。push main 时只跑 Deploy（含全量校验+部署），消除与 CI 的重复；PR 合并前仍有自动校验

## 2.20.2

- 升级 GitHub Actions 到 Node 24 运行时，消除 Node 20 deprecation warning：actions/checkout v4→v5、setup-node v4→v5、configure-pages v4→v6、upload-pages-artifact v3→v5、deploy-pages v4→v5（ci.yml/deploy.yml/link-check.yml 同步）；setup-node 的 node-version 仍保持 20.19.0（项目代码运行时，满足 engines）

## 2.20.1

- CI 与 Deploy 不再运行 Playwright e2e：test:smoke/test:performance/test:relation-stability/test:lighthouse 此前在 GitHub Actions runner 上因 Playwright Chromium 浏览器二进制缓存缺失而失败（chromium_headless_shell-1228 不存在），阻断部署；改为这 4 个 e2e 仅在本地开发环境手动运行，不进 build 链与 CI/Deploy
- 同步从 package.json build 链、ci.yml、deploy.yml、docs-consistency.mjs buildGateScripts 门禁数组移除这 4 个 gate（五处联动），README/README_CN 更新说明为"仅本地运行"；脚本定义保留以便本地手动 npm run

## 2.20.0

- 构建产物不再入库，outDir 由 docs 改回 dist：此前 vite outDir 为 docs 且把构建产物 commit 进 git，docs/assets 在历史中累计约 218MB、涉及 203 次提交，仓库随迭代单调膨胀；改回 dist（已被 .gitignore 忽略）后产物仅由 GitHub Actions（deploy.yml）构建部署，停止本地提交产物
- build 链顺序重排解决 vite 清空 dist 冲突：vite 8 emptyOutDir 默认 true（不看 .gitignore，只看 outDir 是否在 project root 内），改 dist 后 build-only 会清空 dist 删掉 export:data-package 生成的 dist/break-data-package；将 build-only 提到 export:data-package 之前，保证数据包产物在 dist 清空后才生成
- 删除 docs-build-sync.mjs 及 validate:docs-build 门禁：该脚本专为 docs 入库设计（检查 git status -- docs），产物不入库后失去意义；同步移除 package.json scripts 定义、ci/deploy workflow 调用、docs-consistency.mjs buildGateScripts 数组项、README/README_CN 说明（docs-consistency 门禁五处联动）
- 路径与配置同步：static-data-export.mjs（docs/data→dist/data）、bundle-budget.mjs（docs/assets→dist/assets）、deploy.yml 上传路径（docs→dist）；public/data/*.json 改为由 export:data 生成不再入库（git rm --cached + .gitignore）；eslint 移除 **/docs/** 忽略项
- 删除 docs/ 目录全部 95 个构建产物文件（CNAME/favicon/logo/data/assets 均为 public/ 源的构建副本，public/ 仍保留源并由 vite 拷入 dist/）

## 2.19.1

- schema.mjs 英文关键词校验补全覆盖：enKeywordCategories 此前只覆盖 en-risks/en-cases，漏掉 en-avoidances/en-attack-tools/en-threat-actors/en-terms 的 keywords 校验；补全为全部 6 类，并新增纯实体 ID 关键词检查（与 keywords.mjs 对齐），消除空值/重复/ID-only 漏报
- 修复 relation 模块多处 requestIdleCallback/setTimeout 未配对清理：RelationView(12s 预加载)、RelationRouteShell、MenuList(12s/18s 预加载)、RelationSelectorBar 的 idle/timer 回调在组件卸载后仍可能触发，改为 onUnmounted 取消
- relationViewEffects 非法路由参数反模式修复：alert+location.reload 丢弃 SPA 状态且 .then 无 .catch，改为 ElMessage 提示 + router.replace 纯路由跳转，提取 performInitialRender 在路由合法后补跑初始化；relationGraphBuilder 内同类 alert 一并改为 ElMessage
- 详情组件模板全表遍历改为 computed 缓存：RiskDetail/RisksView/AttackToolDetail/AvoidanceDetail/ThreatActorDetail 的 getRelatedTerms 等函数在 v-if+v-for 中重复调用 Object.keys(BREAK.*) 全表扫描，改为按当前 key 的 computed
- KnowledgeSplitView 全局 document.querySelector 改为组件内 ref：选中项滚动此前用 document.querySelector('[data-knowledge-key]') 全局定位，多实例会命中第一个串扰，改为 desktopListRef 局部查询并加 CSS.escape
- build 脚本去重：validate:data 内的 schema-docs.mjs 与 build 链的 validate:schema-docs 是同一脚本跑两遍，从 validate:data 移除（build 链仍保留以满足 docs-consistency 门禁）

## 2.19.0

- 修复 useCases 案例懒加载失败后永久卡死：cnLoadingPromise 缓存了 rejected Promise 但永不重置，首次加载因网络/动态 import 失败后，后续 ensureCases、locale 切换、搜索索引重建都拿到同一个 rejected Promise，案例功能彻底瘫痪只能刷新整页；改为失败时 catch 清空缓存并 rethrow，允许重试
- 修复 SearchDialog 搜索高亮的 v-html XSS 风险：highlightText 只对 query 做了正则转义，text（来自 result.title/result.snippet，部分源自外部 case JSON）未做 HTML 转义直接拼进 <mark>，title 含 <img onerror=...> 等会执行；改为对 text 先按项目既有风格做完整 HTML 转义再插入 <mark>，query 同步转义后参与匹配
- 恢复关系悬空护栏：validate:data 调用 relations.mjs 未传 --strict，引用悬空等 error 级问题在 build 中不会失败（当前数据恰好零悬空未暴露，但失去护栏）；validate:data 改为 relations.mjs --strict，与 i18n-sync.mjs --strict 范式一致
- 修复 vite vue 分包失效：vue 组用 id.includes("node_modules/vue") 会误匹配 vue-router/vue-i18n，且 Vite 8/Rolldown 下 priority 全为 0 时 Vue 运行时被打进 208KB 的 i18n chunk 而非独立缓存；vue 组改为精确正则 /[\\/]node_modules[\\/]vue[\\/]/ + priority 10，Vue 运行时独立成 111KB chunk，i18n 主 chunk 由 208KB 瘦身到 96KB，跨页面切换缓存命中率提升
- 移除误提交进 git 的一次性链接可达性扫描报告 reference-validation-report.json 并加入 .gitignore，避免临时扫描产物污染版本库

## 2.18.3

- 移动端关系网络面板限高由 calc(100dvh - 140px) 调整为 calc(100dvh - 130px)，画布可视区高度增加 10px
- 首页改用轻量 BREAK 数据入口，普通首页首屏不再加载规避手段、攻击工具、威胁行为者和术语全量实体；详情抽屉路由按需加载完整 BREAK 数据
- 修正 references 维护审计口径：英文 i18n 默认只维护引用标题，不再把中文结构源中的 references[].link 缺失误报为链接不一致；清理英文 i18n 中残留的 references[].link
- 补充 cases 懒加载缓存测试和首页轻量计数一致性测试，覆盖率提升到 92%+
- 提高 mobile Sankey Lighthouse trace 超时时间并支持环境变量配置，避免维护审计偶发 30 秒超时
- 完整 build 链路改为生成 docs 后再校验当前 build 产物，保留单独 validate:docs-build 的严格检查
- 移动端完整 BREAK 文案预加载改为首屏后延迟 15 秒，并在省流量、2g、slow-2g 网络下跳过；进入抽屉、列表、搜索和关系图等需要完整数据的路由时仍按需加载
- 优化 build 速度：test:relation-stability 与 test:lighthouse 改为仅次版本（minor）变化时才运行，补丁版本（如 2.18.3 → 2.18.4）自动跳过，省去约 100s 浏览器测试；取不到对比版本时默认运行，不削弱保护
- relation-stability 复杂图谱稳定性测试的 fixture 数量由 5 降为 3，减少重复渲染耗时

## 2.18.2

- 移动端关系网络画布改为面板限高一屏 + 画布在面板内可平移滚动：面板限高 calc(100dvh - 140px)，画布保留可平移大画布（节点保持分散布局），避免页面被撑高的同时不挤压节点
- 修复 .network-graph-pane / .sankey-pane 因 content-box 边框超出父容器被裁剪、移动端右侧与底部边框不可见的问题：两者改为 box-sizing:border-box
- 移动端 .el-main padding 由 20px 调整为 10px（--el-main-padding）

## 2.18.1

- 修复关系节点详情移动端路径操作按钮样式中的 `:deep()` 选择器：普通 CSS 文件改用后代选择器，避免 Vite 8 / lightningcss minify 阶段提示非法伪类
- 保持完整 `npm run build` 门禁通过，确认生产构建不再出现 `[lightningcss minify] 'deep' is not recognized` 警告

## 2.18.0

- 移动端关系网络画布限高一屏：原本画布固定为 max(1180px,260vw) × max(940px,190vh) 的可平移大画布，导致页面被撑高超出一屏；新增 relation-page--mobile-network 限高布局，面板限高（calc(100dvh - 140px)）、el-tabs__content / el-tab-pane 限高 overflow:hidden，画布在面板内可平移滚动，避免画布把页面整体撑高
- RelationNetworkPane 移动端 .network-canvas-scroll 保留 overflow:auto 支持平移，画布高度由 190vh 调整为 160vh
- 修复 .network-graph-pane 因 content-box 导致边框超出父容器被裁剪、移动端右侧与底部边框不可见的问题：改为 box-sizing:border-box

## 2.17.1

- 修复知识库列表项 badge（案例分类/规避分类等）被长标题挤出可视区的问题：badge 由标题行内联改为移至摘要行右侧（flex 布局，badge 不收缩、标题与摘要各自省略），长标题下 badge 始终可见
- 改动作用于通用组件 KnowledgeSplitView，风险/规避手段/攻击工具/威胁行为者/术语/案例所有列表统一生效

## 2.17.0

- 风险/攻击工具/威胁行为者详情页的「相关案例」改为滚动懒加载：相关案例 section 滚动进入可视区时才拉取案例数据，避免进入详情页即加载 3MB 案例数据
- 新增 useLazyCasesSection composable（基于 IntersectionObserver，滚动根取 .knowledge-detail，提前 200px 预加载），加载中显示占位文案，无相关案例时隐藏 section
- 保留「查看相关案例」手动加载按钮作为兜底，自动加载未触发时可手动点击加载；案例数据若已被全局加载（如从 /cases 或搜索进入）则直接复用
- 新增 i18n 文案 loadingRelatedCases（加载中…/Loading…）

## 2.16.0

- 案例列表页（/cases）新增案例分类下拉筛选框，位于搜索框前，支持按 6 类分类（刑事判决/行政查处/安全事件/漏洞通报/学术研究/新闻报道）筛选；筛选框宽度约束为 96px，避免挤压搜索框
- 修复直接访问 /cases 时因案例数据懒加载导致首屏无法默认选中第一个案例的问题：数据加载完成后自动补选第一个元素并定位
- 相关案例 section（风险/攻击工具/威胁行为者详情页）由点击展开懒加载改为进入详情页自动加载，移除展开按钮与空状态提示，无相关案例时不显示该 section
- KnowledgeSplitView 新增列表项变化时的滚动监听，懒加载列表从空变满后自动滚动到选中项

## 2.15.0

- 新增：典型案例（Case）实体
  - 新增第 7 类知识实体 Case，编目 1797 个典型案例，与风险多对多关联（`relatedRisks`）
  - 案例含标题、摘要、分类（刑事判决/行政查处/安全事件/漏洞通报/学术研究/新闻报道）、发生时间、关键词、来源参考
  - 新增 `/cases` 列表详情页（CasesView.vue）和路由，案例可在详情页浏览并跳转关联风险
  - 风险详情页新增"相关案例"section，通过倒排索引（useCasesByRisk）反查
  - 全局搜索新增案例分组，支持案例标题/摘要/关键词检索
  - 案例由采集脚本（Scrapingdog 多引擎搜索 + DeepSeek LLM 提炼/复核/翻译）生成，经去重合并和质量复核后入库
  - 案例不纳入关系图谱节点（避免大节点数拖垮布局），仅在风险详情页展示
  - 案例数据懒加载（useCases composable），首页不加载 3MB 案例数据，访问 /cases、搜索、相关案例反查时按需加载
  - 案例 category 用 key 映射（caseCategory_*），中英文通过 i18n 映射，不依赖翻译
  - 修复 79 个行业术语（T0522-T0600）的模板化占位定义，由英文真实定义翻译回填
  - 同步中英文实体数据、Schema（caseSchema）、校验脚本、静态数据导出、npm 数据包类型声明和构建分包
  - 更新 README/README_CN/CLAUDE.md/AGENTS.md/DATA_SCHEMA.md 文档

## 2.14.8

- 修复：同步关系洞察测试和构建产物
  - 更新关系图谱洞察测试，覆盖结构化 `highlights` 输出
  - 重新生成 GitHub Pages 构建产物和静态数据包
  - 保持完整构建、性能预算和 Lighthouse 基线通过

## 2.14.7

- 调整：移除路线图文件跟踪
  - 删除 `ROADMAP.md`，并同步取消文档一致性校验对该文件的强依赖
  - 保留 README、README_CN、Schema 文档和构建门禁的同步校验

## 2.14.6

- 新增：关系图谱边界回归样本
  - 新增人工异常夹具，覆盖空关系根节点、重复关系线去重、超高 fan-out、多类型密集路径和选中节点响应式切换
  - 补充真实稀疏/密集风险样本，防止 Sankey 攻击路径分组、路径解释和关系洞察在数据规模变化时回退
  - 测试基线更新为 11 个测试文件、112 个用例

## 2.14.5

- 优化：提升 Lighthouse 无障碍基线
  - 为桌面和移动端导航、搜索入口、主题/语言切换、GitHub 链接补充可访问名称和更稳定的导航语义
  - 为首页业务场景筛选、子风险切换和业务场景矩阵补充表单/表格语义，并提升 Footer 与控件对比度
  - Lighthouse a11y 基线提升到 desktop/home 90、desktop/risks 91、desktop/relation-sankey 91、mobile/home 95、mobile/risks 100、mobile/relation-sankey 96

## 2.14.4

- 修复：稳定桌面端 Lighthouse CLS 基线
  - 固定应用顶层 Header/Footer 占位高度，避免首帧布局和 Element Plus 默认容器高度切换造成位移
  - Footer 从 sticky 占位改为普通流式底部区域，降低首页和知识库页面的 CLS 波动

## 2.14.3

- 优化：移动端 Sankey 关系页首屏性能
  - 首页相关路由改为按需加载，直达关系页时不再提前拉取 HomeView 和首页业务场景矩阵依赖
  - 新增关系页路由轻量 shell，移动端先展示首屏骨架后再加载完整关系页，PC 端保持立即加载以优先保证点击响应速度
  - 入口启动不再等待完整 BREAK 语言消息注入完成后才挂载应用，语言实体消息改为空闲阶段初始化
  - mobile/relation-sankey 最新 trace：performance 91、LCP 2406ms、TBT 195ms、CLS 0；相比上轮回归点 LCP 从约 5709ms 降至约 2406ms
- 优化：Sankey Lighthouse trace 诊断报告
  - `audit:lighthouse-sankey` 新增 LCP phase、render-blocking resource、critical network request 和 slow network request 输出
  - 便于区分移动端瓶颈是主线程、网络请求、CSS 阻塞还是首屏可绘制内容延迟
- 新增：关系图谱回归测试补强
  - 补充 Sankey 攻击路径、路径解释、关系洞察和复杂图谱交互的回归样本
  - 测试基线更新为 9 个测试文件、102 个用例，并保持核心逻辑覆盖率门禁通过
- 合并：关系图谱可解释性增强分支
  - 合入业务场景影响解释、分析面板和关系说明增强
  - 测试基线更新为 10 个测试文件、106 个用例

## 2.14.2

- 新增：扩充业务风险数据规模
  - 新增 34 个风险、29 个规避手段、13 个攻击工具、11 个威胁行为者和 79 个行业术语
  - 同步中英文实体数据、业务场景归类和构建产物
- 优化：Bundle 预算进入强门禁
  - `npm run build`、CI 和 GitHub Pages Deploy 均在构建后执行 `audit:bundle:check`
  - `bundle-budget` 支持 `--check-only`，门禁模式不刷新报告文件
- 新增：docs 构建产物同步校验
  - `npm run build`、CI 和 GitHub Pages Deploy 均会检查 `docs/` 是否与当前源码构建结果一致
  - 防止 GitHub Pages 发布产物和源码变更漂移
- 新增：静态站 smoke 测试
  - `npm run build`、CI 和 GitHub Pages Deploy 会用 Playwright 验证首页、知识页和关系页构建产物可加载
  - 捕获主要路由的渲染失败和运行时错误
- 新增：静态站运行时性能预算
  - `npm run build`、CI 和 GitHub Pages Deploy 会检查首页、风险页和 Sankey 关系页的加载耗时、资源体积和请求数量
  - 补齐 GitHub Pages 构建产物的运行时性能回归保护
- 新增：英文 i18n 质量校验
  - `validate:data` 会检查英文实体字段缺失和英文展示内容中的中文残留
  - 修正英文风险、规避手段、攻击工具、威胁行为者、术语和业务场景数据的翻译覆盖
  - 补充模板化英文关键词/别名检测，并清理残留的生成式占位内容
- 新增：文档统计一致性校验脚本
  - `validate:data` 现在会检查 README、README_CN、ROADMAP 的实体规模、参考资料口径和版本号
  - 防止数据规模更新后文档统计再次漂移
- 优化：文档验证基线同步
  - `docs-consistency` 现在会检查测试文件数、测试用例数和 `npm run build` 的完整门禁链路
  - 同步 README/README_CN 的校验命令说明，覆盖 coverage、docs build、smoke 和 performance 门禁
- 新增：静态数据导出
  - 新增 `export:data` 生成 `public/data/break-data.json` 和 `public/data/break-manifest.json`
  - 新增 `validate:data-export` 校验数据包、manifest hash、实体计数、版本号和 GitHub Pages 产物同步
  - `npm run build`、CI 和 GitHub Pages Deploy 会生成并校验静态数据包
  - 静态数据 manifest 使用提交时间生成，避免重复构建产生无意义时间戳漂移
- 优化：关键词审计和 Pages 构建顺序
  - `keywords` 审计新增纯实体 ID 关键词拦截，并清理新扩展数据中的 ID 占位关键词
  - `fix:keywords` 保持显式写入模式，普通 `validate:data` 只报告不改写实体文件
  - `npm run build`、CI 和 Deploy 会先检查已提交 `docs/` 同步状态，再重新生成 Pages 产物用于后续 smoke/performance 验证
  - 统一中文界面中的“业务场景”表述
- 新增：数据 Schema 文档生成
  - 新增 `DATA_SCHEMA.md` 说明实体文件规则、字段约束、引用结构和关系语义
  - 新增 `schema:docs:write` 从 `src/validation/breakSchema.ts` 生成文档
  - 新增 `validate:schema-docs` 并接入 `validate:data` 和 `npm run build`，防止 Schema 文档漂移
- 新增：关系图谱回归测试覆盖
  - 补充 Sankey 攻击路径、路径角色说明和移动端高度测试
  - 补充根节点路径解释、关系洞察和局部预览统计测试
  - 补充复杂图谱过滤、去重、选中样式、拖拽位置和上下文节点转换测试
- 新增：核心逻辑测试覆盖率门禁
  - `npm run build`、CI 和 GitHub Pages Deploy 会执行 `test:coverage`
  - 对关系攻击路径、关系洞察、关系布局、搜索和安全 i18n 核心模块设置覆盖率阈值
- 优化：业务场景供应链安全归类
  - 将原“内部与供应链安全”拆分为 RS06“内部安全”和 RS28“供应链安全”
  - 同步 18 个业务场景及英文 i18n 场景标题，降低内部治理风险与供应链风险的归类混淆
- 优化：静态站运行时回归测试
  - smoke/performance 测试改为对同源资源失败强阻断，并忽略已降级处理的第三方统计/API 资源加载失败
  - 保留主路由、构建资源和业务页面渲染的回归保护，避免外部服务 403 误伤本地 Pages 验证
- 新增：Sankey 攻击路径分析增强
  - 攻击路径支持按 ThreatActor、AttackTool、Risk、Avoidance 继续筛选
  - 路径详情展示 ThreatActor -> AttackTool -> Risk -> Avoidance 的可读链路
  - 每段路径说明来源字段和成立原因，区分制作工具、使用工具、直接造成、间接支撑和风险规避
  - Risk 视角新增规避覆盖面板，区分风险自身规避、相关工具规避和两者重叠来源
  - 关系洞察新增证据等级、关系解释、分析影响和质量标记
  - 节点关系抽屉与 CSV 导出同步补充解释字段，便于回归比对复杂图谱交互结果
  - 补充攻击路径筛选、路径详情、规避覆盖和推导依据单元测试，测试基线更新为 89 个用例
- 新增：复杂关系图谱稳定性验收
  - 新增 `test:relation-stability`，使用 Playwright 覆盖 5 个高关联实体和 6 种网络布局
  - 验证复杂图谱 canvas 非空渲染、布局切换、节点/关系筛选和节点详情抽屉可用
  - `npm run build`、CI 和 GitHub Pages Deploy 将执行该稳定性脚本
- 新增：Lighthouse 桌面/移动端基线
  - 新增 `test:lighthouse`，对首页、风险页和 Sankey 关系页执行 Lighthouse performance/a11y/best-practices/SEO 基线检查
  - `npm run build`、CI 和 GitHub Pages Deploy 将执行 Lighthouse 基线
  - 当前基线重点防止退化，后续优化目标是提高移动端 LCP 和无障碍分数
- 新增：npm 数据包评估产物
  - 新增 `export:data-package`，基于 `public/data` 生成 `dist/break-data-package`
  - 评估包名为 `@jdarmy/break-data`，包含 JSON 数据、manifest、运行时入口、类型声明和独立 README
  - 新增 `validate:data-package` 校验包边界、版本、manifest hash、类型声明和 README
  - `npm run build`、CI 和 GitHub Pages Deploy 会生成并校验 npm 数据包评估产物
- 优化：工程化闭环同步
  - ROADMAP 重新纳入版本库，避免本地路线图校验通过但对外文档未更新
  - CI 和 GitHub Pages Deploy 显式补齐 `validate:schema-docs`、`export:data-package` 和 `validate:data-package`
  - `docs-consistency` 会检查 CI/Deploy workflow 与本地 build 门禁同步
  - PR 模板和数据变更 Issue 模板补充 CHANGELOG 分类、数据包影响和验证清单
- 新增：关系洞察回归用例
  - 补充选中节点缺失时回退根节点的测试
  - 补充多跳路径不误报根节点直接关系的测试，测试基线更新为 91 个用例
- 优化：路由预取策略
  - PC 端挂载后立即预取知识页和关系图，优先保证菜单点击响应速度
  - 移动端改为菜单打开后延迟预取、点击具体知识项时按需预取，降低首屏和菜单动画阶段的资源竞争
  - 关系图仍按入口和当前视图定向预取 ECharts 能力
- 优化：移动端 Lighthouse 首屏负载
  - 搜索弹窗改为按需加载，PC 端继续预加载，移动端仅在点击搜索或延迟空闲阶段加载
  - 移动端关系页不再在路由守卫阶段抢先加载 ECharts，Sankey 图表初始化延后到页面骨架首帧之后
  - 关系页次级视图预加载按 PC/移动端分流，降低移动端 Sankey 首屏主线程竞争
  - 英文 BREAK 数据改为按语言设置按需加载：初始语言为中文时不再加载英文实体翻译，初始语言或切换语言为英文时再加载
  - 中文/英文完整 BREAK 实体消息改为按当前语言异步注入，避免 i18n 入口静态绑定全量实体数据
  - mobile/relation-sankey 最新 trace：performance 94、LCP 2252ms、TBT 148ms，最大主线程类别降为 Script Evaluation 433ms
  - 首页详情抽屉和嵌套详情抽屉改为异步组件，减少首页首屏 JS 解析量
- 优化：参考资料重复链接清理
  - 去重 A0016“威胁情报”和 A0058“灾难恢复”的重复 reference
  - `audit:references` 已清零，`audit:metrics` 参考资料总量更新为 1066
- 新增：风险案例采集研究脚本
  - 新增 `collect:risk-cases`，用于按 Risk 批量搜索、抓取正文并提炼典型案例
  - 支持 `--dry-run`、`--limit`、`--risk`、`--resume`、`--only-failed` 和 `--no-fetch-body` 控制采集范围
  - 新增项目协作规则和 Scrapingdog 搜索技能说明，API 密钥均通过环境变量读取
- 新增：移动端 Sankey Lighthouse trace 报告
  - 新增 `audit:lighthouse-sankey`，输出 `research/search-reports/lighthouse-mobile-sankey-trace.{json,md}`
  - 报告提取 mobile/relation-sankey 的 LCP/TBT、main-thread breakdown、long task、bootup time 和最大脚本请求
  - `audit:maintenance` 会读取该报告，并在移动端 Sankey TBT 偏高时生成 P1 维护任务
- 修复：同步中文 README 数据规模统计，保持与当前数据口径一致
- 优化：关系审计和指标脚本口径
  - ThreatActor 工具关系按 build/use 合并覆盖统计
  - 业务场景重复引用改为观察项，不再直接生成维护任务
- 完善：补齐部分风险规避关系和威胁行为者工具关系，提升关系覆盖质量
- 优化：抽离关系图 ECharts 核心加载入口，刷新生产构建产物
- 优化：启用 TypeScript 严格模式，提升类型安全
- 优化：添加全局错误处理机制（Vue errorHandler）
- 优化：Terms 数据分包从 500KB 优化到 300KB
- 优化：增加无障碍性支持
  - 导航菜单添加 ARIA 标签（role="navigation", aria-label）
  - 搜索输入框添加 aria-label
- 优化：添加完整的 SEO 元标签
  - description、keywords、author
  - Open Graph (og:*) 标签
  - Twitter Card 标签

## 2.14.1

- 修复：生产构建中Element Plus和ECharts的运行时错误
  - 移除第三方库的maxSize限制，避免代码分割导致依赖丢失
  - 为Terms数据文件设置500KB分割限制，优化加载性能
- 修复：页面自动刷新问题
  - 暂时禁用百度统计脚本，避免10秒自动刷新

## 2.14.0

- 优化：移动端关系图谱交互体验
  - 关系网络使用更大的可滚动画布，默认选中节点自动居中到当前可视区域
  - 节点筛选与关系筛选固定在画布顶部，底部控制条固定居中
  - 移动端节点操作改为长按触发，避免短按误弹菜单
  - 桑基图支持移动端宽画布横向滚动、页面级纵向滚动和更清晰的标签显示
- 优化：移动端知识库导航
  - 知识库列表进入详情再返回时恢复之前的列表滚动位置
  - 知识库详情页“查看关系图”改为当前窗口打开，首页抽屉保持新窗口打开
- 优化：搜索与主题
  - 全局搜索支持 1 个字符开始匹配
  - 未保存主题设置时默认使用暗黑模式，已保存的 localStorage 主题设置继续优先
- 新增：33个行业术语（T0489-T0521）
  - **区块链术语**（15个）：智能合约、DeFi、NFT、DAO、Layer2、跨链桥、闪电贷、预言机、Gas费、私钥、助记词、冷钱包、热钱包、Rug Pull、MEV
  - **社交工程与钓鱼**（9个）：社会工程学、网络钓鱼、鱼叉式钓鱼、捕鲸攻击、水坑攻击、恶意软件、勒索软件、僵尸网络、APT攻击
  - **网络安全基础**（9个）：漏洞、0day漏洞、防火墙、入侵检测系统、加密、数字证书、VPN、沙箱、蜜罐
- 完善：术语引用链接质量提升
  - 验证并修复28个失效引用链接（404/403/超时）
  - 使用Scrapingdog API搜索替代来源
  - 引用来源：NIST、CISA、FBI、Microsoft、Cloudflare、Ethereum Foundation等权威站点
- 新增：完整的中英文术语内容
  - 所有术语包含definition、description、usageExample
  - 英文内容通过DeepSeek-V4-Pro模型翻译
  - 中英文数据架构与risks/avoidances保持一致

## 2.13.0

- 重构：区块链安全场景优化（5个场景 → 3个场景）
  - **RS12 Web3生态攻击**（5个风险）：供应链攻击、EIP/协议钓鱼、Telegram Bot钓鱼、多签钱包社工、DApp前端劫持
  - **RS15 智能合约与DeFi安全**（13个风险）：合并原智能合约场景、DeFi协议场景，新增代币漏洞、NFT版税、Layer2桥接、账户抽象、MEV攻击
  - **RS17 区块链基础设施安全**（12个风险）：合并原共识攻击场景、密钥资产场景，新增量子威胁、链上隐私
  - 删除：RS16（DeFi协议攻击）、RS18（密钥与资产安全）已合并到其他场景
- 重构：物联网安全场景优化（4个场景 → 2个场景）
  - **RS19 IoT设备与数据安全**（14个风险）：合并原IoT新兴威胁、IoT设备攻击、IoT数据与侧信道场景
  - **RS20 工业与车联网安全**（6个风险）：保持独立，覆盖工业物联网、车联网等垂直行业场景
  - 删除：RS18（IoT新兴威胁）、RS21（IoT数据与侧信道）已合并到 RS19
- 完善：为 BS15/BS16/BS17 补充通用风险维度
  - 新增 RD02（运营维度）：合规风险、内容风险、内部风险
  - 新增 RD03（身份维度）：身份盗用风险、身份识别风险
  - 新增 RD04（对抗维度）：非法请求风险、终端对抗风险
- 优化：场景语义更聚焦，风险分布更均衡（5-14个/场景 vs 原3-12个/场景）
- 优化：首页布局更紧凑，减少横向滚动距离


## 2.12.0

- 新增：区块链/Web3 风险补充（12个，R0193-R0204）
  - 高优先级：区块链供应链攻击、EIP/协议钓鱼攻击、Telegram Bot钓鱼、量子计算威胁、多签钱包社会工程攻击、代币增发/通缩漏洞
  - 中优先级：NFT版税绕过、Layer2桥接风险、账户抽象钱包风险、链上数据隐私泄露、DApp前端劫持、Gas费操纵与抢跑
- 新增：物联网风险补充（9个，R0205-R0213）
  - 高优先级：AIoT融合攻击、IoT硬件供应链攻击、eSIM/iSIM劫持、医疗物联网专项风险、非法外联与C2控制
  - 中优先级：工业协议漏洞利用、智能家居隐私窃听、车联网V2X攻击、边缘计算节点攻击
- 新增：元宇宙风险补充（8个，R0214-R0221）
  - 高优先级：数字虚拟人深度伪造、元宇宙社交工程攻击、虚拟资产跨平台转移风险、XR设备固件攻击、空间计算隐私泄露
  - 中优先级：元宇宙内容审核挑战、虚拟世界经济操纵、跨虚实身份关联攻击
- 新增：配套规避手段（28个，A0167-A0194）
  - 区块链：11个（供应链安全审计、EIP安全验证、多签时间锁、后量子密码、MEV保护等）
  - 物联网：9个（AIoT模型安全、硬件安全模块、医疗设备网关、工业协议DPI等）
  - 元宇宙：8个（虚拟人水印验证、身份联邦认证、XR可信启动、空间隐私保护等）
- 完善：业务场景更新
  - BS15（Web3与区块链）：新增RS12场景（Web3生态攻击），风险从18个扩展至30个
  - BS16（物联网）：新增RS18场景（IoT新兴威胁），风险从11个扩展至20个
  - BS17（元宇宙）：风险从5个扩展至13个
- 优化：首页横向滚动功能
  - 场景数>10时启用横向滚动，容器宽度精确匹配内容
  - 场景宽度优化至180px，提升内容密度
  - 修复底部溢出和滚动条显示问题

## 2.11.3

- 重构：优化业务场景维度结构（符合框架设计惯例）
  - 维度数量从 13个 优化至 7个（每个维度包含多个场景）
  - RD05：区块链安全维度（智能合约、DeFi、共识、密钥 - 4个场景）
  - RD06：物联网安全维度（设备、工业车联网、数据侧信道 - 3个场景）
  - RD07：元宇宙安全维度（虚拟资产、虚拟环境 - 2个场景）
- 修复：全场景（BS00）包含所有最新业务场景
- 修复：首页术语统计卡片高度统一
- 更新：README 统计数据（287风险、243规避手段、488术语）

## 2.11.2

- 新增：系统性补充37个术语的参考链接（T0452-T0488）
  - 使用 Scrapingdog API 自动搜索权威来源
  - 每个术语添加 1-3 个参考链接（技术文档、新闻媒体、百科知识等）
  - 同步更新中英文参考链接
- 优化：术语抽屉改进
  - 首页各类抽屉中的术语链接改为抽屉打开方式（保持交互一致性）
  - 术语详情标签从"ID"改为"术语ID"
- 新增：术语参考链接管理脚本
  - `scripts/import/add-term-references.mjs` - 自动搜索并添加参考链接
  - `scripts/import/sync-term-references-en.mjs` - 同步英文参考链接

## 2.11.1

- 优化：关系图谱加载性能提升约10倍
  - 移除 nextTick 等待，直接渲染图表（从 95ms 降至 7-10ms）
  - 增加详细的性能监控日志（rAF、setTimeout、rebuildGraphData、renderNetworkChart 各阶段耗时）
- 修复：术语节点的攻击路径处理
  - 选择术语作为根节点时，攻击路径显示为空（术语不参与攻击路径逻辑）
  - 避免全量攻击路径数据计算，显著提升性能

## 2.11.0

- 新增：49个行业术语（T0440-T0488）
  - 黑灰产术语：黑灰产、撞库、养号、打码、接码、卡商、号商、料商、猫池、四件套、过检、实名认证、黑卡等
  - 攻击手段：社工、钓鱼、木马、后门、0day、1day、Nday、远控、勒索软件、挖矿木马、僵尸网络等
  - 安全技术：验证码、人机验证、风控、反欺诈、设备指纹、行为分析、威胁情报、蜜罐、沙箱等
  - Web安全：XSS攻击、SQL注入、CSRF、SSRF、XXE、文件上传漏洞、反序列化漏洞、越权漏洞等
  - AI安全：深度伪造、对抗样本、提示词注入、模型投毒等
- 新增：术语关系图谱功能（relationGraphTermBuilder.ts）
  - 支持以术语为根节点展示关联风险、规避手段、攻击工具、威胁行为者
  - 其他实体类型的关系图谱中反向展示关联术语
- 完善：关系图谱系统全面支持术语节点
- 完善：各视图组件集成术语展示和跳转功能

## 2.10.2

- 修复：T0473（深度伪造）删除无效风险引用 R0084-002
- 修复：T0476（XSS攻击）补充缺失的标题关键词

## 2.10.1

- 新增：关系图谱支持行业术语节点
  - 新增 `term` 关系节点类型，可在关系图谱中以术语为根节点查看相关风险、规避手段、攻击工具和威胁行为者
  - 风险、规避手段、攻击工具、威胁行为者图谱中支持反向展示关联术语
  - 新增“关联术语”关系线、术语节点配色、图例、筛选项和详情跳转
- 优化：术语详情展示优先使用规范词标题，并将异写/别称保留在别名中
- 修复：补齐部分规避手段条目的标题关键词，保证关键词完整性测试通过

## 2.10.0

- 新增：72个规避手段条目（A0095-A0166）
  - 区块链/Web3安全：智能合约审计、闪电贷防护、跨链桥安全、私钥管理、DAO治理防护、Rug Pull防范、预言机保护、MEV防御、51%攻击防护、隐私保护、重放攻击防护、合约升级机制等（36个）
  - IoT安全：固件安全、设备认证、网络隔离、僵尸网络防护、侧信道防护、工控安全、OTA安全等（21个）
  - 元宇宙/虚拟资产：链上确权、平台审核、资产估值、身份验证、信用体系等（9个）
  - 数据安全与合规：访问控制、隐私计算、数据最小化、链上监管、资产追踪等（6个）
- 完善：为24个区块链和IoT相关风险（R0159-R0188）关联对应的规避手段
- 修复：TermsView.vue lint错误（移除未使用的变量）

## 2.9.0

- 新增：区块链/Web3 风险（18个）
  - 基础层：智能合约漏洞、闪电贷攻击、跨链桥攻击、私钥泄露与管理风险
  - 应用层：DAO治理攻击、Rug Pull、预言机操纵、MEV攻击
  - 进阶层：51%攻击、女巫攻击、Gas费操纵、链上隐私泄露、区块链重放攻击、时间戳依赖攻击、不可升级合约设计缺陷
  - 边缘场景：日食攻击、长程攻击/无成本模拟、自私挖矿
- 新增：物联网风险（11个）
  - 基础层：智能设备劫持、固件篡改与后门、IoT僵尸网络、IoT设备默认凭据风险
  - 进阶层：IoT侧信道攻击、工业物联网安全风险、车联网安全风险、OTA更新劫持、IoT数据篡改攻击
  - 边缘场景：传感器欺骗攻击、医疗物联网安全风险
- 新增：元宇宙/虚拟资产风险（5个）
  - 核心层：虚拟土地/资产欺诈、元宇宙身份盗用、虚拟世界资产盗窃
  - 边缘场景：AR/VR设备安全风险、虚拟世界骚扰与暴力
- 完善：风险知识库从 158 个扩展至 192 个条目

## 2.8.2

- 修复：移动端导航栏标题和图标垂直居中对齐
- 修复：移动端搜索对话框隐藏键盘快捷键提示（ESC 关闭、快捷键徽章）
- 修复：亮色模式下 GitHub 统计信息颜色不可见问题
- 修复：移动端首页统计卡片使用 CSS Grid 实现两列布局
- 修复：Logo 点击跳转到首页功能
- 修复：搜索跳转后点击返回的历史记录问题
  - 为规避手段、攻击工具、威胁行为者创建专门的详情路由
  - 统一所有实体类型的搜索跳转体验
  - 修复 KnowledgeSplitView 重复调用 router.replace 问题
- 优化：路由 scrollBehavior 智能重试机制，避免元素未渲染的警告
- 新增：风险详情弹出层中添加威胁行为者展示
- 新增：ThreatActorDetail 组件
- 优化：参考资料列表样式（添加项目符号、优化间距、增大字体）
- 优化：统一首页弹出层和知识库列表页中的关联实体按钮样式

## 2.8.1

- 修复：关系图谱网络图拖拽节点时其他连接变淡的问题
  - 移除 ECharts 4 遗留 API `focusNodeAdjacency`，保留 `emphasis.focus: "adjacency"`
  - hover 节点时仍正常聚焦变淡，拖拽节点时不再触发相邻聚焦
- 新增：关系图谱筛选面板国际化标签（节点筛选、关系筛选）

## 2.8.0

- 新增：全面移动端适配优化
  - 基础设施：创建 useBreakpoints composable，统一响应式断点系统（480/768/992/1200px）
  - 基础设施：重构 useDrawerWidth，平板设备使用 70vw 宽度，断点统一为 768px
  - 基础设施：在 theme.css 添加断点 CSS 变量文档
  - 基础设施：全局 100vh → 100dvh，修复移动浏览器地址栏收缩问题
  - 移动端导航：新增汉堡菜单 + el-drawer 侧滑面板，包含全部导航入口（首页、知识库、关系图、JDArmy 外链、主题切换、语言切换、GitHub）
  - 搜索弹窗：宽度改为响应式（92vw/640px），结果改为两行布局（ID+标题 / 摘要），添加 @touchstart 触摸选中
  - 首页统计卡片：手机端 2x2 自适应布局，修复水平溢出
  - 详情页标题区：手机端改为纵向布局，标题字号使用 clamp() 平滑缩放
  - 详情页网格：手机端 detail-grid 改为单列
  - 实体标签：手机端最小点击区域 32px
  - 知识库页面：手机端改为列表/详情两态切换模式（选中后切换到详情态，返回按钮切回列表）
  - 嵌套抽屉：AvoidanceDetail 和 AttackToolDetail 添加返回按钮
  - 关系图谱：手机端默认打开攻击路径 Tab（桑基图）
  - 关系图谱：触摸设备单击节点弹出底部操作面板（替代右键菜单）
  - 关系图谱：筛选面板移动端改为静态布局
  - 关系图谱：Sankey 图标签和留白响应式适配（手机 80px/100px，平板 160px）
  - 关系图谱：RiskRelation 触摸设备启用缩放和拖拽
  - RelationView：calc 负值修复，断点统一为 768px
  - hover 交互：为 13+ 处 :hover 样式添加 :active 触摸替代
  - Footer：position: fixed → sticky，删除 "请在桌面端查看" 提示
  - 编辑器页面：el-col 添加 :xs 响应式 span，Dialog 响应式宽度，Transfer 移动端垂直布局
  - 国际化：新增 back、cancel 翻译键

## 2.7.6

- 补全：Phase 2.2 工具函数测试（21 → 48 测试用例）
  - 新增 useSafeI18n 单元测试：路径解析、数组索引、管道符绕过、语言切换
  - 新增 useSearch 单元测试：空查询、中文搜索、英文搜索、模糊匹配、结果格式

## 2.7.5

- 修复：JDArmy 下拉菜单未适配暗黑模式
  - 暗色下 el-dropdown-menu 背景切换为深色
  - 暗色下菜单项文字和链接颜色适配
  - 暗色下菜单项 hover 状态背景适配

## 2.7.4

- 修复：关系图谱切换亮色/暗色主题时 Canvas 背景未更新
  - 改用销毁重建策略：监听 isDark 变化时通过 v-if 销毁 relation-graph 组件，nextTick 后重建并重新加载数据
  - RelationView 和 RiskRelation 均同步修复
- 修复：导航栏标题和搜索框垂直未对齐
- 修复：ThemeToggle 图标垂直对齐问题

## 2.7.3

- 修复：ThemeToggle 图标在亮色模式下显示太阳而非月亮
  - 根因：`useTheme` composable 非单例模式，每次调用创建独立状态实例，不同组件间主题状态不同步
  - 改为模块级单例，所有组件共享同一份 `theme`/`isDark` 状态

## 2.7.2

- 改进：ThemeToggle 下拉菜单支持亮色/暗色/跟随系统三种模式（与语言切换风格一致）
- 改进：关系图谱 Canvas 暗色模式适配
  - 暗色下 Canvas 背景色、连线颜色、连线文字、节点文字、节点边框均切换为暗色系
  - 暗色下工具栏背景和图标颜色适配
  - RelationView 和 RiskRelation 均支持暗色切换时自动刷新图谱

## 2.7.1

- 新增：暗色主题支持（Phase 2.4）
  - 三种模式：亮色/暗色/跟随系统，localStorage 持久化
  - 导航栏主题切换按钮（太阳/月亮图标）
  - CSS 变量系统（`--break-*` 前缀），`html.dark` 切换暗色值
  - Element Plus 暗色模式集成
  - 替换 App.vue、HomeView、RelationView、ReferenceList、RiskRelation 中硬编码颜色为 CSS 变量
  - 新增 `useTheme` composable、`ThemeToggle` 组件、`theme.css`
- 修复：全文搜索 i18n 路径解析错误，导致搜索无结果
  - 根因：`localeMessages["BREAK.risks"]` 无法解析点分隔路径，返回 undefined
  - 新增 `getNestedValue()` 工具函数遍历嵌套属性
- 修复：ThemeToggle 组件未使用的 `theme` 变量 lint 错误

## 2.7.0

- 新增：全文搜索功能（Phase 2.1）
  - 集成 Fuse.js 模糊搜索引擎，支持中英文双语搜索
  - 导航栏搜索入口，支持 Cmd+K / Ctrl+K 全局快捷键唤起
  - 搜索结果按实体类型分组显示（风险/规避手段/攻击工具/威胁行为者）
  - 匹配关键词高亮，键盘导航（↑↓选择、Enter跳转、ESC关闭）
  - 点击结果跳转到对应列表页锚点定位
  - 新增 `useSearch` composable

## 2.6.2

- 修复：翻译 101 条 EN references 中仍为中文的标题（risks 52条、avoidances 23条、attackTools 17条、threatActors 9条）
  - 全部 795 条 references 标题已翻译为英文，英文模式下不再显示中文
  - 翻译时清理了中文网站 SEO 标签（如 `|犯罪行为|犯罪活动_网易订阅`），保留核心标题内容

## 2.6.1

- 修复：详情抽屉和列表页 References 标题在英文模式下仍显示中文
  - 根因：vue-i18n 的 t() 函数将 `|` 字符当作复数分隔符处理，导致含 `|` 的标题被截断
  - 新增 `useSafeI18n` composable，提供 `safeT()` 函数直接从 messages 对象读取翻译值，绕过管道符解析
  - ReferenceList 组件改用 safeT() 获取翻译标题
  - AttackToolsView、AvoidancesView、ThreatActorsView 列表页的 references 标题改用 safeT()

## 2.6.0

- 重构：i18n 架构从"全量复制 JSON"迁移至"单一数据源 + 运行时合并"
  - 中文数据（src/BREAK/）作为唯一结构数据源，英文翻译文件仅保留可翻译文本字段
  - 新增 mergeWithStructure 运行时合并函数，自动将中文结构数据与英文翻译合并
  - 精简 AttackTools（75个文件）：移除 avoidances、directCauseRisks、indirectSupportRisks、references[].link、updated
  - 精简 ThreatActors（44个文件）：移除 buildAttackTools、useAttackTools、directCauseRisks、indirectSupportRisks、references[].link、updated
  - 精简 Risks（158个文件）：移除 references[].link
  - 精简 Avoidances（93个文件）：移除 references[].link
  - 精简 BusinessScenes（15个文件）：移除 risks 数组、description、updated 及嵌套结构字段
  - 将 EN Basic Info 从硬编码 JS 对象迁移为独立 JSON 文件（src/i18n/en/BREAK/basic-info/main.json）
  - 组件无需任何修改，dual-access 模式（import BREAK + $t()）完全兼容
  - Editor 组件不受影响，继续读写 src/BREAK/ 中文源文件
  - 更新 CLAUDE.md 国际化同步规则，明确英文文件仅需维护翻译字段

## 2.5.0

- 补全：AT directCauseRisks 空值率 8.0% → 0%（7个AT补充直接风险关联）
  - AT0006 接码平台、AT0010 暗网、AT0015 调试工具、AT0016 云手机、AT0017 多开工具、AT0028 反编译工具、AT0043 匿名通讯工具
- 补全：AT indirectSupportRisks 空值率 6.8% → 0%（6个AT补充间接风险关联）
  - AT0011 手机预制木马后门、AT0013 木马病毒、AT0053-002 AI视频伪造、AT0071 PhaaS平台、AT0073 虚假来电伪装、AT0074 AI Agent劫持
- 补全：TA buildAttackTools 空值率 26.4% → 18.9%（4个TA补充自建工具）
  - TA0001 羊毛党、TA0025-001 点券金币商、TA0026 游戏代练员、TA0028 恶意玩家
  - 剩余10个空值为合理空值（众包工人、打码员、狗推等纯使用者不自建工具）
- 所有变更同步英文 i18n 翻译文件

## 2.4.0

- 补全：AT indirectSupportRisks 空值率 50% → 6.8%（38个AT补充间接关联风险）
  - 基于共享规避手段推导，每个AT最多保留10个最相关的间接风险
- 补全：TA indirectSupportRisks 空值率 73.6% → 0%（51个TA全部补充间接关联风险）
  - 基于使用的AT关联的indirectSupportRisks推导
- 补全：TA buildAttackTools 空值率 60.4% → 26.4%（17个TA补充自建工具关联）
  - 基于领域知识严格映射，仅对确实开发工具的TA补充
  - 剩余14个空值为合理空值（众包工人、打码员、狗推等不自建工具）
- 关联：21个孤儿 Avoidance 全部关联到对应 Risk
- 关联：29个孤儿 Risk 全部关联到 BusinessScene 和/或 AT
- 所有变更同步英文 i18n 翻译文件

## 2.3.1

- 更新：ROADMAP.md 如实标注 Phase 1 完成状态
  - 1.1 数据一致性 ✅ 100% 完成
  - 1.2 Reference 元数据 ✅ 策略变更完成（精简为 link+title + 111个不可达链接替换）
  - 1.3 实体关联关系 ⚠️ 35% 完成（仅 AT directCauseRisks 达标，其余4项未完成）
  - Phase 1 总完成度约 78%，遗留5项待处理
  - 新增 DQ-14（不可达链接）和 DQ-13 修正（36个孤儿 Risk，非15个）
  - 关键指标表更新为 v2.3.0 实际值

## 2.3.0

- 修复：批量替换111个不可达引用链接为有效替代来源
  - 替换百家号(baijiahao)23个、知乎专栏(zhuanlan)18个、搜狐(sohu)8个、Gartner 7个等反爬/超时/403链接
  - 使用 Scrapingdog 百度搜索 + Google 搜索 API 查找替代来源
  - 替换来源包括：网易163、腾讯新闻、简书、CSDN、OWASP、NIST、IBM、Wikipedia等权威或可访问站点
  - 同步更新所有英文 i18n 翻译文件
- 补全：实体关联关系推断与应用（26条高置信度推断）
  - 20个攻击工具补充 directCauseRisks（基于共享规避手段推导）
  - 5个威胁行为者补充 directCauseRisks 和 indirectSupportRisks（基于使用的AT关联的Risk推导）

## 2.2.1

- 补全：实体关联关系推断与应用（26条高置信度推断）
  - 20个攻击工具补充 directCauseRisks（基于共享规避手段推导，匹配度≥3）
  - 5个威胁行为者补充 directCauseRisks 和 indirectSupportRisks（基于使用的AT关联的Risk推导）
  - 所有推断同步更新英文 i18n 翻译文件

## 2.2.0

- 数据质量修复
  - 修复 Risk complexity 值不一致（R0146 "中"→"中级"，R0147 "高"→"高级"）
  - 补充 R0017-002 缺失的 influence 字段
  - 补充 TA0025-001 缺失的 updated 字段，统一 TA0025 日期格式
- Reference 模型精简
  - 移除 Reference 接口中的 `type`、`evidenceLevel`、`language`、`source`、`collectedBy`、`collectedAt`、`verifiedAt`、`note`、`academic` 等过度设计字段，仅保留 `link` + `title`
  - 清理 427 个 JSON 文件中的 3910 个多余字段
  - 移除 `ReferenceBadge.vue` 组件及所有视图中的引用
  - 精简 `ReferenceList.vue`，仅展示链接和标题
  - 精简编辑器中参考资料的增删改表单
  - 移除 `ReferenceType`、`EvidenceLevel`、`AcademicReferenceMeta` 类型定义

## 2.1.0

- 架构改进：couseRisks 关系分类拆分，将单一 `couseRisks` 字段拆分为 `directCauseRisks`（直接造成）和 `indirectSupportRisks`（间接关联）两个字段
  - 类型定义更新：AttackTool 和 ThreatActor 接口中的 `couseRisks: string[]` 替换为 `directCauseRisks: string[]` + `indirectSupportRisks: string[]`
  - 数据迁移：75 个攻击工具文件 + 44 个威胁行为者文件 = 119 个中文数据文件完成迁移
  - 英文翻译同步：76 个英文翻译文件同步更新
  - 关系图谱：连线标签区分"直接造成"和"间接关联"
  - 列表视图：攻击工具和威胁行为者的风险列拆分为"直接造成"和"间接关联"两列
  - 编辑器：穿梭框从 1 个拆分为 2 个（直接/间接）
  - 国际化：新增 `directCauseRisk` 和 `indirectSupportRisk` 标签

## 2.0.8

- 修复：验证并替换references中14个确认404/4xx/5xx错误的损坏链接
  - A0010-002 云手机检测：NIST SP 800-124 Rev.2链接404，更新URL格式（publications/detail -> pubs）
  - A0045 隐私计算：ANSI博客IEEE 3652.1链接403，替换为IEEE官方标准页面
  - A0066 深度伪造检测：Kaggle竞赛链接不稳定，替换为Meta AI官方数据集页面
  - A0069 隐私增强技术：OECD页面反爬403，替换为NIST PETs Testbed页面
  - A0070 供应链安全审计：中国信通院白皮书目录412，替换为安全内参2024年报告
  - A0071 云安全态势管理：Google Cloud CSPM链接404，替换为Security Command Center产品页
  - A0077 交易风险监控：美团技术博客链接404，替换为美团风控系统知乎文章
  - AT0050 发贴机：sendong.com 504超时，替换为网易163相关文章
  - AT0056 AI深度伪造工具：中国信通院首页412，替换为2025年AI安全治理报告PDF
  - AT0057 LLM自动化攻击工具：WEF网页403反爬，替换为官方PDF直链
  - AT0047 做任务工具：6100.net 403，替换为网易163相关文章
  - R0017-002 骗取补贴：河北法院网站449错误，替换为锦州法院同类案例
  - R0031 子账号滥用：新片场406，替换为澎湃新闻权威报道
  - R0050-001 虚拟设备识别绕过：51cto 567错误，替换为CSDN设备指纹实战文章
  - R0059 商业秘密泄露：gov.cn链接404，替换为国家法律法规数据库
  - R0076 等保合规风险：mps.gov.cn首页521，替换为国家信息安全测评中心等保制度页面
  - R0071 生成式AI风险：cac.gov.cn多个政策链接403反爬，替换为gov.cn中国政府网对应法规页面
  - R0077 数据出境合规风险：cac.gov.cn多个政策链接403反爬，替换为gov.cn中国政府网对应法规页面
  - TA0006-003 跑分人员：hoosierhills.com重定向循环，替换为FTC官方Money Mule Scam页面
- 同步更新英文翻译文件(i18n)中所有对应链接

## 2.0.7

- 修复：2个404损坏链接替换为有效权威来源
  - A0020-003 账号封禁：维基百科链接404，替换为NIST SP 800-53 Rev.5
  - R0059 商业秘密泄露：64365.com链接404，替换为《中华人民共和国反不正当竞争法》gov.cn官方链接
- 同步更新英文翻译文件(i18n)中对应链接

## 2.0.6

- 修复：验证并替换references中47个不可访问的损坏链接
  - 修复CISA网站URL结构变更导致的404链接（alerts -> cybersecurity-advisories）
  - 修复FBI IC3网站URL变更（/Media/ -> /PSA/）
  - 修复Google Blog URL变更（android-scam-detection -> new-ai-powered-scam-detection-features）
  - 修复NIST网站URL变更（ai-risk-management-framework -> itl/ai-risk-management-framework等）
  - 修复网信办(cac.gov.cn)多个政策文件URL变更
  - 修复国务院(gov.cn)多个法规文件URL变更
  - 修复GSMA、ENISA、GSMA、ACAMS等机构网站URL变更
  - 修复CNCF、Cisco、PwC、Aqua Security等企业博客URL迁移
  - 修复Chainalysis DNS解析失败
  - 修复银保监会(cbirc.gov.cn)已改组为国家金融监督管理总局(nfra.gov.cn)
  - 修复CSDN已删除博客文章（替换为华为云、美团技术等高质量替代）
  - 修复musicheng.com等电商资讯网站已关闭的页面
  - 修复2个包含未编码中文字符的URL（TA0012、TA0013）
  - 修复INTERPOL域名错误（interpol.org -> interpol.int）
  - 同步更新英文翻译文件(i18n)中对应链接

## 2.0.5

- 新增：为13个仅有百度百科引用的风险(R)实体补充权威参考文献
  - R0006 虚假宣传：补充《中华人民共和国反不正当竞争法》
  - R0009 恶意薅羊毛：补充威胁猎人《2024年上半年互联网黑灰产研究报告》
  - R0012 外挂：补充公安部网安局《净网2025| "外挂"搞破坏?网警依法打击!》
  - R0012-002 游戏外挂：补充公安部《上海浦东捣毁非法售卖游戏账号团伙》
  - R0017-001 刷单：补充国家市场监督管理总局《网络反不正当竞争暂行规定》
  - R0020 内容合规风险：补充国家互联网信息办公室《2024年全国网信系统严厉打击网络违法违规行为》
  - R0022 内容侵权：补充《中华人民共和国著作权法》
  - R0033 僵尸店铺：补充国家市场监督管理总局《2024网络市场监管促发展保安全专项行动》
  - R0049 代登录代下单：补充威胁猎人《2024年上半年互联网黑灰产研究报告》
  - R0056 虚假评价：补充国家市场监督管理总局《江西吉安铲除刷单炒信背后黑色产业链》
  - R0062 非法套现：补充银保监会/央行《信用卡资金管控迎强监管 进一步整治违规套现行为》
  - R0092 现实身份盗用：补充公安部《严厉打击侵犯公民个人信息犯罪》及《中华人民共和国个人信息保护法》
  - R0094 信用卡欺诈：补充 FBI IC3《2024 Internet Crime Report》
  - R0097 借助平台赌博：补充公安部《打击整治跨境赌博违法犯罪专项工作》
- 新增：为9个仅有百度百科引用的威胁行为者(TA)实体补充权威参考文献
  - TA0001 羊毛党：补充威胁猎人《2024年上半年互联网黑灰产研究报告》
  - TA0002 黄牛党：补充公安部《打击整治"黄牛"倒票违法犯罪专项工作》
  - TA0012 恶意软件开发者：补充奇安信《2024人工智能安全报告》
  - TA0013 爬虫团伙：补充威胁猎人《2024年上半年互联网黑灰产研究报告》
  - TA0015 电诈团伙：补充《中华人民共和国反电信网络诈骗法》
  - TA0016 网络赌博团伙：补充公安部/央视《打击治理跨境赌博工作情况》
  - TA0017 黑产组织：补充奇安信威胁情报中心《网络安全威胁2024年中报告》
  - TA0018 恶意黑客：补充 MITRE ATT&CK Threat Groups
  - TA0019 网络水军：补充中央网信办《打击流量造假、网络水军等乱象》

## 2.0.4

- 新增：为11个仅有百度百科引用的攻击工具实体补充权威参考文献
  - AT0001 电话黑卡：补充公安部《中国反诈成功实践》
  - AT0004 猫池：补充人民网《江苏移动重拳"打猫" 今年向公安提供6363条GOIP线索》
  - AT0010 暗网：补充 Europol《Internet Organised Crime Threat Assessment (IOCTA)》
  - AT0012 社工库：补充公安部《严打侵犯公民个人信息犯罪》
  - AT0013 木马病毒：补充 CNCERT《关于"暗云"木马程序有关情况通报》
  - AT0016 云手机：补充 Group-IB《Cloud Phones: The Invisible Threat》
  - AT0033 监控窃听设备：补充公安部《公安机关网安部门重拳打击窃听窃照及偷拍偷窥违法犯罪》
  - AT0041 积分墙工具：补充腾讯安全《2021年移动广告反欺诈白皮书》
  - AT0042 撞库工具：补充 OWASP《Credential Stuffing》
  - AT0049 游戏外挂：补充 arXiv《A Systematic Review of Technical Defenses Against Software-Based Cheating in Online Multiplayer Games》
  - AT0054 系统/应用漏洞利用工具：补充 MITRE ATT&CK Software

## 2.0.3

- 新增：为18个仅有百度百科引用的规避手段实体补充权威参考文献
  - A0001 人机验证技术：补充 NIST SP 800-63B
  - A0007 多因素验证：补充 NIST SP 800-63B
  - A0016 威胁情报：补充 NIST SP 800-150
  - A0021 设备指纹：补充 OWASP Web Security Testing Guide
  - A0024 身份实名认证：补充《中华人民共和国网络安全法》
  - A0025 数字证书：补充 RFC 5280 (IETF)
  - A0029 数据画像：补充 GB/T 35273-2020
  - A0030 业务级蜜罐：补充 MITRE D3FEND
  - A0035 数据脱敏：补充 NIST SP 800-188
  - A0044 依法打击：补充《中华人民共和国网络安全法》
  - A0045 隐私计算：补充 IEEE 3652.1-2020
  - A0049 数字水印：补充 C2PA Specification
  - A0050 数据泄露保护：补充 NIST SP 800-53 Rev.5
  - A0054 合规治理：补充 ISO/IEC 27001:2022
  - A0055 漏洞识别：补充 OWASP Vulnerability Management Guide 和 NIST SP 800-40 Rev.4
  - A0058 灾难恢复：补充 NIST SP 800-34 Rev.1
  - A0059 异常访问行为识别：补充 NIST SP 800-53 Rev.5
  - A0074 行为生物特征识别：补充 ISO/IEC 30107-1:2016
- 修复：批量修复JSON文件中中文引号导致的构建错误
- 同步更新英文翻译文件（i18n）

## 2.0.2

- 修正：A0001 人机验证技术——修正引用错误，将"A023"更正为"A0023"，将"A001-001/002"更正为"A0001-001/002"
- 修正：A0006-002 自动恶意图片识别——修正错别字"准招率"为"准确率"
- 修正：A0006-004 自动恶意视频识别——更新描述，反映多模态大模型已具备视频理解能力的最新进展
- 修正：A0006-008 自动AI生成内容识别——更新描述和局限性，补充深度伪造检测、多模态检测等最新技术进展
- 修正：A0008-004 业务系统优化——修正错别字"提成响应效率"为"提升响应效率"
- 修正：A0018-001 零知识证明——修正错别字"或则"为"或者"
- 修正：A0019 身份安全审计——将误放在A0018.json中的A0019-002邀请码机制和A0019-003好友辅助认证移至A0019.json
- 修正：A0035-003 虚拟手机号——补充700号段隐私保护服务试点信息，修正"影射"为"映射"
- 修正：A0040 证书锁定(SSL Pinning)——修正描述，将"较为初级"更正为"有效的中间人攻击防御机制"，补充Frida/Xposed绕过方式
- 同步更新英文翻译文件（i18n）

## 2.0.1

- 修正：R0074 隐私合规风险——更新参考文献，补充《个人信息保护法》、《个人信息保护合规审计管理办法》和《网络数据安全管理条例》
- 修正：R0075 关保合规风险——更新参考文献，补充《关键信息基础设施安全保护条例》和《关键信息基础设施商用密码使用管理规定》
- 修正：R0076 等保合规风险——补充参考文献，增加公安部等保工作最新文件引用
- 修正：R0077 数据出境合规风险——更新参考文献，将征求意见稿替换为正式施行的《促进和规范数据跨境流动规定》，补充《网络数据安全管理条例》
- 修正：R0078 数据泄露——修正定义中"data breached"为"data breach"
- 修正：R0079 国密合规风险——更新参考文献，补充《密码法》、《商用密码管理条例》和《关键信息基础设施商用密码使用管理规定》
- 修正：R0071 生成式AI风险——更新参考文献，补充《生成式人工智能服务管理暂行办法》和《人工智能生成合成内容标识办法》
- 修正：R0071-002 AIGC合规风险——补充《生成式人工智能服务管理暂行办法》参考文献
- 修正：R0071-003 AI生成劣质内容——补充《人工智能生成合成内容标识办法》参考文献
- 修正：R0083 员工安全意识不足——修正定义与标题不匹配问题，更新描述内容
- 修正：R0083-002 社交欺骗风险——补充AI深度伪造欺骗场景描述
- 修正：R0090 批量扫号——修正influence字段前导空格
- 修正：R0094 信用卡欺诈——补充CNP无卡交易欺诈和ATO账户接管攻击等最新趋势
- 修正：R0095 平台诈骗风险——更新参考文献，替换为《反电信网络诈骗法》和公安部防诈手册
- 修正：R0096 平台网贷欺诈——补充职业背债人模式描述，增加信贷欺诈趋势报告参考文献
- 修正：R0096-001 反催收风险——补充反催收打击案例参考文献
- 修正：R0109 越权/未授权访问——补充水平越权和垂直越权分类定义，完善越权攻击描述
- 修正：R0111-001 员工账号共享——修正influence字段前导空格
- 修正：R0112-006 无线网络风险——补充缺失的influence字段

## 2.0.0

- 新增：31个实体（关系图谱"加法"扩展，6批全量新增）
  - **攻击工具（6个）**：
    - AT0070 欺诈即服务(FaaS)平台：黑灰产将杀猪盘到投资诈骗全流程工具化平台化
    - AT0071 钓鱼即服务(PhaaS)平台：黑市托管钓鱼攻击全流程服务平台
    - AT0072 AiTM中间人攻击工具：专门绕过MFA的应用层中间人攻击工具
    - AT0073 虚假来电伪装工具：AI语音克隆+来电号码篡改组合攻击工具
    - AT0074 AI Agent劫持工具：劫持已部署AI智能体的攻击工具
    - AT0075 ClickFix欺骗工具：伪装验证码修复诱骗执行恶意命令的钓鱼工具
  - **风险（9个）**：
    - R0150 杀猪盘/投资诈骗风险：长期关系型投资诈骗，2024年仅美国损失93亿美元
    - R0151 MFA绕过风险：通过AiTM、MFA疲劳攻击等手段绕过多因素认证
    - R0152 无恶意软件攻击风险：82%攻击不使用恶意软件，利用合法身份和工具实施攻击
    - R0153 影子AI风险：员工未经授权使用AI工具导致数据泄露
    - R0154 ClickFix欺骗风险：伪装系统修复提示诱骗执行恶意代码
    - R0155 跨境数据走私风险：通过隐蔽渠道非法转移数据出境
    - R0156 抗量子加密风险：量子计算可能破解经典加密算法
    - R0157 AI浏览器/手机黑箱风险：AI原生设备AI功能缺乏透明度
    - R0158 算力盗用风险：非法占用他人计算资源用于挖矿或AI训练
  - **规避手段（10个）**：
    - A0083 影子AI检测与治理：检测和管控员工未经授权使用AI工具
    - A0084 实时深度伪造检测：实时通信场景中检测AI深度伪造内容
    - A0086 虚假来电检测：检测AI语音克隆+号码伪造的虚假来电
    - A0088 AI内容溯源：为AI生成内容添加可验证来源标识（C2PA标准）
    - A0089 智能体行为沙箱：在隔离环境中监控和约束AI智能体行为
    - A0090 OAuth权限最小化：对OAuth授权权限进行细粒度控制
    - A0091 量子安全加密迁移：迁移到后量子密码学算法
    - A0092 移动威胁防御(MTD)：移动终端专用威胁检测与防御
    - A0094 AI安全态势管理(AI-SPM)：AI系统安全状态持续监控和治理
  - **威胁行为者（6个）**：
    - TA0039 加密货币诈骗团伙：专门从事加密货币生态诈骗的犯罪团伙
    - TA0040 数据掮客：暗网和地下市场个人数据交易中介
    - TA0041 AI工具滥用者：利用WormGPT/Mythos等犯罪AI工具的行为者
    - TA0042 诈骗园区运营者：规模化运营电信诈骗园区的组织者
    - TA0043 电诈技术员：诈骗园区内技术开发和维护人员
    - TA0044 算力黄牛/算力黑产：非法获取和倒卖GPU算力资源
- 更新：现有实体关系补充
  - R0071(生成式AI风险) +A0083 avoidances
  - R0116(AI深度伪造风险) +A0084、+A0088 avoidances
  - R0143(OAuth/SSO授权滥用) +A0090 avoidances
  - R0148(AI智能体工具滥用) +A0089 avoidances
  - TA0015(电诈团伙) +R0150 couseRisks、+AT0070 useAttackTools
  - TA0018(恶意黑客) +AT0072 useAttackTools

- 修正：TA0008 狗推——修正定义，从"社交媒体推广活动"更正为"东南亚电诈园区底层业务员"（杀猪盘、投资诈骗等一线诈骗执行者）
- 修正：R0132 SIM卡交换攻击——补充中国大陆因实名制和补卡管控发生概率远低于海外的说明
- 更新：AT0064 信息窃取器——补充2025-2026年活跃家族（LummaC2、StealC、Meta），更新传播渠道（伪装免费VPN等），补充最新威胁态势

## 1.9.1

- 新增：补充攻击工具缺失的核心风险关系（共17条）
  - AT0063 钓鱼工具包：添加钓鱼攻击（R0084）
  - AT0067 恶意二维码生成器：添加二维码钓鱼风险（R0131）、钓鱼攻击（R0084）
  - AT0019 脱机挂：添加挂机（R0100）
  - AT0038 租号平台：添加租号借号（R0105）
  - AT0011 手机预制木马后门：添加设备中马（R0080）
  - AT0013 木马病毒：添加设备中马（R0080）
  - AT0052-001 KON-Boot：添加越权/未授权访问（R0109）
  - AT0053 AI黑应用：添加AI深度伪造风险（R0116）
  - AT0053-002 AI视频伪造：添加AI深度伪造风险（R0116）
  - AT0068 密码字典/彩虹表：添加凭证爆破（R0032-003）
  - AT0069 虚假WiFi：添加钓鱼攻击（R0084）
  - AT0042 撞库工具：添加账号盗取（R0032）
  - AT0030 CK登录工具：添加登录凭据盗用（R0035-001）
  - AT0027 发卡平台：添加账号倒卖（R0011）
  - AT0026 跑分平台：添加支付渠道滥用（R0093）
  - AT0045 秒杀工具：添加流程自动化（R0001）
  - AT0034 风险IP：添加黑IP识别绕过（R0099）
  - AT0039 四件套：添加现实身份盗用（R0092）、虚假身份认证（R0098）
  - AT0040 八件套：添加现实身份盗用（R0092）、虚假身份认证（R0098）
- 新增：补充威胁行为者缺失的核心风险关系
  - TA0036 盗版/侵权团伙：添加内容侵权（R0022）
- 新增：补充攻击工具缺失的核心风险关系（续）
  - AT0024 GPS伪造工具：添加地理位置欺诈（R0141）
  - AT0039-002 洗钱数字钱包：添加虚拟货币洗钱风险（R0121）

## 1.9.0

- 修复：风险规避手段审计——删除R0035-001登录凭据盗用中身份认证登录（A0018）
  - 凭据盗用的本质就是盗取了登录凭据，要求登录对凭据盗用毫无防御作用
  - MFA多因素验证（A0007）已覆盖增强认证场景
- 修复：攻击工具规避手段审计——5个avoidances数量10-14的攻击工具复核（AT0035/AT0038/AT0044/AT0046/AT0047），均无需删除
- 修复：风险规避手段审计——7个avoidances数量12-14的风险复核（R0032-001/R0032-002/R0035-001/R0065/R0066/R0111-001/R0112-001），仅R0035-001需删除1条

## 1.8.9

- 修复：攻击工具规避手段审计——删除刷榜工具中流量加密（A0022，对刷榜工具发送伪造请求无防御作用）
- 修复：风险规避手段审计——删除3个风险中无效的规避手段
  - R0082 员工恶意破坏：删除时间限制（A0009，员工利用合法权限在正常时间内破坏，时间限制无效）
  - R0032-004 验证码暴破：删除资源访问限制（A0028，验证码暴破攻击的是身份验证环节而非资源访问）
  - R0049 代登录代下单：删除流量加密（A0022，代登录是主动授权行为，流量加密无法阻止）

## 1.8.8

- 修复：攻击工具规避手段审计——删除爬虫工具中踢出登录态/凭据复用识别两个无效规避手段
  - 踢出登录态：爬虫工具不需要登录态，踢出登录态对数据抓取无防御作用
  - 凭据复用识别：爬虫核心威胁是数据抓取而非凭据盗用，两者关联度低

## 1.8.7

- 修复：攻击工具风险关系审计P5——删除BadUSB/劫持插件/AI视频伪造中的间接关系（共7条）
  - BadUSB：删除员工恶意破坏/无线网络风险（外部物理攻击工具，不造成员工行为风险）
  - 劫持插件：删除营销活动作弊/批量小号/BYOD风险（劫持插件核心是流量劫持和广告替换，非营销注册场景）
  - AI视频伪造：删除恶意引流/内部凭据盗用/恶意广告投放（换脸核心用途是身份冒充和认证绕过）
- 同步：更新英文翻译文件的关系图谱

## 1.8.6

- 修复：威胁行为者关系审计——收窄12个剩余威胁行为者的过宽关系（共 30 条）
  - 卡商(银行卡)：删除洗钱数字钱包开发关系、洗钱风险（属下游水房/跑分）
  - 料农：删除四件套/对公账户开发关系、批量扫号/越权访问风险（属下游行为）
  - 水房：删除电话黑卡使用关系（与洗钱不直接相关）
  - 网络赌博团伙：跑分平台从build移至use（赌博团伙使用而非开发）、删除恶意广告投放风险
  - 菜商：删除四件套/八件套开发关系、批量扫号/越权访问风险
  - 卡商(手机号)：接码平台从build移至use（卡商使用而非开发接码平台）
  - 游戏演员：删除电话黑卡/批量注册器/群控使用关系、仓库号风险（均属打金工作室场景）
  - 地下钱庄：删除风险邮箱使用关系、NFT欺诈/SIM卡交换/黑卡支付风险
  - 卡农：删除洗钱数字钱包/对公账户开发关系（超出卡农能力范围）
  - 打码员：删除协议级自动化/自动化模拟器/恶意抢购风险（打码员不具备这些能力）
  - 听码人员：删除流程自动化/协议级自动化/自动化模拟器/恶意抢购风险（听码人员是人工操作）
  - 盗版/侵权团伙：删除生成式AI风险/虚假评价/刷量刷榜（非典型业务模式）
- 修复：攻击工具风险关系审计——删除6个攻击工具中的间接关系（共 12 条）
  - 木马病毒：删除营销活动作弊/广告屏蔽（木马核心功能是远控和窃取，非营销/屏蔽广告）
  - 脱机挂：删除游戏仓库号（仓库号是打金产业链的管理环节，非脱机挂直接造成）
  - 撞库工具：删除员工违规操作/文件盗窃（撞库是外部攻击，非内部违规/文件窃取）
  - 偷拍偷录工具：删除负面舆情/员工违规/员工破坏/未授权物理访问（偷拍直接造成隐私泄露和窃听，其他为间接后果）
  - 社工库：删除黑卡支付/盗卡盗刷（社工库是查询平台，直接支撑撞库/撞卡而非支付/盗刷）
  - KON-Boot：删除设备中马/员工恶意破坏（KON-Boot核心是绕过密码，中马/破坏是后续操作）
  - 洗钱对公账户：删除平台诈骗/网贷欺诈（对公账户用于资金通道，非实施诈骗）
- 同步：更新全部英文翻译文件的关系图谱

## 1.8.5

- 修复：威胁行为者关系审计——收窄打金工作室/跨境黑产组织/狗推/游戏代练员/料商/数字人运营团伙的过宽关系（共 15 条）
  - 打金工作室：删除营销活动作弊风险、租号平台开发关系、反编译/发包改包/AI黑应用使用关系
  - 跨境黑产组织：删除 NFT 欺诈风险（非典型业务场景）
  - 狗推：删除 AI 黑应用使用关系和生成式 AI 风险（与社交媒体推广无关）
  - 游戏代练员：删除租号平台开发关系和 AI 黑应用使用关系
  - 料商：删除四件套开发关系（四件套是商品非其制造的工具）和木马病毒使用关系（料商是中间商非黑客）
  - 数字人运营团伙：删除爬虫工具使用关系和恶意广告投放风险（非典型场景）
- 修复：攻击工具风险关系审计——删除监控窃听/漏洞利用/恶意外设/发贴机/暗网/电话黑卡中的间接关系（共 14 条）
  - 监控窃听设备：删除负面舆情/员工恶意破坏/BYOD风险/文件盗窃/账号被盗等间接关系
  - 漏洞利用工具：删除供应链风险/无线网络风险等间接关系
  - 恶意外设：删除文件盗窃/员工恶意破坏/账号被盗等间接关系（因果链过长）
  - 发贴机：删除恶意骚扰用户/站内消息骚扰（场景不匹配）
  - 暗网：删除内外勾结/用户隐私泄露（因果方向不匹配）
  - 电话黑卡：删除手机二次号（非因果关系）
- 同步：更新全部英文翻译文件的关系图谱

## 1.8.4

- 修复：深度关系图谱审计——删除手机模拟器/群控/定制浏览器/无头浏览器/验证码识别/游戏外挂中的间接风险关系（共约 37 条）
- 修复：威胁行为者关系审计——收窄羊毛党/黄牛党/号商/恶意软件开发者/爬虫团伙/商业间谍的过宽关系（共约 30 条）
- 修复：恶意软件开发者 buildAttackTools 从 29 项精简为 12 项，仅保留恶意软件类工具
- 同步：更新全部英文翻译文件的关系图谱

## 1.8.3

- 修复：全量关系图谱语义审计（P2 轮次），共删除约 60 条过宽/间接/错误的关系
- 修复：风险规避手段审计——删除 R0088/R0090 中流量加密/证书锁定对自动化攻击的无效关联、R0065 中灾难恢复的过泛关联、R0115 中恶意文档识别的无效关联
- 修复：攻击工具风险关系审计——删除发包改包/自动化脚本/接码平台/LLM 攻击工具/信息窃取器/浏览器插件/风险 IP/手机木马/CK 登录工具中的间接关系
- 修复：威胁行为者关系审计——收窄恶意商家/恶意用户/黑产组织/竞争对手/风险第三方/恶意员工/恶意玩家/安全意识薄弱员工/网络水军/电诈团伙/AI 欺诈团伙的过宽关系
- 修复：AT0006 中 R005-002 拼写错误（应为 R0005-002）
- 同步：更新全部英文翻译文件的关系图谱

## 1.8.2

- 修复：清理攻击工具关系图谱中的不正确关联（AT0003、AT0006、AT0013、AT0014、AT0023、AT0031、AT0035、AT0053）
- 修复：清理风险关系图谱中的不正确关联（R0029、R0065、R0090、R0111）
- 修复：清理威胁行为者关系图谱中的不正确关联（TA0018、TA0021、TA0022）
- 同步：更新英文翻译文件的关系图谱

## 1.8.1

- 新增：风险 R0148（AI智能体工具滥用/过度自主风险）
- 新增：风险 R0149（非人类身份与API密钥滥用风险）
- 新增：规避手段 A0007-005（通行密钥/防钓鱼认证）
- 新增：规避手段 A0087（AI智能体工具治理与MCP安全控制）
- 合并：删除重复的 A0086（供应链安全审计），关系迁移到 A0070
- 修复：A0085 分类改为 AC01，并替换为 NIST/CISA 高质量引用
- 更新：R0147、R0146、R0096、R0117、R0118、R0128、AT0057、AT0064 及相关威胁行为者关系图谱

## 1.8.0

- 新增：风险 R0146（消费贷骗贷-真实补缴）
- 新增：风险 R0147（支付机构监管合规风险）
- 新增：规避手段 A0085（网络分段技术）
- 新增：规避手段 A0086（供应链安全审计）
- 更新：R0065 关系图谱，添加 A0085
- 更新：R0081 关系图谱，添加 A0085 和 A0086
- 更新：TA0015 关系图谱，添加 R0146
- 新增：4 个新实体的英文翻译

## 1.7.0

- 新增：编辑器中的参考资料编辑功能（添加、编辑、删除）
- 新增：统一的参考资料显示组件（ReferenceList.vue、ReferenceBadge.vue）
- 新增：参考资料类型和证据等级徽章显示
- 新增：统一的 TypeScript 类型定义文件（src/BREAK/types.ts）
- 优化：所有详情页使用新的参考资料显示组件
- 安全：增强服务器路径安全，防止路径遍历攻击
- 安全：限制文件写入仅在 BREAK 目录内
- 安全：CORS 限制为本地开发环境
- 升级：vue-i18n 从 v9.14.0 升级到 v11.4.4
- 优化：移除类型断言，使用 v11 原生类型支持
- 修复：移除未使用的导入（Link 组件）

## 1.6.7

- 新增：参考资料验证脚本（`npm run validate:references`）
- 新增：自动化搜索系统（Scrapingdog API 集成）
- 新增：候选引用评分与审核机制
- 修复：补充了 11 个缺少引用或空链接的实体
- 优化：所有实体参考资料覆盖率达到 100%
- 新增：搜索缓存机制，避免重复 API 调用
- 新增：空链接清理脚本

## 1.6.6

- 新增：在首页标题下方显示 BREAK 框架统计数据（包含所有子项）
- 新增：统计数据采用卡片式设计，深蓝色渐变背景，悬停动效
- 新增：统计数据支持点击跳转到对应页面
- 新增：统计数据支持中英文国际化
- 新增：统计数据显示子项数量
- 新增：显示最后更新时间
- 优化：统计数据动态计算，自动包含子风险、子规避手段、子攻击工具、子威胁行为者

## 1.6.5

- 修复导航栏 JDArmy 下拉箭头未与文字垂直居中的问题

## 1.6.4

- 构建优化：拆分英文 i18n 数据包，解决 index chunk 超 500 kB 警告（665 kB → 68 kB）

## 1.6.3

- 全面更新了 references links，修复了之前版本中部分失效的链接问题

## 1.6.2

- 移除 ability-providers 模块及相关调用（数据文件、视图、菜单、i18n）

## 1.6.1

- 关系图谱进一步优化（见上次 commit）

## 1.6.0

- 关系图谱优化：非选中节点改为完全隐藏（原为灰色半透明），隐藏后自动重新排版布局
- 关系图谱修复：切换中英文后连线筛选标签同步更新（重新构建图数据）
- 关系图谱修复：修复规避手段游离节点问题（`addRiskAvoidance` 中连线 `to` 字段 typo）
- 关系图谱新增：节点筛选面板增加"子节点"筛选开关，可单独隐藏/显示所有子节点

## 1.5.0

- 国际化支持：新增英文语言，菜单栏添加语言切换按钮（中文/English）
- 修复 AbilityProvidersView 中硬编码中文文本，改为 i18n key

## 1.4.0

- 界面美化：导航栏改为深海军蓝配色，蓝色高亮激活项
- 首页风险维度卡片化，添加圆角、阴影和标题背景
- 风险场景小标题添加底部分隔线，层次更清晰
- 关系图谱节点尺寸增大，连线文字颜色加深
- 修复 el-checkbox label 废弃警告，改用 value 属性

## 1.3.0

- 将新增的10个风险项（R0136-R0145）补充到BS00（全场景）及BS01-BS14各业务场景中
- 修正业务场景中4处风险分类错误

## 1.2.0

- 新增10个风险项（R0136-R0145）：合成身份欺诈、BNPL欺诈、礼品卡欺诈、友好欺诈、会员/订阅滥用、地理位置欺诈、中间人攻击、OAuth/SSO授权滥用、域名/品牌仿冒、内容农场风险
- 新增9个规避手段（A0074-A0082）
- 新增7个攻击工具（AT0063-AT0069）
- 新增5个威胁行为者（TA0034-TA0038）
- 修复构建时循环依赖问题，优化 manualChunks 分包策略

## 1.1.0

- 新增20个风险项（R0116-R0135）
- 新增10个规避手段（A0064-A0073）
- 新增7个攻击工具（AT0056-AT0062）
- 新增3个威胁行为者（TA0031-TA0033）
- 新增"人工智能"业务场景（BS14）

## 1.0.0

- 使用 AI 对代码进行了重构
- 对风险和规避手段进行了重新梳理和分类

## 0.9.0 及以前

- 历史版本更新（见旧版记录）
