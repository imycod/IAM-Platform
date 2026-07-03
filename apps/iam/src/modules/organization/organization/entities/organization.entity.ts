import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

/**
 * 组织 / 租户。parent_id 支持集团-子公司层级。
 */
@Entity('organization')
export class OrganizationEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  parentId: string | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 20, default: 'company' })
  type: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'int', default: 0 })
  sort: number;
}
