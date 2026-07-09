---
title: 红队使用指南
category: 使用指南
order: 3
slug: redteam-guide
---

# 红队使用指南

本文面向红队 / 渗透测试 / 攻防演练人员，讲清楚如何用 BREAK 从一条风险反向推演出完整的攻击路径：选低门槛入口 → 找实施工具 → 模拟攻击者角色 → 用真实案例复现手法。

> **使用边界声明**：本指南用于授权范围内的安全测试、攻防演练和安全研究。BREAK 知识库记录的是业务风险的抽象与公开案例，不提供具体漏洞利用代码。实际测试须在明确授权下进行。

## 核心思路：Risk → AttackTool → ThreatActor → Case

红队用 BREAK 的链路是正向推演：从一条 Risk 出发，沿 `directCauseRisks` 找到造这个风险的 AttackTool，沿 `useAttackTools` 找到用这些工具的 ThreatActor，再用 Case 复现真实手法。这正好是首页「攻击路径」视角可视化的方向。

## 第一步：用 complexity 选低门槛入口

红队选目标的优先级和防守方相反——防守方先防 basic，红队也先打 basic。在风险列表页按 complexity 筛选 basic 风险，这些是攻击门槛低、无需特殊资源即可利用的点，最适合作为入口。

但要注意 basic ≠ 低危。一条 basic 风险可能门槛低但影响大（如账号注册自动化，门槛极低却支撑了整个黑产链条）。入口选择要结合 Risk 的 `influence`（影响说明）综合判断：门槛低 + 影响面广 = 最佳切入点。

## 第二步：沿 directCauseRisks 找攻击工具

在风险详情页，Risk 与 AttackTool 的关系分两类：

- **directCauseRisks**：该工具**直接造成**的风险——这就是你要找的「打这个风险用什么工具」
- **indirectSupportRisks**：该工具**间接支持**的风险——辅助链条，可作横向扩展

点开任意 AttackTool，看它的 `description`（工具做什么、怎么用）、`directCauseRisks` / `indirectSupportRisks`（能打哪些风险）、`avoidances`（防守方会用什么手段防它）。

**重点关注 `avoidances` 字段**——它告诉你这个工具会被哪些手段检测 / 拦截。红队做路径设计时必须预判防御：如果你选的工具一上线就被某条 Avoidance 命中，这条路径就废了，要么换工具，要么规划绕过。

## 第三步：沿 useAttackTools 模拟攻击者角色

ThreatActor 把工具和人串起来。它的关系字段区分「自建」和「使用」：

- **buildAttackTools**：该角色**自建**的工具——表示该角色有开发能力
- **useAttackTools**：该角色**使用**的工具——表示该角色的常见装备

ThreatActor 描述的是「一类角色」的行为模式（羊毛党、黄牛党、卡商、内鬼、商业间谍、电诈团伙、数据掮客、勒索团伙等），不是具体组织或个人。读 ThreatActor 的 `description` 能理解这类角色的动机、能力和典型作案模式，帮助你「站在攻击者视角」设计攻击剧本。

模拟时问自己三个问题：
1. 我现在扮演哪类 ThreatActor？它的能力边界在哪？
2. 它的 buildAttackTools 里有没有我没想到的自研工具？
3. 它的 directCauseRisks / indirectSupportRisks 圈定了它的作案范围——我的目标风险在不在内？

## 第四步：用关系图谱「攻击路径」视角可视化

首页关系图谱的「攻击路径」视角把上述链路画成图：选一条 Risk 作起点，展开它 directCauseRisks 对应的 AttackTool，再展开 AttackTool 被 ThreatActor useAttackTools 引用的角色。一眼看清「这条风险能被哪些工具打、这些工具被哪些角色用」。

「路径探索」视角更自由——可以从任意实体起步，沿着关系边自由游走，适合发现非显然的攻击链（比如某 ThreatActor 用的某个工具，恰好间接支持你目标业务的一个风险）。

## 第五步：用 Case 复现真实手法

Case 是事实层。在风险 / 工具 / 角色的详情页都有「相关案例」section（倒排索引反查）。挑与你的目标最接近的 Case：

- `criminal_verdict`：看判决书认定的犯罪手法、获利规模、组织分工——最真实的攻击剧本
- `security_incident`：看已公开的安全事件经过
- `academic_research`：看学术研究披露的攻击链和防御评估

复现时重点提取三要素：**时间线**（incidentTime）、**主体**（谁干的）、**事实**（怎么打的）。Case 的 `summary` 是 80–150 字的事实性描述，`references` 给出原始来源可深挖。

## 反向利用：从防守手段的 limitation 找绕过点

这是红队最该读的字段。每条 Avoidance 的 `limitation` 写了它「怎么被绕过 / 什么场景误报」。把目标业务的防御清单列出来，逐条读 limitation，这些就是你的攻击突破口：

- 「验证码可被打码平台识别」→ 验证码这条 AC01 防止手段失效，可绕过
- 「设备指纹可被模拟器伪造」→ 设备指纹失效
- 「行为分析对新账号误报高」→ 用新账号可绕过行为基线

把多条 limitation 叠加，往往能拼出一条完整的绕过链。这比盲目测试高效得多。

## 检查清单

红队规划一次授权测试时：

1. [ ] 确认授权范围，明确可测的业务和不可碰的红线
2. [ ] 在 BREAK 定位目标业务相关 Risk，按 complexity 选 basic 入口
3. [ ] 沿 directCauseRisks 找攻击工具，评估可用性
4. [ ] 查所选工具的 avoidances，预判会被哪些防御拦截
5. [ ] 选定扮演的 ThreatActor，确认其能力覆盖目标风险
6. [ ] 用「攻击路径」/「路径探索」视角可视化完整链路
7. [ ] 查相关 Case（优先 criminal_verdict）复现真实手法
8. [ ] 读目标防御清单的 limitation，定位绕过突破口
9. [ ] 输出攻击剧本：入口 → 工具 → 角色动机 → 预期被防点 → 绕过方案
