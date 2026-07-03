import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('user_role')
@Index('uq_user_role', ['userId', 'roleId', 'applicationId'], { unique: true })
export class UserRoleEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  userId: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  roleId: string;

  @Column({ type: 'char', length: 26, nullable: true })
  applicationId: string | null;
}
