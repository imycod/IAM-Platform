<script setup lang="tsx">
import { reactive, ref } from "vue";
import ProTable from "@/components/ProTable/index.vue";
import type { ColumnProps } from "@/components/ProTable/interface";

defineOptions({
  name: "Welcome"
});

const columns = reactive<ColumnProps[]>([
  { type: "index", label: "#", width: 70 },
  {
    prop: "name",
    label: "名称",
    search: { el: "input", tooltip: "按名称搜索" }
  },
  {
    prop: "status",
    label: "状态",
    enum: [
      { label: "启用", value: 1, tagType: "success" },
      { label: "禁用", value: 0, tagType: "info" }
    ],
    search: { el: "select" },
    tag: true
  },
  { prop: "remark", label: "备注" }
]);

const getUserList = async (params: any) => {
  console.log(params);
  const base = [
    { id: "1", name: "示例 A", status: 1, remark: "ProTable 已接入" },
    { id: "2", name: "示例 B", status: 0, remark: "支持搜索 / 分页 / 列设置" },
    { id: "3", name: "示例 C", status: 1, remark: "样式对齐 iam-admin" },
    { id: "4", name: "示例 D", status: 0, remark: "样式对齐 iam-admin" },
    { id: "5", name: "示例 E", status: 1, remark: "样式对齐 iam-admin" },
    { id: "6", name: "示例 F", status: 0, remark: "样式对齐 iam-admin" },
    { id: "7", name: "示例 G", status: 1, remark: "样式对齐 iam-admin" },
    { id: "8", name: "示例 H", status: 0, remark: "样式对齐 iam-admin" },
    { id: "9", name: "示例 I", status: 1, remark: "样式对齐 iam-admin" },
    { id: "10", name: "示例 J", status: 0, remark: "样式对齐 iam-admin" },
    { id: "11", name: "示例 K", status: 1, remark: "样式对齐 iam-admin" },
    { id: "12", name: "示例 L", status: 0, remark: "样式对齐 iam-admin" },
    { id: "13", name: "示例 M", status: 1, remark: "样式对齐 iam-admin" },
    { id: "14", name: "示例 N", status: 0, remark: "样式对齐 iam-admin" },
    { id: "15", name: "示例 O", status: 1, remark: "样式对齐 iam-admin" },
    { id: "16", name: "示例 P", status: 0, remark: "样式对齐 iam-admin" },
    { id: "17", name: "示例 Q", status: 1, remark: "样式对齐 iam-admin" },
    { id: "18", name: "示例 R", status: 0, remark: "样式对齐 iam-admin" },
    { id: "19", name: "示例 S", status: 1, remark: "样式对齐 iam-admin" },
    { id: "20", name: "示例 T", status: 0, remark: "样式对齐 iam-admin" },
  ]

  const filterData = base.filter((item) => {
    const filterNames = !params.name ? true : item.name.includes(params.name);
    const filterStatus = params.status!==undefined ? item.status === params.status : true;
    return filterNames && filterStatus;
  });
  // 分页处理
  const pageData = filterData.slice((params.pageNum - 1) * params.pageSize, params.pageNum * params.pageSize);
  return {
    list: pageData,
    total: filterData.length
  }
};
</script>

<template>
  <div class="main">
    <ProTable :columns="columns" :request-api="getUserList" :request-auto="true" title="ProTable 示例">
      <template #tableHeader>
        <el-button type="primary">新建</el-button>
      </template>
    </ProTable>
  </div>
</template>

<style scoped lang="scss">
.main {
  margin: 16px;
  height: calc(100vh - 140px);
}
</style>
