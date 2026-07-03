import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('upload_chunk')
@Index('uq_upload_chunk', ['uploadId', 'chunkIndex'], { unique: true })
export class UploadChunkEntity extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 100 })
  uploadId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  fileHash: string;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'int' })
  chunkSize: number;

  @Column({ type: 'int' })
  totalChunks: number;

  @Column({ type: 'varchar', length: 20, default: 'uploaded' })
  status: string;
}
