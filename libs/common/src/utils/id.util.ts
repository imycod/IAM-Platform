import { ulid } from 'ulid';

/** 生成 26 位 ULID（有序、分布式唯一）。 */
export function generateId(): string {
  return ulid();
}
