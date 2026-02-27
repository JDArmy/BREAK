import { useRoute } from "vue-router";

export function useAnchorTable(rowKeyField: string) {
  const route = useRoute();

  const getTableHeight = () => {
    const anchor = route.hash.split("#")[1];
    return anchor ? "unset" : window.innerHeight - 100;
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
