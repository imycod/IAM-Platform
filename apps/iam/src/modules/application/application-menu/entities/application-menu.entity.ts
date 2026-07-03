import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('application_menu')
export class ApplicationMenuEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  applicationId: string;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  parentId: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  path: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string | null;

  /** 可见该菜单所需的 permission.code；null 表示登录即可见。 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  permissionCode: string | null;

  @Column({ type: 'int', default: 0 })
  sort: number;
}
