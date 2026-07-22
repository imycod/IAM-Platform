import { ref, computed } from "vue";

/**
 * @description 表格多选数据操作
 * @param rowKey 当表格可以多选时，所指定的 id
 */
export const useSelection = (rowKey: string = "id") => {
  const isSelected = ref<boolean>(false);
  const selectedList = ref<{ [key: string]: any }[]>([]);

  const selectedListIds = computed((): string[] => {
    const ids: string[] = [];
    selectedList.value.forEach(item => ids.push(item[rowKey]));
    return ids;
  });

  const selectionChange = (rowArr: { [key: string]: any }[]) => {
    isSelected.value = !!rowArr.length;
    selectedList.value = rowArr;
  };

  return {
    isSelected,
    selectedList,
    selectedListIds,
    selectionChange
  };
};
