import { ref, computed, onMounted, onUnmounted } from "vue";

// 与 Element Plus display.css 断点一致
const BP_SM = 480; // >=480px
const BP_MD = 768; // >=768px 手机/平板分界
const BP_LG = 992; // >=992px 平板/桌面分界
const BP_XL = 1200; // >=1200px 桌面

export function useBreakpoints() {
  const width = ref(window.innerWidth);

  const onResize = () => {
    width.value = window.innerWidth;
  };
  onMounted(() => window.addEventListener("resize", onResize));
  onUnmounted(() => window.removeEventListener("resize", onResize));

  const isXs = computed(() => width.value < BP_SM); // <480px 小手机
  const isSm = computed(
    () => width.value >= BP_SM && width.value < BP_MD
  ); // 480-767px 普通手机
  const isMd = computed(
    () => width.value >= BP_MD && width.value < BP_LG
  ); // 768-991px 平板
  const isLg = computed(
    () => width.value >= BP_LG && width.value < BP_XL
  ); // 992-1199px 小桌面
  const isXl = computed(() => width.value >= BP_XL); // >=1200px 桌面

  const isMobile = computed(() => width.value < BP_MD); // <768px
  const isTablet = computed(
    () => width.value >= BP_MD && width.value < BP_LG
  ); // 768-991px
  const isDesktop = computed(() => width.value >= BP_LG); // >=992px

  return {
    width,
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    isMobile,
    isTablet,
    isDesktop,
  };
}
