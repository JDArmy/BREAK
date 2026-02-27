import { loadJsonModules } from "../utils";

interface Reference {
  title: string;
  link: string;
}

interface Risk {
  title: string;
  definition: string;
  description: string;
  complexity: string;
  influence: string;
  avoidances: string[];
  references: Reference[];
}
interface AllRisks {
  [key: string]: Risk;
}

interface Risks {
  risks: {
    [key: string]: Risk;
  };
}

const riskFiles = import.meta.glob("./R*.json", { eager: true });
const allRisks = loadJsonModules<AllRisks>(riskFiles);

const risks: Risks = {
  risks: allRisks,
};
export default risks;
export type { Risk, Risks };
