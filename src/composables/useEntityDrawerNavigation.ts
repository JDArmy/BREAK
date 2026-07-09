import { useRoute, useRouter } from "vue-router";
import { getEntityEntry, type EntityType } from "@/BREAK/entityRegistry";

const previousDrawerUrls: string[] = [];

export function useEntityDrawerNavigation() {
  const router = useRouter();
  const route = useRoute();

  const syncEntityDrawerUrl = (type: EntityType, key: string) => {
    const entry = getEntityEntry(type);
    const bdKey = typeof route.params.bdKey === "string" ? route.params.bdKey : "";
    const routeName = bdKey && entry.businessDomainDetailRouteName
      ? entry.businessDomainDetailRouteName
      : entry.homeDetailRouteName;
    const params = bdKey && entry.businessDomainDetailRouteName
      ? { bdKey, [entry.paramKey]: key }
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
