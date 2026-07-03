import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

export enum PolicyEffect {
  ALLOW = 'allow',
  DENY = 'deny',
}

/**
 * CASL 策略。conditions 为 CASL 条件，如 { ownerId: "${user.id}" }。
 */
@Entity('policy')
export class PolicyEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 10, default: PolicyEffect.ALLOW })
  effect: PolicyEffect;

  @Column({ type: 'varchar', length: 100 })
  subject: string;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'json', nullable: true })
  conditions: Record<string, unknown> | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  roleId: string | null;
}
