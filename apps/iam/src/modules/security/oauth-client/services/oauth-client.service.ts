import { randomBytes } from 'crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { PaginatedResult } from '@app/common';
import { ApplicationEntity } from '../../../application/application/entities/application.entity';
import { OauthClientEntity } from '../entities/oauth-client.entity';
import { CreateOauthClientDto } from '../dto/create-oauth-client.dto';
import { UpdateOauthClientDto } from '../dto/update-oauth-client.dto';
import { QueryOauthClientDto } from '../dto/query-oauth-client.dto';
import type { OauthClientDetailDto } from '../dto/oauth-client-detail.dto';

export interface OidcClientMetadata {
  client_id: string;
  client_secret?: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  scope: string;
  token_endpoint_auth_method: string;
}

@Injectable()
export class OauthClientService {
  constructor(
    @InjectRepository(OauthClientEntity)
    private readonly repo: Repository<OauthClientEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepo: Repository<ApplicationEntity>,
  ) {}

  async create(dto: CreateOauthClientDto): Promise<OauthClientDetailDto> {
    const application = await this.applicationRepo.findOne({
      where: { id: dto.applicationId },
    });
    if (!application) {
      throw new NotFoundException('应用不存在');
    }

    const existingAppClient = await this.repo.findOne({
      where: { applicationId: dto.applicationId },
    });
    if (existingAppClient) {
      throw new ConflictException('该应用已绑定 OAuth 客户端（1:1）');
    }

    const clientId = dto.clientId?.trim() || `cli_${randomBytes(8).toString('hex')}`;
    const clientIdExists = await this.repo.findOne({ where: { clientId } });
    if (clientIdExists) {
      throw new ConflictException('clientId 已存在');
    }

    const authMethod = dto.tokenEndpointAuthMethod ?? 'none';
    const plainSecret =
      authMethod === 'none' ? 'public-not-used' : randomBytes(24).toString('hex');

    const saved = await this.repo.save(
      this.repo.create({
        applicationId: dto.applicationId,
        clientId,
        clientSecret: plainSecret,
        redirectUris: dto.redirectUris,
        grantTypes: dto.grantTypes ?? ['authorization_code', 'refresh_token'],
        responseTypes: dto.responseTypes ?? ['code'],
        scopes: dto.scopes ?? ['openid', 'profile', 'email'],
        tokenEndpointAuthMethod: authMethod,
        requirePkce: dto.requirePkce ?? authMethod === 'none',
      }),
    );

    return this.toDetail(saved, application, plainSecret);
  }

  async findMany(query: QueryOauthClientDto): Promise<PaginatedResult<OauthClientDetailDto>> {
    const qb = this.repo.createQueryBuilder('c').orderBy('c.createdAt', 'DESC');

    if (query.applicationId) {
      qb.andWhere('c.applicationId = :applicationId', {
        applicationId: query.applicationId,
      });
    }
    if (query.clientId?.trim()) {
      qb.andWhere('c.clientId LIKE :clientId', {
        clientId: `%${query.clientId.trim()}%`,
      });
    }
    if (query.keyword?.trim()) {
      qb.andWhere('c.clientId LIKE :keyword', {
        keyword: `%${query.keyword.trim()}%`,
      });
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    const items = await this.toDetails(rows);
    return { items, total, page, pageSize };
  }

  async findOne(id: string): Promise<OauthClientDetailDto> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('OAuth 客户端不存在');
    }
    const application = await this.applicationRepo.findOne({
      where: { id: row.applicationId },
    });
    return this.toDetail(row, application);
  }

  async findByApplicationId(applicationId: string): Promise<OauthClientDetailDto | null> {
    const row = await this.repo.findOne({ where: { applicationId } });
    if (!row) {
      return null;
    }
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    return this.toDetail(row, application);
  }

  async update(id: string, dto: UpdateOauthClientDto): Promise<OauthClientDetailDto> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('OAuth 客户端不存在');
    }

    if (dto.clientId !== undefined && dto.clientId !== row.clientId) {
      const exists = await this.repo.findOne({ where: { clientId: dto.clientId } });
      if (exists && exists.id !== id) {
        throw new ConflictException('clientId 已存在');
      }
      row.clientId = dto.clientId;
    }
    if (dto.redirectUris !== undefined) row.redirectUris = dto.redirectUris;
    if (dto.grantTypes !== undefined) row.grantTypes = dto.grantTypes;
    if (dto.responseTypes !== undefined) row.responseTypes = dto.responseTypes;
    if (dto.scopes !== undefined) row.scopes = dto.scopes;
    if (dto.tokenEndpointAuthMethod !== undefined) {
      row.tokenEndpointAuthMethod = dto.tokenEndpointAuthMethod;
    }
    if (dto.requirePkce !== undefined) row.requirePkce = dto.requirePkce;

    const saved = await this.repo.save(row);
    const application = await this.applicationRepo.findOne({
      where: { id: saved.applicationId },
    });
    return this.toDetail(saved, application);
  }

  async remove(id: string): Promise<void> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('OAuth 客户端不存在');
    }
    await this.repo.softDelete({ id });
  }

  async rotateSecret(id: string): Promise<OauthClientDetailDto> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('OAuth 客户端不存在');
    }
    if (row.tokenEndpointAuthMethod === 'none') {
      throw new ConflictException('公共客户端（token_endpoint_auth_method=none）无需轮换 secret');
    }

    const plainSecret = randomBytes(24).toString('hex');
    row.clientSecret = plainSecret;
    const saved = await this.repo.save(row);
    const application = await this.applicationRepo.findOne({
      where: { id: saved.applicationId },
    });
    return this.toDetail(saved, application, plainSecret);
  }

  findAll(): Promise<OauthClientEntity[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findByClientId(clientId: string): Promise<OauthClientEntity | null> {
    return this.repo.findOne({ where: { clientId } });
  }

  /** 转换为 node-oidc-provider 的 clients 配置。 */
  async toOidcClients(): Promise<OidcClientMetadata[]> {
    const clients = await this.repo.find();
    return clients.map((c) => {
      const meta: OidcClientMetadata = {
        client_id: c.clientId,
        client_secret: c.clientSecret,
        redirect_uris: c.redirectUris,
        grant_types: c.grantTypes,
        response_types: c.responseTypes as string[],
        scope: c.scopes.join(' '),
        token_endpoint_auth_method: c.tokenEndpointAuthMethod,
      };
      if (c.tokenEndpointAuthMethod === 'none') {
        delete meta.client_secret;
      }
      return meta;
    });
  }

  private maskSecret(secret: string): string {
    if (!secret || secret === 'public-not-used') {
      return '—';
    }
    const tail = secret.slice(-4);
    return `****${tail}`;
  }

  private toApplicationBrief(app: ApplicationEntity | null | undefined) {
    if (!app) {
      return null;
    }
    return {
      id: app.id,
      name: app.name,
      code: app.code,
      status: app.status,
    };
  }

  private toDetail(
    row: OauthClientEntity,
    application: ApplicationEntity | null | undefined,
    plainSecret: string | null = null,
  ): OauthClientDetailDto {
    return {
      id: row.id,
      applicationId: row.applicationId,
      clientId: row.clientId,
      clientSecretMasked: this.maskSecret(row.clientSecret),
      clientSecretPlain: plainSecret,
      redirectUris: row.redirectUris,
      grantTypes: row.grantTypes,
      responseTypes: row.responseTypes,
      scopes: row.scopes,
      tokenEndpointAuthMethod: row.tokenEndpointAuthMethod,
      requirePkce: row.requirePkce,
      application: this.toApplicationBrief(application),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async toDetails(rows: OauthClientEntity[]): Promise<OauthClientDetailDto[]> {
    if (!rows.length) {
      return [];
    }
    const appIds = [...new Set(rows.map((r) => r.applicationId))];
    const apps = await this.applicationRepo.find({ where: { id: In(appIds) } });
    const appMap = new Map(apps.map((a) => [a.id, a]));
    return rows.map((row) => this.toDetail(row, appMap.get(row.applicationId)));
  }
}
