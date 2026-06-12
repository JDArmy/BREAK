import { useBreakpoints } from "./useBreakpoints";

export function useDrawerWidth() {
  const { isMobile, isTablet } = useBreakpoints();

  const getDrawerWidth = () => {
    if (isMobile.value) return "100%";
    if (isTablet.value) return "70vw";
    return "600px";
  };

  const getInnerDrawerWidth = () => {
    if (isMobile.value) return "100%";
    if (isTablet.value) return "55vw";
    return "450px";
  };

  return { getDrawerWidth, getInnerDrawerWidth };
}
