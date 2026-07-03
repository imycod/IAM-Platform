import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

/**
 * 后台菜单（非前端路由）。
 */
@Entity('menu')
export class MenuEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  parentId: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  path: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  permissionCode: string | null;

  @Column({ type: 'int', default: 0 })
  sort: number;
}
