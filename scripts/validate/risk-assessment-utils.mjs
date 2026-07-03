/**
 * 风险分级评估计算工具（唯一计算源）
 *
 * sync-risk-assessment.mjs（写回）与 check-risk-assessment.mjs（只读校验）共用本模块，
 * 避免公式双重维护。修改本文件的权重/阈值/短路规则即同步影响两处。
 */

// 5 维度刻度 → 数值权重
const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 3, critical: 4 };

/**
 * 计算风险处置优先级（P0 最高 → P3 最低）
 *
 * 评分公式（主项为概率×损失，三项调整项做方向性修正）：
 *   score = likelihood × businessLoss × 2.0        // 主项：概率 × 损失
 *         + (5 - attackCost)        × 1.0           // 攻击成本反向：低成本 → 高危险
 *         + detectionDifficulty     × 0.8           // 难检测 → 高危险
 *         + (5 - defenseMaturity)   × 0.8           // 防御弱 → 高危险
 *
 * 阈值映射：
 *   score >= 30 → P0（立即处置）
 *   score >= 24 → P1（本季度排期）
 *   score >= 16 → P2（本年度排期）
 *   score < 16  → P3（持续监控）
 *
 * 短路规则（覆盖阈值，避免极端组合误判）：
 *   - likelihood=critical 且 businessLoss=critical → 强制 P0
 *   - likelihood=low 且 businessLoss=low → 强制 P3
 *
 * @param {object} assessment - riskAssessment 对象，需含 5 个维度枚举
 * @returns {string} P0 | P1 | P2 | P3
 */
export function computePriority(assessment) {
  const { likelihood, businessLoss, attackCost, detectionDifficulty, defenseMaturity } = assessment;

  // 短路规则（优先于阈值）
  if (likelihood === "critical" && businessLoss === "critical") {
    return "P0";
  }
  if (likelihood === "low" && businessLoss === "low") {
    return "P3";
  }

  const score =
    SEVERITY_WEIGHT[likelihood] * SEVERITY_WEIGHT[businessLoss] * 2.0 +
    (5 - SEVERITY_WEIGHT[attackCost]) * 1.0 +
    SEVERITY_WEIGHT[detectionDifficulty] * 0.8 +
    (5 - SEVERITY_WEIGHT[defenseMaturity]) * 0.8;

  if (score >= 30) return "P0";
  if (score >= 24) return "P1";
  if (score >= 16) return "P2";
  return "P3";
}

export const PRIORITY_LEVELS = ["P0", "P1", "P2", "P3"];
export const SEVERITY_LEVELS = ["low", "medium", "high", "critical"];
// 英文 i18n 文件中 riskAssessment 只允许维护的可翻译子字段（结构字段不得写入英文）
export const ASSESSMENT_TRANSLATABLE_KEYS = ["observables", "priorityNote"];
