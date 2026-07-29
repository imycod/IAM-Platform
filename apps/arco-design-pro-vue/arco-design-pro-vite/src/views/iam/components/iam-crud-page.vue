<template>
  <div class="container">
    <Breadcrumb :items="breadcrumb" />
    <a-card class="general-card" :title="title">
      <a-row v-if="$slots.filters" style="margin-bottom: 16px">
        <a-col :flex="1">
          <slot name="filters" />
        </a-col>
        <a-col :flex="'86px'" style="text-align: right">
          <a-space direction="vertical" :size="12">
            <a-button type="primary" @click="emit('search')">
              <template #icon><icon-search /></template>
              查询
            </a-button>
            <a-button @click="emit('reset')">
              <template #icon><icon-refresh /></template>
              重置
            </a-button>
          </a-space>
        </a-col>
      </a-row>
      <a-row style="margin-bottom: 16px">
        <a-col :span="24">
          <a-space>
            <a-button v-if="showCreate" type="primary" @click="emit('create')">
              <template #icon><icon-plus /></template>
              新增
            </a-button>
            <slot name="extra-actions" />
          </a-space>
        </a-col>
      </a-row>
      <a-table
        row-key="id"
        :loading="loading"
        :columns="columns"
        :data="data"
        :pagination="pagination"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
      >
        <template v-for="(_, name) in $slots" #[name]="slotData">
          <slot
            v-if="!reservedSlots.includes(String(name))"
            :name="name"
            v-bind="slotData"
          />
        </template>
      </a-table>
    </a-card>
    <a-modal
      :visible="visible"
      :title="modalTitle"
      :ok-loading="submitting"
      unmount-on-close
      @update:visible="onVisibleChange"
      @ok="emit('submit')"
      @cancel="emit('cancel')"
    >
      <slot name="form" />
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
  import type { TableColumnData } from '@arco-design/web-vue';

  defineProps<{
    breadcrumb: string[];
    title: string;
    columns: TableColumnData[];
    data: Record<string, unknown>[];
    loading?: boolean;
    submitting?: boolean;
    visible?: boolean;
    modalTitle?: string;
    showCreate?: boolean;
    pagination?: boolean | Record<string, unknown>;
  }>();
  const emit = defineEmits<{
    (e: 'search'): void;
    (e: 'reset'): void;
    (e: 'create'): void;
    (e: 'submit'): void;
    (e: 'cancel'): void;
    (e: 'pageChange', page: number): void;
    (e: 'pageSizeChange', size: number): void;
  }>();
  const reservedSlots = ['filters', 'form', 'extra-actions'];
  function onVisibleChange(value: boolean) {
    if (!value) {
      emit('cancel');
    }
  }
  function onPageChange(page: number) {
    emit('pageChange', page);
  }
  function onPageSizeChange(size: number) {
    emit('pageSizeChange', size);
  }
</script>

<script lang="ts">
  export default {
    name: 'IamCrudPage',
  };
</script>

<style scoped lang="less">
  .container {
    padding: 0 20px 20px;
  }
</style>
