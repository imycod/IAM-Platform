import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('team')
export class TeamEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  organizationId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;
}
