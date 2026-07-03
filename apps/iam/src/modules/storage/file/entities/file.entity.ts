import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('file')
export class FileEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  storageType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bucket: string | null;

  @Column({ type: 'varchar', length: 500 })
  objectKey: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  url: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ type: 'bigint', default: 0 })
  size: number;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  hash: string | null;

  @Column({ type: 'char', length: 26, nullable: true })
  uploaderId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  bizType: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;
}
