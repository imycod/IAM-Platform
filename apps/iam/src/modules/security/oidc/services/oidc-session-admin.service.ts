import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OidcPayloadEntity } from '../entities/oidc-payload.entity';

const OIDC_LIST_MODELS = ['Session', 'AccessToken'] as const;

export interface OidcSessionRow {
  id: string;
  model: 'Session' | 'AccessToken';
  accountId: string | null;
  clientId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date | null;
  payload: Record<string, unknown>;
}

@Injectable()
export class OidcSessionAdminService {
  constructor(
    @InjectRepository(OidcPayloadEntity)
    private readonly payloadRepo: Repository<OidcPayloadEntity>,
  ) {}

  async listActive(userId?: string): Promise<OidcSessionRow[]> {
    const now = new Date();
    const rows = await this.payloadRepo
      .createQueryBuilder('p')
      .where('p.model IN (:...models)', { models: [...OIDC_LIST_MODELS] })
      .andWhere('(p.expires_at IS NULL OR p.expires_at > :now)', { now })
      .orderBy('p.expires_at', 'DESC')
      .take(500)
      .getMany();

    return rows
      .map((row) => this.toRow(row))
      .filter((row) => !userId || row.accountId === userId);
  }

  async revokeSsoSession(sessionId: string): Promise<void> {
    const row = await this.payloadRepo.findOne({
      where: { id: sessionId, model: 'Session' },
    });
    if (!row) {
      throw new NotFoundException('OIDC SSO 会话不存在');
    }

    await this.payloadRepo.delete({ id: sessionId, model: 'Session' });

    const accountId = this.readAccountId(row.payload);
    if (accountId) {
      await this.revokeAccessTokensForAccount(accountId);
    }
  }

  async revokeAccessToken(tokenId: string): Promise<void> {
    const row = await this.payloadRepo.findOne({
      where: { id: tokenId, model: 'AccessToken' },
    });
    if (!row) {
      throw new NotFoundException('OIDC 访问令牌不存在');
    }

    if (row.grantId) {
      await this.payloadRepo.delete({ grantId: row.grantId });
    } else {
      await this.payloadRepo.delete({ id: tokenId, model: 'AccessToken' });
    }
  }

  private async revokeAccessTokensForAccount(accountId: string): Promise<void> {
    const tokens = await this.payloadRepo.find({
      where: { model: 'AccessToken' },
      take: 500,
    });
    for (const token of tokens) {
      if (this.readAccountId(token.payload) !== accountId) {
        continue;
      }
      if (token.grantId) {
        await this.payloadRepo.delete({ grantId: token.grantId });
      } else {
        await this.payloadRepo.delete({ id: token.id, model: 'AccessToken' });
      }
    }
  }

  private toRow(row: OidcPayloadEntity): OidcSessionRow {
    const model = row.model as 'Session' | 'AccessToken';
    const payload = row.payload ?? {};
    return {
      id: row.id,
      model,
      accountId: this.readAccountId(payload),
      clientId: typeof payload.clientId === 'string' ? payload.clientId : null,
      ipAddress: this.readClientMeta(payload, 'loginIp'),
      userAgent: this.readClientMeta(payload, 'loginUserAgent'),
      expiresAt: row.expiresAt,
      payload,
    };
  }

  private readClientMeta(payload: Record<string, unknown>, key: string): string | null {
    const value = payload[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private readAccountId(payload: Record<string, unknown>): string | null {
    const accountId = payload.accountId;
    return typeof accountId === 'string' ? accountId : null;
  }
}
