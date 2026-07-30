import { Table } from "./interface";
import { reactive, computed, toRefs } from "vue";

/**
 * @description table 页面操作方法封装
 * @param api 获取表格数据 api 方法
 * @param initParam 获取数据初始化参数
 * @param isPageable 是否有分页
 * @param dataCallBack 对后台返回的数据进行处理的方法
 * @param requestError 请求错误回调
 */
export const useTable = (
  api?: (params: any) => Promise<any>,
  initParam: object = {},
  isPageable: boolean = true,
  dataCallBack?: (data: any) => any,
  requestError?: (error: any) => void
) => {
  const state = reactive<Table.StateProps>({
    tableData: [],
    pageable: {
      pageNum: 1,
      pageSize: 10,
      total: 0
    },
    searchParam: {},
    searchInitParam: {},
    totalParam: {}
  });
  const pageParam = computed({
    get: () => {
      return {
        // Geeker 约定
        pageNum: state.pageable.pageNum,
        pageSize: state.pageable.pageSize,
        // iam-admin / Nest 分页常用 page
        page: state.pageable.pageNum
      };
    },
    set: (_newVal: any) => {
      // pagination sync placeholder
    }
  });

  /**
   * 兼容 Geeker `{ data: { list, total } }` 与 iam 解包后的 `{ list, total }` / `{ items, total }`
   */
  const normalizeResponse = (res: any) => {
    if (res == null) return res;
    if (
      res.data !== undefined &&
      (Array.isArray(res.data) ||
        res.data?.list !== undefined ||
        res.data?.items !== undefined ||
        res.data?.total !== undefined)
    ) {
      return res.data;
    }
    return res;
  };

  const getTableList = async () => {
    if (!api) return;
    try {
      Object.assign(state.totalParam, initParam, isPageable ? pageParam.value : {});
      const res = await api({ ...state.searchInitParam, ...state.totalParam });
      let data = normalizeResponse(res);
      dataCallBack && (data = dataCallBack(data));
      const list = data?.list ?? data?.items ?? (Array.isArray(data) ? data : []);
      state.tableData = isPageable ? list : data;
      if (isPageable) {
        state.pageable.total = data?.total ?? list.length ?? 0;
      }
    } catch (error) {
      requestError && requestError(error);
    }
  };

  const updatedTotalParam = () => {
    state.totalParam = {};
    const nowSearchParam: Table.StateProps["searchParam"] = {};
    for (const key in state.searchParam) {
      if (
        state.searchParam[key] ||
        state.searchParam[key] === false ||
        state.searchParam[key] === 0
      ) {
        nowSearchParam[key] = state.searchParam[key];
      }
    }
    Object.assign(state.totalParam, nowSearchParam);
  };

  const search = () => {
    state.pageable.pageNum = 1;
    updatedTotalParam();
    getTableList();
  };

  const reset = () => {
    state.pageable.pageNum = 1;
    state.searchParam = { ...state.searchInitParam };
    updatedTotalParam();
    getTableList();
  };

  const handleSizeChange = (val: number) => {
    state.pageable.pageNum = 1;
    state.pageable.pageSize = val;
    getTableList();
  };

  const handleCurrentChange = (val: number) => {
    state.pageable.pageNum = val;
    getTableList();
  };

  return {
    ...toRefs(state),
    getTableList,
    search,
    reset,
    handleSizeChange,
    handleCurrentChange,
    updatedTotalParam
  };
};
