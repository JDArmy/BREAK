---
title: 防御者使用指南
category: 使用指南
order: 2
slug: defender-guide
---

# 防御者使用指南

本文面向安全 / 风控 / 反欺诈的防守方，讲清楚如何用 BREAK 从「我的业务可能有什么风险」一路推到「我该上什么防御手段、按什么顺序上、投入产出怎么算」。

## 核心思路：场景 → 风险 → 规避 → 纵深 → 验证

防守方用 BREAK 的典型链路是反推：先定位自己业务所在的风险场景，圈出相关风险，再沿 Risk → Avoidance 找到对应规避手段，按 AC01–AC04 四环节排布纵深防御，最后用真实 Case 验证手段是否对路。

## 第一步：从业务场景定位相关风险

不要一上来就翻 600+ 条风险列表。先想清楚你的业务属于哪一类——金融、电商、交通出行、Web3、IoT、元宇宙等。BREAK 用三层结构组织场景：

- **BusinessScene（业务场景）**：行业 / 业务域容器，如「金融」「电商」
- **RiskDimension（风险维度）**：场景内的上层分组，如「交易维度」「身份维度」「对抗维度」
- **RiskScene（风险场景）**：维度下的风险问题域，如「支付资金金融欺诈」「接口与自动化攻击」

首页按 BusinessScene → RiskDimension → RiskScene 逐层展开，每个 RiskScene 覆盖一组 Risk。定位到你业务的 RiskScene 后，里面的 Risk 列表就是你的「待办清单」。

> 注意：RiskScene 互斥归属到一个维度（不会跨维度复用），但同一条 Risk 可以出现在多个 RiskScene（跨场景归类，正常）。看到某条 Risk 出现在多个场景，说明它在多个业务环节都需关注。

## 第二步：沿 Risk.avoidances 找规避手段

在风险详情页（`/knowledges/risk/list#R0001`），每个风险都维护了 `avoidances` 数组——这是「能缓解该风险的具体手段」。点开任意 Avoidance，看它的 `definition`（一句话定义）、`description`（详细机制）、`limitation`（被绕过方式 / 误报场景）。

**重点看 `limitation`**：它写的是该手段的真实黑产对抗手法和失效场景。一个手段的 limitation 往往比它的 description 更有价值——它告诉你「上了这个手段后，黑产会怎么绕，下一步该补什么」。

## 第三步：按 AC01–AC04 四环节排布纵深

Avoidance 的 `category` 字段把所有手段归到反爬「防止 → 感知 → 识别 → 处置」四环节，这也是纵深防御的标准骨架：

| 环节 | category | 干什么 | 信号特征 |
|------|----------|--------|---------|
| 防止 | AC01 | 提高攻击门槛，让攻击做不成 | 验证码、设备指纹、风控规则 |
| 感知 | AC02 | 采集检测信号，发现异常 | 埋点、流量、行为特征采集 |
| 识别 | AC03 | 用规则 / 模型判定异常 | 阈值、基线、模型匹配 |
| 处置 | AC04 | 对识别结果做动作 | 限频、封禁、人工审核 |

规划防御时，确保每个关键风险在四个环节都有覆盖，别只堆 AC01（防止）而漏掉 AC02/AC03（感知识别）——后者是发现新型攻击的关键。AC02/AC03 的 description 必须实质性描述「采集什么信号」或「用什么逻辑判定」，这一规范本身就是给防守方的检查清单：如果一条手段的 description 只写「检测异常」却没说采什么信号，它对你就没参考价值。

## 第四步：用 complexity 评估投入产出

每条 Risk 有 `complexity`（basic / intermediate / advanced），表示攻击门槛：

- **basic（初级）**：攻击门槛低，无需特殊资源即可实施——优先防，性价比最高
- **intermediate（中级）**：需要一定技术或工具——重点监控
- **advanced（高级）**：需专业知识 / 定制工具 / 多方协同——专项应对

预算有限时，优先把 basic 风险的 AC01 防止手段补齐，再处理 intermediate 的 AC02/AC03 感知识别，advanced 风险通常留专项预算。这比「平均用力」有效得多。

## 第五步：用相关 Case 验证手段是否对路

每条 Risk 建议至少有一个高质量 Case 作为事实支撑。在风险详情页的「相关案例」section（通过倒排索引反查），看真实事件里攻击者实际怎么打、防御方实际怎么破。

Case 的 `category` 标明事件性质：

- `criminal_verdict` 刑事判决——最硬的事实，含法院认定手法
- `administrative_enforcement` 行政执法
- `security_incident` 安全事件
- `vulnerability_advisory` 漏洞通报
- `academic_research` 学术研究
- `news_report` 新闻报道

刑事判决类 Case 对防守方价值最高：它记录了已被法庭认定的事实，可直接拿来跟你的防御现状对照——「这个手法判决书都认定了，我防住了没？」

## 进阶：横向关系帮你找「关联防御」

除了 Risk.avoidances 这条主关系，BREAK 还有横向关系字段（由 `sync:lateral-relations` 脚本自动维护）：

- **Avoidance.relatedAvoidances**：共同覆盖某些风险的手段——可以组合成纵深
- **Avoidance.relatedAttackTools**：共同限制某些工具的手段——同一工具的多道防线

这些横向关系是「自动反推」的，不需要手维护。当你选中一条 Avoidance，看它的 relatedAvoidances，能快速发现「跟它配套的其他手段」，省去逐条翻找的功夫。

## 检查清单

防守方落地一个新业务的风险盘点时，建议按此清单走：

1. [ ] 定位业务所属 BusinessScene，展开到具体 RiskScene
2. [ ] 导出 RiskScene 覆盖的 Risk 列表，按 complexity 排序
3. [ ] 对每条 basic 风险，确认 AC01 防止手段是否就位
4. [ ] 对每条 intermediate/advanced 风险，确认 AC02/AC03 感知识别覆盖
5. [ ] 检查每条所选 Avoidance 的 limitation，预判黑产绕过路径
6. [ ] 用相关 Case（优先 criminal_verdict）核对实际攻击手法
7. [ ] 横向扩展：沿 relatedAvoidances 补齐纵深缺口
