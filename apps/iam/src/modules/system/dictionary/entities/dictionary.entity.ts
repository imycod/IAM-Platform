import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('dictionary')
export class DictionaryEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;
}
