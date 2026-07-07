import { useRoute, useRouter } from "vue-router";
import { getEntityEntry, type EntityType } from "@/BREAK/entityRegistry";

export function useEntityDrawerNavigation() {
  const router = useRouter();
  const route = useRoute();

  const syncEntityDrawerUrl = (type: EntityType, key: string) => {
    const entry = getEntityEntry(type);
    const bsKey = typeof route.params.bsKey === "string" ? route.params.bsKey : "";
    const routeName = bsKey && entry.businessSceneDetailRouteName
      ? entry.businessSceneDetailRouteName
      : entry.homeDetailRouteName;
    const params = bsKey && entry.businessSceneDetailRouteName
      ? { bsKey, [entry.paramKey]: key }
      : { [entry.paramKey]: key };

    const href = router.resolve({ name: routeName, params }).href;
    window.history.pushState(window.history.state, "", href);
  };

  const restorePreviousUrl = () => {
    window.history.back();
  };

  return { syncEntityDrawerUrl, restorePreviousUrl };
}
