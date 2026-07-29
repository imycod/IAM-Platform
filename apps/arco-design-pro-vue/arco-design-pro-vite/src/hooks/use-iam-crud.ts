import { ref } from 'vue';
import { Message, Modal } from '@arco-design/web-vue';
import { isAuthSessionTerminatedError } from '@/utils/auth-session-terminated';

function extractErrorMessage(error: unknown): string {
  const err = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return err?.response?.data?.message ?? err?.message ?? '操作失败';
}

type CrudOptions<T extends object> = {
  fetchList: () => Promise<T[]>;
  createItem?: (data: Record<string, unknown>) => Promise<unknown>;
  updateItem?: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  deleteItem?: (id: string) => Promise<unknown>;
  getRowId?: (row: T) => string;
};

export function useIamCrud<T extends object>(options: CrudOptions<T>) {
  const loading = ref(false);
  const submitting = ref(false);
  const dataList = ref<T[]>([]);
  const dialogVisible = ref(false);
  const dialogTitle = ref('新增');
  const editingId = ref<string | null>(null);

  const getRowId = options.getRowId ?? ((row: T) => String(row.id ?? ''));

  async function loadList() {
    loading.value = true;
    try {
      dataList.value = await options.fetchList();
    } catch (error) {
      if (!isAuthSessionTerminatedError(error)) {
        Message.error(extractErrorMessage(error));
      }
    } finally {
      loading.value = false;
    }
  }

  function openCreate(title = '新增') {
    editingId.value = null;
    dialogTitle.value = title;
    dialogVisible.value = true;
  }

  function openEdit(row: T, title = '编辑') {
    editingId.value = getRowId(row);
    dialogTitle.value = title;
    dialogVisible.value = true;
    return editingId.value;
  }

  async function submitForm(
    data: Record<string, unknown>,
    onSuccess?: () => void
  ) {
    submitting.value = true;
    try {
      if (editingId.value && options.updateItem) {
        await options.updateItem(editingId.value, data);
        Message.success('更新成功');
      } else if (options.createItem) {
        await options.createItem(data);
        Message.success('创建成功');
      }
      dialogVisible.value = false;
      await loadList();
      onSuccess?.();
    } catch (error) {
      if (!isAuthSessionTerminatedError(error)) {
        Message.error(extractErrorMessage(error));
      }
    } finally {
      submitting.value = false;
    }
  }

  function confirmDelete(row: T, label?: string) {
    Modal.confirm({
      title: '确认删除',
      content: label ? `确定删除「${label}」吗？` : '确定删除该记录吗？',
      onOk: async () => {
        if (!options.deleteItem) return;
        try {
          await options.deleteItem(getRowId(row));
          Message.success('删除成功');
          await loadList();
        } catch (error) {
          if (!isAuthSessionTerminatedError(error)) {
            Message.error(extractErrorMessage(error));
          }
        }
      },
    });
  }

  return {
    loading,
    submitting,
    dataList,
    dialogVisible,
    dialogTitle,
    editingId,
    loadList,
    openCreate,
    openEdit,
    submitForm,
    confirmDelete,
  };
}

type PaginatedCrudOptions<T extends object> = {
  fetchList: (params: {
    page: number;
    pageSize: number;
  }) => Promise<{ items: T[]; total: number }>;
  createItem?: (data: Record<string, unknown>) => Promise<unknown>;
  updateItem?: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  deleteItem?: (id: string) => Promise<unknown>;
  getRowId?: (row: T) => string;
  pageSize?: number;
};

export function useIamCrudPaginated<T extends object>(
  options: PaginatedCrudOptions<T>
) {
  const page = ref(1);
  const pageSize = ref(options.pageSize ?? 20);
  const total = ref(0);

  const base = useIamCrud<T>({
    ...options,
    fetchList: async () => {
      const res = await options.fetchList({
        page: page.value,
        pageSize: pageSize.value,
      });
      total.value = res.total;
      return res.items;
    },
  });

  async function onPageChange(current: number) {
    page.value = current;
    await base.loadList();
  }

  async function onPageSizeChange(size: number) {
    pageSize.value = size;
    page.value = 1;
    await base.loadList();
  }

  return {
    ...base,
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
  };
}
