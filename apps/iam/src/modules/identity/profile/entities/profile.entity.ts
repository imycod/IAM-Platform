import { BaseEntity } from '@app/database';
import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
}

/**
 * 用户业务资料。与认证解耦：better-auth 升级 user schema 不影响这里。
 */
@Entity('profile')
export class ProfileEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'char', length: 26 })
  userId: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string | null;

  @Column({ type: 'varchar', length: 10, default: Gender.UNKNOWN })
  gender: Gender;

  @Column({ type: 'date', nullable: true })
  birthday: string | null;

  @Column({ type: 'varchar', length: 10, default: 'zh-CN' })
  language: string;

  @Column({ type: 'varchar', length: 64, default: 'Asia/Shanghai' })
  timezone: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bio: string | null;
}
