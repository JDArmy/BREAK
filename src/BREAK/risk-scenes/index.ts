import riskScenes from "./riskScenes.json";

export default riskScenes;

// interface RiskScene {
//   title: string;
//   risks: string[];
// }

// interface RiskScenes {
//   [key: string]: RiskScene;
// }

// const riskSceneFiles = import.meta.glob("./RS*.json", { eager: true });
// // 合并所有 JSON 对象
// const allRiskScenes = Object.values(riskSceneFiles).reduce(
//   (allRiskScenes: RiskScenes, riskScene: any) => ({
//     ...allRiskScenes,
//     ...riskScene.default,
//   }),
//   {}
// );

// export default {
//   riskScenes: allRiskScenes,
// };
// export type { RiskScene, RiskScenes };

// console.log({
//   riskScenes: allRiskScenes,
// });
