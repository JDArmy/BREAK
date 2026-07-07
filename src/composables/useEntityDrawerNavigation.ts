import { useRoute, useRouter } from "vue-router";
import { getEntityEntry, type EntityType } from "@/BREAK/entityRegistry";

const previousDrawerUrls: string[] = [];

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
    previousDrawerUrls.push(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    window.history.pushState(window.history.state, "", href);
  };

  const restorePreviousUrl = () => {
    const previousUrl = previousDrawerUrls.pop();
    if (!previousUrl) return;
    window.history.replaceState(window.history.state, "", previousUrl);
  };

  return { syncEntityDrawerUrl, restorePreviousUrl };
}
