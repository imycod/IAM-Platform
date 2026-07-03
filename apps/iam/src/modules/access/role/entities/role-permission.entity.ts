import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('role_permission')
@Index('uq_role_permission', ['roleId', 'permissionId'], { unique: true })
export class RolePermissionEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  roleId: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  permissionId: string;
}
