import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResult } from '@app/common';
import { ApplicationService } from '../../../application/services/application.service';
import { OauthClientService } from '../../../security/oauth-client/services/oauth-client.service';
import { OidcSessionAdminService } from '../../../security/oidc/services/oidc-session-admin.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { UnifiedSessionKind } from '../session-kind.enum';
import { QuerySessionDto } from '../dto/query-session.dto';
import { SessionService } from './session.service';

export interface UnifiedSessionItem {
  id: string;
  kind: UnifiedSessionKind;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  clientId: string | null;
  clientName: string | null;
  applicationCode: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  tokenPreview: string | null;
}

export interface QuerySessionRegistryParams {
  page?: number;
  pageSize?: number;
  userId?: string;
  kind?: UnifiedSessionKind;
}

@Injectable()
export class SessionRegistryService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly oidcSessionAdmin: OidcSessionAdminService,
    private readonly oauthClientService: OauthClientService,
    private readonly applicationService: ApplicationService,
    private readonly userRepository: UserRepository,
  ) {}

  async findMany(query: QuerySessionRegistryParams): Promise<PaginatedResult<UnifiedSessionItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const clientMap = await this.buildClientMap();

    const items: UnifiedSessionItem[] = [];

    if (!query.kind || query.kind === UnifiedSessionKind.PORTAL_PASSWORD) {
      const portalQuery = Object.assign(new QuerySessionDto(), {
        page: 1,
        pageSize: 500,
        userId: query.userId,
      });
      const portal = await this.sessionService.findMany(portalQuery);
      for (const row of portal.items) {
        items.push({
          id: row.id,
          kind: UnifiedSessionKind.PORTAL_PASSWORD,
          userId: row.userId,
          userEmail: row.user?.email ?? null,
          userName: row.user?.name ?? null,
          clientId: null,
          clientName: '账密门户',
          applicationCode: 'iam-admin',
          ipAddress: row.ipAddress,
          userAgent: row.userAgent,
          expiresAt: row.expiresAt?.toISOString() ?? null,
          createdAt: row.createdAt?.toISOString() ?? null,
          tokenPreview: row.token ? `${row.token.slice(0, 12)}...` : null,
        });
      }
    }

    if (
      !query.kind ||
      query.kind === UnifiedSessionKind.OIDC_SSO ||
      query.kind === UnifiedSessionKind.OIDC_ACCESS_TOKEN
    ) {
      const oidcRows = await this.oidcSessionAdmin.listActive(query.userId);
      for (const row of oidcRows) {
        const kind =
          row.model === 'Session'
            ? UnifiedSessionKind.OIDC_SSO
            : UnifiedSessionKind.OIDC_ACCESS_TOKEN;
        if (query.kind && query.kind !== kind) {
          continue;
        }
        const clientMeta = row.clientId ? clientMap.get(row.clientId) : undefined;
        items.push({
          id: row.id,
          kind,
          userId: row.accountId,
          userEmail: null,
          userName: null,
          clientId: row.clientId,
          clientName: clientMeta?.name ?? row.clientId,
          applicationCode: clientMeta?.applicationCode ?? null,
          ipAddress: row.ipAddress,
          userAgent: row.userAgent,
          expiresAt: row.expiresAt?.toISOString() ?? null,
          createdAt: null,
          tokenPreview: `${row.id.slice(0, 12)}...`,
        });
      }
    }

    await this.enrichUserBriefs(items);

    items.sort((a, b) => {
      const ta = a.expiresAt ? Date.parse(a.expiresAt) : 0;
      const tb = b.expiresAt ? Date.parse(b.expiresAt) : 0;
      return tb - ta;
    });

    const total = items.length;
    const skip = (page - 1) * pageSize;
    return {
      items: items.slice(skip, skip + pageSize),
      total,
      page,
      pageSize,
    };
  }

  async revoke(kind: UnifiedSessionKind, id: string): Promise<void> {
    switch (kind) {
      case UnifiedSessionKind.PORTAL_PASSWORD:
        await this.sessionService.revoke(id);
        return;
      case UnifiedSessionKind.OIDC_SSO:
        await this.oidcSessionAdmin.revokeSsoSession(id);
        return;
      case UnifiedSessionKind.OIDC_ACCESS_TOKEN:
        await this.oidcSessionAdmin.revokeAccessToken(id);
        return;
      default:
        throw new NotFoundException('未知会话类型');
    }
  }

  /** 批量踢下线（支持按 userId / kind 筛选，默认当前列表范围内全部） */
  async revokeAll(query: QuerySessionRegistryParams): Promise<{ revoked: number }> {
    const { items } = await this.findMany({
      ...query,
      page: 1,
      pageSize: 5000,
    });

    let revoked = 0;

    for (const item of items) {
      if (item.kind !== UnifiedSessionKind.OIDC_SSO) {
        continue;
      }
      try {
        await this.revoke(item.kind, item.id);
        revoked += 1;
      } catch {
        // 可能已被其它 SSO 会话连带吊销
      }
    }

    for (const item of items) {
      if (item.kind !== UnifiedSessionKind.PORTAL_PASSWORD) {
        continue;
      }
      try {
        await this.revoke(item.kind, item.id);
        revoked += 1;
      } catch {
        // ignore
      }
    }

    for (const item of items) {
      if (item.kind !== UnifiedSessionKind.OIDC_ACCESS_TOKEN) {
        continue;
      }
      try {
        await this.revoke(item.kind, item.id);
        revoked += 1;
      } catch {
        // ignore
      }
    }

    return { revoked };
  }

  private async enrichUserBriefs(items: UnifiedSessionItem[]): Promise<void> {
    const missingIds = [
      ...new Set(
        items
          .filter((item) => item.userId && !item.userEmail && !item.userName)
          .map((item) => item.userId as string),
      ),
    ];
    if (!missingIds.length) {
      return;
    }

    const users = await this.userRepository.findByIds(missingIds);
    const userMap = new Map(users.map((user) => [user.id, user]));

    for (const item of items) {
      if (!item.userId || item.userEmail || item.userName) {
        continue;
      }
      const user = userMap.get(item.userId);
      if (!user) {
        continue;
      }
      item.userEmail = user.email ?? null;
      item.userName = user.name ?? null;
    }
  }

  private async buildClientMap(): Promise<
    Map<string, { name: string; applicationCode: string | null }>
  > {
    const [clients, apps] = await Promise.all([
      this.oauthClientService.findAll(),
      this.applicationService.findAll(),
    ]);
    const appById = new Map(apps.map((app) => [app.id, app]));
    const map = new Map<string, { name: string; applicationCode: string | null }>();
    for (const client of clients) {
      const app = appById.get(client.applicationId);
      map.set(client.clientId, {
        name: app?.name ?? client.clientId,
        applicationCode: app?.code ?? null,
      });
    }
    return map;
  }
}
