import { loadJsonModules } from "../utils";

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
const allAbilityProviders = loadJsonModules<AbilityProviders>(abilityProviderFiles);

const abilityProviders = {
  abilityProviders: allAbilityProviders,
};

export default abilityProviders;
export type { AbilityProvider, AbilityProviders };
