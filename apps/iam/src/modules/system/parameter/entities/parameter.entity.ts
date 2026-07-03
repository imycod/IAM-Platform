import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('parameter')
export class ParameterEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  paramKey: string;

  @Column({ type: 'text', nullable: true })
  paramValue: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;
}
