import { loadJsonModules } from "../utils";

interface BusinessDomain {
  title: string;
  description: string;
  bdKey: string;
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

interface BusinessDomains {
  [key: string]: BusinessDomain;
}

const businessDomainFiles = import.meta.glob("./BD*.json", { eager: true });
const allBusinessDomains = loadJsonModules<BusinessDomains>(businessDomainFiles);

export default {
  businessDomains: allBusinessDomains,
};
export type { BusinessDomain, BusinessDomains };
