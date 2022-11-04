import main from "./BREAK/main.json";
import risks from "./BREAK/risks.json";
import riskScenes from "./BREAK/riskScenes.json";
import riskDimensions from "./BREAK/riskDimensions.json";
import avoidances from "./BREAK/avoidances.json";
import abilityProbiders from "./BREAK/abilityProviders.json";
import businessScenes from "./BREAK/businessScenes.json";

let BREAK = {
  ...main,
  ...risks,
  ...riskScenes,
  ...riskDimensions,
  ...avoidances,
  ...abilityProbiders,
  ...businessScenes,
};

export default BREAK;
