import main from "./main.json";
import risks from "./risks";
import riskScenes from "./riskScenes.json";
import riskDimensions from "./riskDimensions.json";
import avoidances from "./avoidances";
import abilityProviders from "./ability-providers";
import businessScenes from "./business-scenes";
import attackTools from "./attack-tools";

const BREAK = {
  ...main, //BREAK框架基础信息
  ...risks, //业务风险枚举
  ...riskScenes, //风险场景
  ...riskDimensions, //风险维度
  ...avoidances, //规避手段枚举
  ...abilityProviders, //能力提供者
  ...businessScenes, //业务场景
  ...attackTools, //攻击工具
};

export default BREAK;
