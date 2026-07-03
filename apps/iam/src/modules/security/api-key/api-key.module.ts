import { createHash, randomBytes } from 'crypto';
import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyEntity } from './entities/api-key.entity';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKeyEntity) private readonly repo: Repository<ApiKeyEntity>,
  ) {}

  /** 创建 API Key，返回明文（仅此一次可见）。 */
  async issue(data: Partial<ApiKeyEntity>): Promise<{ apiKey: string; entity: ApiKeyEntity }> {
    const raw = randomBytes(24).toString('hex');
    const prefix = raw.slice(0, 8);
    const keyHash = createHash('sha256').update(raw).digest('hex');
    const entity = await this.repo.save(
      this.repo.create({ ...data, keyPrefix: prefix, keyHash }),
    );
    return { apiKey: `${prefix}.${raw}`, entity };
  }

  async verify(apiKey: string): Promise<ApiKeyEntity | null> {
    const raw = apiKey.includes('.') ? apiKey.split('.')[1] : apiKey;
    const keyHash = createHash('sha256').update(raw).digest('hex');
    const found = await this.repo.findOne({ where: { keyHash, status: 'active' } });
    if (!found || (found.expiresAt && found.expiresAt.getTime() < Date.now())) {
      return null;
    }
    await this.repo.update({ id: found.id }, { lastUsedAt: new Date() });
    return found;
  }

  async revoke(id: string): Promise<void> {
    await this.repo.update({ id }, { status: 'revoked' });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyEntity])],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
