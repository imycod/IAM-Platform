/**
 * 批量生成 IAM CRUD 页面（Arco UI）
 * 运行: node scripts/generate-iam-pages.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../src/views/iam');

const pages = [
  {
    dir: 'organization/department',
    title: '部门管理',
    breadcrumb: "['menu.iam', 'menu.iam.organization.department']",
    api: 'organization',
    imports: `createDepartment, deleteDepartment, getDepartments, getOrganizations, updateDepartment, type DepartmentForm, type DepartmentItem, type OrganizationItem`,
    itemType: 'DepartmentItem',
    formType: 'DepartmentForm',
    fetchList: `async () => getDepartments(filterOrgId.value ? { organizationId: filterOrgId.value } : undefined)`,
    create: 'createDepartment',
    update: 'updateDepartment',
    delete: 'deleteDepartment',
    extraSetup: `
  const orgList = ref<OrganizationItem[]>([]);
  const filterOrgId = ref('');
  async function loadOrgs() {
    orgList.value = await getOrganizations();
    if (!filterOrgId.value && orgList.value.length) filterOrgId.value = orgList.value[0].id;
  }
  onMounted(async () => { await loadOrgs(); await loadList(); });
  watch(filterOrgId, loadList);`,
    onMounted: '',
    filters: `<a-form :model="{}" layout="inline"><a-form-item label="组织"><a-select v-model="filterOrgId" :options="orgList.map(o=>({label:o.name,value:o.id}))" style="width:200px" /></a-form-item></a-form>`,
    columns: `[{ title: '部门名称', dataIndex: 'name' },{ title: '部门编码', dataIndex: 'code' },{ title: '组织ID', dataIndex: 'organizationId' },{ title: '排序', dataIndex: 'sort' },{ title: '操作', slotName: 'operations', width: 140 }]`,
    formFields: `<a-form-item label="组织" :rules="[{required:true,message:'请选择组织'}]"><a-select v-model="formModel.organizationId" :options="orgList.map(o=>({label:o.name,value:o.id}))" /></a-form-item><a-form-item label="部门名称" :rules="[{required:true,message:'请输入名称'}]"><a-input v-model="formModel.name" /></a-form-item><a-form-item label="部门编码" :rules="[{required:true,message:'请输入编码'}]"><a-input v-model="formModel.code" /></a-form-item><a-form-item label="排序"><a-input-number v-model="formModel.sort" :min="0" /></a-form-item>`,
    initialForm: `{ organizationId: '', name: '', code: '', parentId: null, sort: 0 }`,
    resetForm: `formModel.organizationId = filterOrgId.value || ''; formModel.name=''; formModel.code=''; formModel.parentId=null; formModel.sort=0;`,
    mapEdit: `formModel.organizationId=record.organizationId; formModel.name=record.name; formModel.code=record.code; formModel.parentId=record.parentId; formModel.sort=record.sort;`,
    submitPayload: `{ organizationId: formModel.organizationId, name: formModel.name.trim(), code: formModel.code.trim(), parentId: formModel.parentId, sort: formModel.sort ?? 0 }`,
    extraImports: `import { watch, onMounted } from 'vue';`,
  },
];

function genPage(p) {
  return `<template>
  <IamCrudPage
    :breadcrumb=${p.breadcrumb}
    title="${p.title}"
    :columns="columns"
    :data="dataList as any"
    :loading="loading"
    :submitting="submitting"
    :visible="dialogVisible"
    :modal-title="dialogTitle"
    @search="loadList"
    @reset="loadList"
    @create="onCreate"
    @submit="onSubmit"
    @cancel="dialogVisible = false"
  >
    <template #filters>${p.filters}</template>
    <template #operations="{ record }">
      <a-space>
        <a-button type="text" size="small" @click="onEdit(record)">编辑</a-button>
        <a-button type="text" size="small" status="danger" @click="confirmDelete(record, record.name)">删除</a-button>
      </a-space>
    </template>
    <template #form>
      <a-form ref="formRef" :model="formModel" layout="vertical">${p.formFields}</a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  ${p.extraImports || "import { onMounted } from 'vue';"}
  import { reactive, ref } from 'vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import IamCrudPage from '../../components/iam-crud-page.vue';
  import { useIamCrud } from '@/hooks/use-iam-crud';
  import { ${p.imports} } from '@/api/iam/${p.api}';

  const formRef = ref<FormInstance>();
  const formModel = reactive<${p.formType}>(${p.initialForm});
  const columns: TableColumnData[] = ${p.columns};

  const { loading, submitting, dataList, dialogVisible, dialogTitle, loadList, openCreate, openEdit, submitForm, confirmDelete } = useIamCrud<${p.itemType}>({
    fetchList: ${p.fetchList},
    createItem: ${p.create},
    updateItem: ${p.update},
    deleteItem: ${p.delete},
  });

  ${p.extraSetup || ''}

  function resetForm() { ${p.resetForm} }
  function onCreate() { resetForm(); openCreate('新增'); }
  function onEdit(record: ${p.itemType}) { resetForm(); openEdit(record, '编辑'); ${p.mapEdit} }
  async function onSubmit() { const err = await formRef.value?.validate(); if (err) return; await submitForm(${p.submitPayload}); }
  ${p.onMounted || 'onMounted(loadList);'}
</script>
`;
}

for (const p of pages) {
  const dir = path.join(root, p.dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.vue'), genPage(p));
  console.log('created', p.dir);
}

console.log('Done');
