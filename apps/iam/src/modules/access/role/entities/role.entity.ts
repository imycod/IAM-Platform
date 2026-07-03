import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

export enum RoleType {
  SYSTEM = 'system',
  CUSTOM = 'custom',
  APPLICATION = 'application',
}

/**
 * 角色。application_id 为 null 表示平台级角色。
 */
@Entity('role')
@Index('uq_role_app_code', ['applicationId', 'code'], { unique: true })
export class RoleEntity extends BaseEntity {
  @Column({ type: 'char', length: 26, nullable: true })
  applicationId: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 20, default: RoleType.CUSTOM })
  type: RoleType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;
}
