import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

export enum ApplicationUserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

@Entity('application_user')
@Index('uq_application_user', ['applicationId', 'userId'], { unique: true })
export class ApplicationUserEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  applicationId: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  userId: string;

  @Column({ type: 'varchar', length: 20, default: ApplicationUserStatus.ACTIVE })
  status: string;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  grantedAt: Date | null;

  /** 分配的应用角色；创建/更新时同步写入 user_role（绑定的 access role） */
  @Index()
  @Column({ type: 'char', length: 26, nullable: true, name: 'application_role_id' })
  applicationRoleId: string | null;
}
