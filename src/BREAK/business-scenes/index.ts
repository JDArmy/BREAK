import { loadJsonModules } from "../utils";

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
const allBusinessScenes = loadJsonModules<BusinessScenes>(businessSceneFiles);

export default {
  businessScenes: allBusinessScenes,
};
export type { BusinessScene, BusinessScenes };
