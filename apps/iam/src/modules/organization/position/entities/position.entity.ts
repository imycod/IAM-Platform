import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('position')
export class PositionEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  organizationId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'int', default: 0 })
  level: number;
}
