<script setup lang="ts">
import { getConfig } from "@/config";
import { posix } from "path-browserify";
import { menuType } from "@/layout/types";
import { ReText } from "@/components/ReText";
import { useNav } from "@/layout/hooks/useNav";
import SidebarLinkItem from "./SidebarLinkItem.vue";
import SidebarExtraIcon from "./SidebarExtraIcon.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { isAllEmpty } from "@pureadmin/utils";
import {
  type PropType,
  type CSSProperties,
  ref,
  toRaw,
  computed,
  useAttrs
} from "vue";

import ArrowUp from "~icons/ep/arrow-up-bold";
import EpArrowDown from "~icons/ep/arrow-down-bold";
import ArrowLeft from "~icons/ep/arrow-left-bold";
import ArrowRight from "~icons/ep/arrow-right-bold";

const attrs = useAttrs();
const { layout, isCollapse, tooltipEffect, getDivStyle } = useNav();

const props = defineProps({
  item: {
    type: Object as PropType<menuType>
  },
  isNest: {
    type: Boolean,
    default: false
  },
  basePath: {
    type: String,
    default: ""
  }
});

const getNoDropdownStyle = computed((): CSSProperties => {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center"
  };
});

const getSubMenuIconStyle = computed((): CSSProperties => {
  const collapsedTopLevel = isCollapse.value && !props.isNest;
  return {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin:
      layout.value === "horizontal"
        ? "0 5px 0 0"
        : collapsedTopLevel
          ? "0 auto"
          : "0 5px 0 0"
  };
});

/** 折叠侧栏顶层：有 icon 只显示 icon；popup 内子菜单仍显示标题 */
const showSubMenuTitle = computed(() => {
  if (layout.value === "horizontal") return true;
  if (!isCollapse.value) return true;

  const hasIcon = !!toRaw(props.item?.meta?.icon);

  if (layout.value === "mix") {
    if (hasIcon) return props.item?.pathList?.length !== 2;
    return props.item?.pathList?.length === 2;
  }

  if (layout.value === "vertical" && !props.isNest && hasIcon) return false;

  return true;
});

const textClass = computed(() => {
  const item = props.item;
  const baseClass = "w-full! text-inherit!";
  const isTopLevel = !props.isNest || isAllEmpty(item.parentId);
  if (
    layout.value !== "horizontal" &&
    isCollapse.value &&
    !toRaw(item.meta.icon) &&
    ((layout.value === "vertical" && isTopLevel) ||
      (layout.value === "mix" && item.pathList?.length === 2))
  ) {
    return `${baseClass} min-w-[54px]! text-center! px-3!`;
  }
  return baseClass;
});

const expandCloseIcon = computed(() => {
  if (!getConfig()?.MenuArrowIconNoTransition) return "";
  return {
    "expand-close-icon": useRenderIcon(EpArrowDown),
    "expand-open-icon": useRenderIcon(ArrowUp),
    "collapse-close-icon": useRenderIcon(ArrowRight),
    "collapse-open-icon": useRenderIcon(ArrowLeft)
  };
});

const onlyOneChild: menuType = ref(null);

function hasOneShowingChild(children: menuType[] = [], parent: menuType) {
  const showingChildren = children.filter((item: any) => {
    onlyOneChild.value = item;
    return true;
  });

  if (showingChildren[0]?.meta?.showParent) {
    return false;
  }

  if (showingChildren.length === 1) {
    return true;
  }

  if (showingChildren.length === 0) {
    onlyOneChild.value = { ...parent, path: "", noShowingChildren: true };
    return true;
  }
  return false;
}

function resolvePath(routePath) {
  const httpReg = /^http(s?):\/\//;
  if (httpReg.test(routePath) || httpReg.test(props.basePath)) {
    return routePath || props.basePath;
  } else {
    return posix.resolve(props.basePath, routePath);
  }
}
</script>

<template>
  <SidebarLinkItem
    v-if="
      hasOneShowingChild(item.children, item) &&
      (!onlyOneChild.children || onlyOneChild.noShowingChildren)
    "
    :to="item"
  >
    <el-menu-item
      :index="resolvePath(onlyOneChild.path)"
      :class="{ 'submenu-title-noDropdown': !isNest }"
      :style="getNoDropdownStyle"
      v-bind="attrs"
    >
      <div
        v-if="toRaw(item.meta.icon)"
        class="sub-menu-icon"
        :style="getSubMenuIconStyle"
      >
        <component
          :is="
            useRenderIcon(
              toRaw(onlyOneChild.meta.icon) ||
                (item.meta && toRaw(item.meta.icon))
            )
          "
        />
      </div>
      <el-text
        v-if="
          isCollapse &&
          ((!toRaw(item?.meta?.icon) &&
            !toRaw(onlyOneChild.meta?.icon) &&
            layout === 'vertical' &&
            !isNest) ||
            (!onlyOneChild.meta?.icon &&
              layout === 'mix' &&
              item?.pathList?.length === 2))
        "
        truncated
        class="w-full! px-3! min-w-[54px]! text-center! text-inherit!"
      >
        {{ onlyOneChild.meta.title }}
      </el-text>

      <template #title>
        <div :style="getDivStyle">
          <ReText
            :tippyProps="{
              offset: [0, -10],
              theme: tooltipEffect
            }"
            class="w-full! text-inherit!"
          >
            {{ onlyOneChild.meta.title }}
          </ReText>
          <SidebarExtraIcon :extraIcon="onlyOneChild.meta.extraIcon" />
        </div>
      </template>
    </el-menu-item>
  </SidebarLinkItem>
  <el-sub-menu
    v-else
    ref="subMenu"
    teleported
    :index="resolvePath(item.path)"
    v-bind="expandCloseIcon"
  >
    <template #title>
      <div
        v-if="toRaw(item.meta.icon)"
        :style="getSubMenuIconStyle"
        class="sub-menu-icon"
      >
        <component :is="useRenderIcon(item.meta && toRaw(item.meta.icon))" />
      </div>
      <ReText
        v-if="showSubMenuTitle"
        :tippyProps="{
          offset: [0, -10],
          theme: tooltipEffect
        }"
        :class="textClass"
      >
        {{ item.meta.title }}
      </ReText>
      <SidebarExtraIcon v-if="!isCollapse" :extraIcon="item.meta.extraIcon" />
    </template>

    <sidebar-item
      v-for="child in item.children"
      :key="child.path"
      :is-nest="true"
      :item="child"
      :base-path="resolvePath(child.path)"
      class="nest-menu"
    />
  </el-sub-menu>
</template>
