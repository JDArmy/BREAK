interface BusinessScene {
  title: string;
  description: string;
  bsKey: string;
  riskDimensions: {
    [key: string]: {
      title: string;
      riskScenes: string[];
    };
  };
  riskScenes: {
    [key: string]: {
      title: string;
      risks: string[];
    };
  };
}

interface BusinessScenes {
  [key: string]: BusinessScene;
}

const businessSceneFiles = import.meta.glob("./BS*.json", { eager: true });
// 合并所有 JSON 对象
const allBusinessScenes = Object.values(businessSceneFiles).reduce(
  (allBusinessScenes: BusinessScenes, businessScene: any) => ({
    ...allBusinessScenes,
    ...businessScene.default,
  }),
  {}
);

export default {
  businessScenes: allBusinessScenes,
};
export type { BusinessScene, BusinessScenes };
