<script setup lang="tsx">
import { reactive, ref, useTemplateRef } from "vue";
import type { FormInstance } from "element-plus";
import ProTable from "@/components/ProTable/index.vue";
import type { ColumnProps } from "@/components/ProTable/interface";
import { addDialog } from "@/components/ReDialog";

defineOptions({
  name: "Welcome"
});

const proTableRef = useTemplateRef<InstanceType<typeof ProTable>>("proTableRef");

const SEARCH_WIDTH = 300
const columns = reactive<ColumnProps[]>([
  { type: "index", label: "#", width: 70 },
  {
    prop: "name",
    label: "名称",
    search: { el: "input", props: { style: { width: SEARCH_WIDTH + "px", span: 12 } }, tooltip: "按名称搜索" }
  },
  {
    prop: "status",
    label: "状态",
    enum: [
      { label: "启用", value: 1, tagType: "success" },
      { label: "禁用", value: 0, tagType: "info" }
    ],
    search: { el: "select", props: { style: { width: SEARCH_WIDTH + "px", span: 12 } } },
    tag: true
  },
  { prop: 'gender', label: '性别', search: { el: 'select', props: { style: { width: SEARCH_WIDTH + "px", span: 24 } }, tooltip: '按性别搜索' } },
  {
    prop: "gender",
    label: "性别",
    enum: [
      { label: "男", value: "male", tagType: "success" },
      { label: "女", value: "female", tagType: "info" }
    ],
    search: { el: "select", props: { style: { width: SEARCH_WIDTH + "px", span: 12 } } },
    tag: true
  },
  { prop: "remark", label: "备注", search: { el: "input", props: { style: { width: SEARCH_WIDTH + "px", span: 12 } }, tooltip: "按备注搜索" } },
  { prop: "createTime", label: "创建时间", search: { el: "date-picker", props: { style: { width: SEARCH_WIDTH + "px", span: 12 } }, tooltip: "按创建时间搜索" } },
]);

const base = reactive([
  { id: "1", name: "示例 A", status: 1, remark: "ProTable 已接入", createTime: "2026-07-22 10:00:00" },
  { id: "2", name: "示例 B", status: 0, remark: "支持搜索 / 分页 / 列设置", createTime: "2026-07-22 10:00:00" },
  { id: "3", name: "示例 C", status: 1, remark: "样式对齐 iam-admin", createTime: "2026-07-22 10:00:00" },
  { id: "4", name: "示例 D", status: 0, remark: "样式对齐 iam-admin", createTime: "2026-07-22 10:00:00" },
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
])

const getUserList = async (params: any) => {
  const filterData = base.filter((item) => {
    const filterNames = !params.name ? true : item.name.includes(params.name);
    const filterStatus = params.status !== undefined ? item.status === params.status : true;
    return filterNames && filterStatus;
  });
  // 分页处理
  const pageData = filterData.slice((params.pageNum - 1) * params.pageSize, params.pageNum * params.pageSize);
  return {
    list: pageData,
    total: filterData.length
  }
};

const handleCreate = () => {
  // 提到 contentRenderer 外，beforeSure 才能通过闭包拿到
  const formRef = ref<FormInstance>();
  const formModel = reactive({
    name: "",
    status: ""
  });
  const formRules = reactive({
    name: [{ required: true, message: "请输入名称", trigger: "blur" }],
    status: [{ required: true, message: "请选择状态", trigger: "change" }]
  });

  addDialog({
    title: "新建",
    contentRenderer: () => (
      <el-form ref={formRef} model={formModel} rules={formRules} label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input
            modelValue={formModel.name}
            onUpdate:modelValue={(value: string) => (formModel.name = value)}
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select
            modelValue={formModel.status}
            onUpdate:modelValue={(value: string) => (formModel.status = value)}
            placeholder="请选择状态"
          >
            <el-option label="启用" value={1} />
            <el-option label="禁用" value={0} />
          </el-select>
        </el-form-item>
      </el-form>
    ),
    beforeSure: done => {
      formRef.value?.validate(valid => {
        if (!valid) return;
        base.push({
          id: base.length + 1 + "",
          name: formModel.name,
          status: formModel.status as unknown as number,
          remark: ""
        });
        console.log("base", base);
        proTableRef.value?.getTableList();
        done(); // 校验通过再关闭
      });
    }
  });
};
</script>

<template>
  <div class="main">
    <ProTable :columns="columns" :search-col="{ xs: 1, sm: 2, md: 2, lg: 3, xl: 5 }" :row-key="'id'" ref="proTableRef"
      :request-api="getUserList" :request-auto="true" title="ProTable 示例">
      <template #tableHeader>
        <el-button type="primary" @click="handleCreate">新建</el-button>
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
