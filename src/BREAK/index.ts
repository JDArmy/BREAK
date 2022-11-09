import main from "./main.json";
import risks from "./risks.json";
import riskScenes from "./riskScenes.json";
import riskDimensions from "./riskDimensions.json";
import avoidances from "./avoidances.json";
import abilityProbiders from "./abilityProviders.json";
import businessScenes from "./businessScenes.json";
import attackTools from "./attackTools.json";

let BREAK = {
  ...main, //BREAK框架基础信息
  ...risks, //业务风险枚举
  ...riskScenes, //风险场景
  ...riskDimensions, //风险维度
  ...avoidances, //规避手段枚举
  ...abilityProbiders, //能力提供者
  ...businessScenes, //业务场景
  ...attackTools, //攻击工具
};

export default BREAK;
