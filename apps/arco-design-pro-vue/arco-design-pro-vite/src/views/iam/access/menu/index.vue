<template>
  <div class="container">
    <Breadcrumb
      :items="['menu.iam', 'menu.iam.access', 'menu.iam.access.menu']"
    />
    <a-card class="general-card" title="菜单管理">
      <a-alert type="info" style="margin-bottom: 16px">
        平台级菜单由权限/资源定义。此处展示资源列表作为菜单占位，完整应用菜单请在「应用管理
        → 应用菜单」中配置。
      </a-alert>
      <a-table
        row-key="id"
        :loading="loading"
        :columns="columns"
        :data="dataList"
        :pagination="false"
      />
    </a-card>
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue';
  import type { TableColumnData } from '@arco-design/web-vue';
  import { getResources, type ResourceItem } from '@/api/iam/resource';

  const loading = ref(false);
  const dataList = ref<ResourceItem[]>([]);

  const columns: TableColumnData[] = [
    { title: '资源名称', dataIndex: 'name' },
    { title: '资源编码', dataIndex: 'code' },
    { title: '类型', dataIndex: 'type' },
  ];

  async function loadList() {
    loading.value = true;
    try {
      dataList.value = await getResources();
    } finally {
      loading.value = false;
    }
  }

  onMounted(loadList);
</script>

<style scoped lang="less">
  .container {
    padding: 0 20px 20px;
  }
</style>
