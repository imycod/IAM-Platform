import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('role_menu')
@Index('uq_role_menu', ['roleId', 'menuId'], { unique: true })
export class RoleMenuEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  roleId: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  menuId: string;
}
