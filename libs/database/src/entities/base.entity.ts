import {
  BeforeInsert,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ulid } from 'ulid';

/**
 * 所有实体的统一基类：
 * - 主键使用 26 位 ULID（有序、分布式唯一、索引友好，兼容 better-auth 的 string id）
 * - 统一审计字段与软删除
 */
export abstract class BaseEntity {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  // 精度用 6，与 TypeORM 生成的 DEFAULT CURRENT_TIMESTAMP(6) 保持一致，
  // 否则 MySQL 会报 ER_INVALID_DEFAULT。
  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'datetime', precision: 6, nullable: true })
  deletedAt: Date | null;

  @BeforeInsert()
  protected generateId(): void {
    if (!this.id) {
      this.id = ulid();
    }
  }
}
