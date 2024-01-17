interface Avoidance {
  title: string;
  category: string;
  summary: string;
  description: string;
  limitation: string;
  references: {
    title: string;
    description: string;
    link: string;
  }[];
}

interface Avoidances {
  [key: string]: Avoidance;
}

const avoidanceFiles = import.meta.glob("./A*.json", { eager: true });
// 合并所有 JSON 对象
const allAvoidances = Object.values(avoidanceFiles).reduce(
  (allAvoidances: Avoidances, avoidance: any) => ({
    ...allAvoidances,
    ...avoidance.default,
  }),
  {}
);

export default {
  avoidances: allAvoidances,
};
export type { Avoidance, Avoidances };
