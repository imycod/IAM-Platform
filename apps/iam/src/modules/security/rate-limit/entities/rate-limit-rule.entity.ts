import { BaseEntity } from '@app/database';
import { Column, Entity } from 'typeorm';

/**
 * 限流规则（运行态计数在 Redis）。
 */
@Entity('rate_limit_rule')
export class RateLimitRuleEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  targetType: string;

  @Column({ type: 'varchar', length: 200 })
  targetPattern: string;

  @Column({ type: 'int' })
  windowSeconds: number;

  @Column({ type: 'int' })
  maxRequests: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;
}
