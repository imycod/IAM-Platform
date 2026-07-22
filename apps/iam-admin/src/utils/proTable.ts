/** ProTable 工具函数（自 Geeker-Admin 抽离） */

export function isArray(val: unknown): val is Array<any> {
  return val !== null && Array.isArray(val);
}

/** 生成 UUID */
export function generateUUID() {
  let uuid = "";
  for (let i = 0; i < 32; i++) {
    const random = (Math.random() * 16) | 0;
    if (i === 8 || i === 12 || i === 16 || i === 20) uuid += "-";
    uuid += (i === 12 ? 4 : i === 16 ? (random & 3) | 8 : random).toString(16);
  }
  return uuid;
}

/**
 * 处理 ProTable 值为数组 || 无数据
 */
export function formatValue(callValue: any) {
  if (isArray(callValue)) return callValue.length ? callValue.join(" / ") : "--";
  return callValue ?? "--";
}

/**
 * 处理 prop 为多级嵌套的情况，返回的数据 (例如: prop: user.name)
 */
export function handleRowAccordingToProp(
  row: { [key: string]: any },
  prop: string
) {
  if (!prop.includes(".")) return row[prop] ?? "--";
  prop.split(".").forEach(item => (row = row[item] ?? "--"));
  return row;
}

/**
 * 处理 prop，当 prop 为多级嵌套时 ==> 返回最后一级 prop
 */
export function handleProp(prop: string) {
  const propArr = prop.split(".");
  if (propArr.length == 1) return prop;
  return propArr[propArr.length - 1];
}

type FieldNames = {
  label?: string;
  value?: string;
  children?: string;
};

/**
 * 根据枚举列表查询需要的数据
 */
export function filterEnum(
  callValue: any,
  enumData?: any,
  fieldNames?: FieldNames,
  type?: "tag"
) {
  const value = fieldNames?.value ?? "value";
  const label = fieldNames?.label ?? "label";
  const children = fieldNames?.children ?? "children";
  let filterData: { [key: string]: any } = {};
  if (Array.isArray(enumData))
    filterData = findItemNested(enumData, callValue, value, children);
  if (type == "tag") {
    return filterData?.tagType ? filterData.tagType : "";
  }
  return filterData ? filterData[label] : "--";
}

/** 递归查找 callValue 对应的 enum 值 */
export function findItemNested(
  enumData: any,
  callValue: any,
  value: string,
  children: string
) {
  return enumData.reduce((accumulator: any, current: any) => {
    if (accumulator) return accumulator;
    if (current[value] === callValue) return current;
    if (current[children])
      return findItemNested(current[children], callValue, value, children);
  }, null);
}
