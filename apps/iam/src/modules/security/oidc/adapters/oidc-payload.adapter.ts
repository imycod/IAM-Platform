import type { Repository } from 'typeorm';
import type { Adapter, AdapterPayload } from 'oidc-provider';
import { OidcPayloadEntity } from '../entities/oidc-payload.entity';

/**
 * 返回一个绑定到 TypeORM repository 的 node-oidc-provider Adapter 类。
 * provider 会针对每个 model（Session/AccessToken/...）用 `new Adapter(name)` 实例化，
 * 因此用工厂闭包把 repository 传进去。
 */
export function createOidcAdapter(repo: Repository<OidcPayloadEntity>): new (name: string) => Adapter {
  return class TypeormOidcAdapter implements Adapter {
    constructor(private readonly model: string) {}

    async upsert(id: string, payload: AdapterPayload, expiresIn?: number): Promise<void> {
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
      const row = new OidcPayloadEntity();
      row.id = id;
      row.model = this.model;
      row.payload = payload as Record<string, unknown>;
      row.grantId = (payload.grantId as string) ?? null;
      row.userCode = (payload.userCode as string) ?? null;
      row.uid = (payload.uid as string) ?? null;
      row.expiresAt = expiresAt;
      row.consumedAt = null;
      // 复合主键 (id, model)，save 会按主键 insert-or-update
      await repo.save(row);
    }

    async find(id: string): Promise<AdapterPayload | undefined> {
      return this.toPayload(await repo.findOne({ where: { id, model: this.model } }));
    }

    async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
      return this.toPayload(await repo.findOne({ where: { userCode, model: this.model } }));
    }

    async findByUid(uid: string): Promise<AdapterPayload | undefined> {
      return this.toPayload(await repo.findOne({ where: { uid, model: this.model } }));
    }

    async consume(id: string): Promise<void> {
      await repo.update({ id, model: this.model }, { consumedAt: new Date() });
    }

    async destroy(id: string): Promise<void> {
      await repo.delete({ id, model: this.model });
    }

    async revokeByGrantId(grantId: string): Promise<void> {
      await repo.delete({ grantId, model: this.model });
    }

    private toPayload(row: OidcPayloadEntity | null): AdapterPayload | undefined {
      if (!row) {
        return undefined;
      }
      if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
        return undefined;
      }
      const payload: AdapterPayload = { ...(row.payload as AdapterPayload) };
      if (row.consumedAt) {
        payload.consumed = Math.floor(row.consumedAt.getTime() / 1000);
      }
      return payload;
    }
  };
}
