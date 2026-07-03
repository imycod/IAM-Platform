import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('dictionary_item')
@Index('uq_dictionary_item', ['dictionaryId', 'value'], { unique: true })
export class DictionaryItemEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  dictionaryId: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'varchar', length: 100 })
  value: string;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;
}
