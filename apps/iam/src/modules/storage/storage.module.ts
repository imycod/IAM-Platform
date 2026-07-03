import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './file/entities/file.entity';
import { UploadChunkEntity } from './upload/entities/upload-chunk.entity';

/**
 * 统一文件服务。storageType 决定后端（local/s3/oss/minio），业务侧无需关心。
 */
@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(FileEntity) private readonly fileRepo: Repository<FileEntity>,
  ) {}

  saveMetadata(data: Partial<FileEntity>): Promise<FileEntity> {
    return this.fileRepo.save(this.fileRepo.create(data));
  }

  findById(id: string): Promise<FileEntity | null> {
    return this.fileRepo.findOne({ where: { id } });
  }

  /** 按内容 hash 查已存在文件（秒传/去重）。 */
  findByHash(hash: string): Promise<FileEntity | null> {
    return this.fileRepo.findOne({ where: { hash } });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity, UploadChunkEntity])],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
