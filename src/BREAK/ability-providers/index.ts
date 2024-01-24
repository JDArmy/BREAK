interface AbilityProvider {
  title: string;
  site: string;
  description: string;
  logo: string;
  update: string;
  abilities: {
    [key: string]: {
      link: string;
    };
  };
}

interface AbilityProviders {
  [key: string]: AbilityProvider;
}

const abilityProviderFiles = import.meta.glob("./AP*.json", { eager: true });
// 合并所有 JSON 对象
const allAbilityProviders = Object.values(abilityProviderFiles).reduce(
  (allAbilityProviders: AbilityProviders, abilityProvider: any) => ({
    ...allAbilityProviders,
    ...abilityProvider.default,
  }),
  {}
);

const abilityProviders = {
  abilityProviders: allAbilityProviders,
};

export default abilityProviders;
export type { AbilityProvider, AbilityProviders };
