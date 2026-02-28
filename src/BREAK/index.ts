import basicInfo from "./basic-info";
import risks from "./risks";
import avoidances from "./avoidances";
import avoidanceCategories from "./avoidance-categories";
import businessScenes from "./business-scenes";
import attackTools from "./attack-tools";
import threatActors from "./threat-actors";

const BREAK = {
  ...basicInfo, //BREAK框架基础信息
  ...risks, //业务风险枚举
  ...avoidances, //规避手段枚举
  ...avoidanceCategories, //规避手段分类
  ...businessScenes, //业务场景
  ...attackTools, //攻击工具
  ...threatActors, //威胁行为者
};

export default BREAK;
