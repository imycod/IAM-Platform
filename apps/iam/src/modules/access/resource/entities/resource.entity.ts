import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

/**
 * ABAC 资源定义。attributes 描述可用于策略匹配的属性。
 */
@Entity('resource')
export class ResourceEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  type: string | null;

  @Column({ type: 'json', nullable: true })
  attributes: Record<string, unknown> | null;
}
