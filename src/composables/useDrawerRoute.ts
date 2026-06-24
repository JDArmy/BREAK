import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";

interface DrawerConfig {
  /** 触发该抽屉的路由名称（可多个，如 riskDetail + businessSceneRiskDetail） */
  routeNames: string[];
  /** 路由参数中对应实体 key 的参数名 */
  routeParam: string;
  /** 验证 key 是否有效（可选，默认返回 true） */
  validateKey?: (key: string) => boolean | Promise<boolean>;
  /** 关闭时跳转的路由名（默认 "home"） */
  closeRouteName?: string;
  /** 自定义关闭回调（覆盖默认行为） */
  onClose?: () => void;
}

/**
 * 抽屉路由感知状态管理。
 * 监听路由变化，自动打开/关闭对应抽屉，无效 key 自动跳转首页。
 */
export function useDrawerRoute(config: DrawerConfig) {
  const router = useRouter();
  const route = useRoute();

  const drawerVisible = ref(false);
  const entityKey = ref("");

  const getSingleRouteParam = (param: unknown): string | undefined =>
    typeof param === "string" ? param : undefined;

  watch(
    () => [route.name, route.params[config.routeParam]] as const,
    async ([routeName, rawKey]) => {
      if (config.routeNames.includes(routeName as string)) {
        const nextKey = getSingleRouteParam(rawKey);
        if (!nextKey) {
          router.replace({ name: "home" });
          return;
        }

        // 如果有异步验证函数，等待验证
        if (config.validateKey) {
          const isValid = await config.validateKey(nextKey);
          // 路由可能在 await 期间变化，需要重新检查
          if (
            route.name !== routeName ||
            route.params[config.routeParam] !== rawKey
          ) {
            return;
          }
          if (!isValid) {
            router.replace({ name: "home" });
            return;
          }
        }

        entityKey.value = nextKey;
        drawerVisible.value = true;
        return;
      }

      drawerVisible.value = false;
    },
    { immediate: true }
  );

  const close = () => {
    drawerVisible.value = false;
    if (config.onClose) {
      config.onClose();
      return;
    }
    const targetRoute = config.closeRouteName ?? "home";
    router.push({ name: targetRoute });
  };

  return {
    drawerVisible,
    entityKey,
    close,
  };
}
