<template>
  <div :style="style">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  watch,
  useSlots,
  computed,
  provide,
  onBeforeMount,
  onMounted,
  onUnmounted,
  onDeactivated,
  onActivated,
  VNodeArrayChildren,
  VNode
} from "vue";
import type { BreakPoint } from "./interface/index";

defineOptions({ name: "Grid" });

type Props = {
  cols?: number | Record<BreakPoint, number>;
  collapsed?: boolean;
  collapsedRows?: number;
  gap?: [number, number] | number;
};

const props = withDefaults(defineProps<Props>(), {
  cols: () => ({ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }),
  collapsed: false,
  collapsedRows: 1,
  gap: 0
});

onBeforeMount(() => props.collapsed && findIndex());
onMounted(() => {
  resize({ target: { innerWidth: window.innerWidth } } as unknown as UIEvent);
  window.addEventListener("resize", resize);
});
onActivated(() => {
  resize({ target: { innerWidth: window.innerWidth } } as unknown as UIEvent);
  window.addEventListener("resize", resize);
});
onUnmounted(() => {
  window.removeEventListener("resize", resize);
});
onDeactivated(() => {
  window.removeEventListener("resize", resize);
});

const resize = (e: UIEvent) => {
  const width = (e.target as Window).innerWidth;
  switch (!!width) {
    case width < 768:
      breakPoint.value = "xs";
      break;
    case width >= 768 && width < 992:
      breakPoint.value = "sm";
      break;
    case width >= 992 && width < 1200:
      breakPoint.value = "md";
      break;
    case width >= 1200 && width < 1920:
      breakPoint.value = "lg";
      break;
    case width >= 1920:
      breakPoint.value = "xl";
      break;
  }
};

provide("gap", Array.isArray(props.gap) ? props.gap[0] : props.gap);

const breakPoint = ref<BreakPoint>("xl");
provide("breakPoint", breakPoint);

const hiddenIndex = ref(-1);
provide("shouldHiddenIndex", hiddenIndex);

const gridCols = computed<number>(() => {
  if (typeof props.cols === "object") return props.cols[breakPoint.value] ?? 4;
  return props.cols;
});
provide("cols", gridCols);

/** 是否为带 suffix 的操作按钮列（不依赖组件 name，script setup 下 name 可能拿不到） */
const isSuffixItem = (slot: VNode) => {
  const suffix = slot.props?.suffix;
  return suffix !== undefined && suffix !== false;
};

// useSlots 只能在 setup 同步调用；findIndex 里再执行 default() 取最新 VNode
const slots = useSlots();

const findIndex = () => {
  const slotNodes = slots.default?.() ?? [];
  const fields: VNodeArrayChildren = [];
  let suffix: VNode | null = null;

  slotNodes.forEach((slot: any) => {
    if (isSuffixItem(slot)) suffix = slot;
    // v-for 会包一层 Fragment
    if (typeof slot.type === "symbol" && Array.isArray(slot.children)) {
      fields.push(
        ...slot.children.filter(
          (child: any) => child && typeof child === "object" && !isSuffixItem(child)
        )
      );
    } else if (slot && typeof slot === "object" && !isSuffixItem(slot)) {
      fields.push(slot);
    }
  });

  // 折叠时给搜索/重置/展开预留列，否则表单项会占满整行把按钮挤下去
  let suffixCols = 0;
  if (suffix) {
    suffixCols =
      ((suffix as VNode).props![breakPoint.value]?.span ??
        (suffix as VNode).props?.span ??
        1) +
      ((suffix as VNode).props![breakPoint.value]?.offset ??
        (suffix as VNode).props?.offset ??
        0);
  }
  try {
    let find = false;
    fields.reduce((prev = 0, current, index) => {
      prev +=
        ((current as VNode)!.props![breakPoint.value]?.span ??
          (current as VNode)!.props?.span ??
          1) +
        ((current as VNode)!.props![breakPoint.value]?.offset ??
          (current as VNode)!.props?.offset ??
          0);
      if (Number(prev) > props.collapsedRows * gridCols.value - suffixCols) {
        hiddenIndex.value = index;
        find = true;
        throw "find it";
      }
      return prev;
    }, 0);
    if (!find) hiddenIndex.value = -1;
  } catch {
    // fold index found
  }
};

watch(
  () => breakPoint.value,
  () => {
    if (props.collapsed) findIndex();
  }
);

watch(
  () => props.collapsed,
  value => {
    if (value) return findIndex();
    hiddenIndex.value = -1;
  }
);

const gridGap = computed(() => {
  if (typeof props.gap === "number") return `${props.gap}px`;
  if (Array.isArray(props.gap)) return `${props.gap[1]}px ${props.gap[0]}px`;
  return "unset";
});

const style = computed(() => {
  return {
    display: "grid",
    gridGap: gridGap.value,
    gridTemplateColumns: `repeat(${gridCols.value}, minmax(0, 1fr))`
  };
});

defineExpose({ breakPoint });
</script>
