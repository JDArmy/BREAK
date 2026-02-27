import { ref, onMounted, onUnmounted } from "vue";

export function useDrawerWidth(breakpoint = 600, drawerSize = 600, innerSize = 450) {
  const windowWidth = ref(window.innerWidth);

  const onResize = () => {
    windowWidth.value = window.innerWidth;
  };

  onMounted(() => window.addEventListener("resize", onResize));
  onUnmounted(() => window.removeEventListener("resize", onResize));

  const getDrawerWidth = () =>
    windowWidth.value > breakpoint ? drawerSize : "100%";

  const getInnerDrawerWidth = () =>
    windowWidth.value > breakpoint ? innerSize : "100%";

  return { getDrawerWidth, getInnerDrawerWidth };
}
