import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('application_role')
@Index('uq_application_role', ['applicationId', 'code'], { unique: true })
export class ApplicationRoleEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  applicationId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  /** 桥接到 Access 域 role.id，运行时鉴权走 user_role → role → permission */
  @Index()
  @Column({ type: 'char', length: 26, nullable: true, name: 'access_role_id' })
  accessRoleId: string | null;
}
