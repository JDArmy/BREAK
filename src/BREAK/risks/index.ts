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
// 合并所有 JSON 对象
const allRisks = Object.values(riskFiles).reduce(
  (allRisks: AllRisks, risk: any) => ({ ...allRisks, ...risk.default }),
  {}
);
// // console.log(risks);

const risks: Risks = {
  risks: allRisks,
};
export default risks;
export type { Risk, Risks };
