import { useRoute } from "vue-router";

export function useAnchorTable(rowKeyField: string) {
  const route = useRoute();

  const getTableHeight = () => {
    const anchor = route.hash.split("#")[1];
    if (anchor) return "unset";
    // SSR 守卫：与 useBreakpoints 一致，无 window 时返回固定高度
    if (typeof window === "undefined") return "unset";
    return window.innerHeight - 100;
  };

  const tableRowClassName = ({ row }: { row: Record<string, string> }) => {
    const anchor = route.hash.split("#")[1];
    if (anchor && anchor === row[rowKeyField]) {
      return "anchor-row";
    }
    return "";
  };

  return { getTableHeight, tableRowClassName };
}
